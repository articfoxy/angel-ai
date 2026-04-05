import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";

// Simple embedding cache — keyed by truncated text hash
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

function getEmbeddingCacheKey(text: string): string {
  // Use first 200 chars as cache key (covers most inference windows)
  const truncated = text.slice(0, 200);
  let hash = 0;
  for (let i = 0; i < truncated.length; i++) {
    const char = truncated.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Generate an embedding using OpenAI's text-embedding-3-small (1536 dims).
 * Returns null if OPENAI_API_KEY is not set. Uses an in-memory LRU cache.
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = config.ai.openaiApiKey;
  if (!apiKey) return null;

  // Check cache
  const cacheKey = getEmbeddingCacheKey(text);
  const cached = embeddingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.statusText);
      return null;
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    const embedding = data.data[0].embedding;

    // Store in cache
    if (embeddingCache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry
      const oldestKey = embeddingCache.keys().next().value;
      if (oldestKey !== undefined) embeddingCache.delete(oldestKey);
    }
    embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });

    return embedding;
  } catch (err) {
    console.error("Failed to generate embedding:", err);
    return null;
  }
}

/**
 * Create a memory with an optional vector embedding.
 */
export async function createMemoryWithEmbedding(
  userId: string,
  type: string,
  title: string,
  content: string,
  metadata?: Record<string, unknown>,
  sessionId?: string,
) {
  const embedding = await generateEmbedding(`${title}: ${content}`);

  if (embedding) {
    const vectorStr = `[${embedding.join(",")}]`;
    const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO "Memory" ("id", "userId", "type", "title", "content", "embedding", "metadata", "sessionId", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}, ${type}, ${title}, ${content}, ${vectorStr}::vector, ${JSON.stringify(metadata ?? {})}::jsonb, ${sessionId ?? null}, NOW(), NOW())
      RETURNING *
    `;
    return result[0];
  }

  return prisma.memory.create({
    data: {
      userId,
      type,
      title,
      content,
      metadata: (metadata ?? {}) as Record<string, string | number | boolean | null>,
      sessionId,
    },
  });
}

/**
 * Semantic search using pgvector <=> operator.
 * Falls back to text search when embeddings are unavailable.
 */
export async function searchMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<Array<Record<string, unknown>>> {
  const embedding = await generateEmbedding(query);

  if (embedding) {
    const vectorStr = `[${embedding.join(",")}]`;
    return prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT *, embedding <=> ${vectorStr}::vector AS distance
      FROM "Memory"
      WHERE "userId" = ${userId}
      ORDER BY distance
      LIMIT ${limit}
    `;
  }

  // Fallback: text-based search
  const memories = await prisma.memory.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return memories as unknown as Array<Record<string, unknown>>;
}

/**
 * Get relevant memories for a transcript chunk by extracting key entities
 * and performing vector searches.
 */
export async function getRelevantMemories(
  userId: string,
  transcriptChunk: string,
  limit = 5,
): Promise<Array<Record<string, unknown>>> {
  return searchMemories(userId, transcriptChunk, limit);
}

/**
 * Extract and store memories from a completed session transcript.
 * Uses GPT-4o-mini to extract people, companies, commitments, etc.
 */
export async function extractAndStoreMemories(
  userId: string,
  sessionId: string,
  transcript: string,
): Promise<Array<Record<string, unknown>>> {
  const apiKey = config.ai.openaiApiKey;

  if (!apiKey) {
    // Mock extraction: create a simple summary memory
    const mem = await prisma.memory.create({
      data: {
        userId,
        type: "concept",
        title: "Session Notes",
        content: transcript.slice(0, 500),
        metadata: { source: "auto_extract", mock: true },
        sessionId,
      },
    });
    return [mem as unknown as Record<string, unknown>];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract notable entities from the conversation transcript. Return a JSON object with an "entities" array. Each entity should have:
- type: one of "person", "company", "project", "concept", "commitment"
- title: name or short label
- content: a brief summary of what was mentioned about this entity
- importance: 0-1 score

Only include entities that are meaningfully discussed or important. Return at most 10 entities.`,
          },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("Memory extraction API error:", response.statusText);
      return [];
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const parsed = JSON.parse(data.choices[0].message.content) as {
      entities?: Array<{
        type: string;
        title: string;
        content: string;
        importance?: number;
      }>;
    };

    const entities = parsed.entities ?? [];
    const created: Array<Record<string, unknown>> = [];

    for (const entity of entities) {
      const mem = await createMemoryWithEmbedding(
        userId,
        entity.type,
        entity.title,
        entity.content,
        { source: "auto_extract", importance: entity.importance ?? 0.5 },
        sessionId,
      );
      created.push(mem as Record<string, unknown>);
    }

    return created;
  } catch (err) {
    console.error("Memory extraction failed:", err);
    return [];
  }
}

/**
 * Bump access count and last accessed timestamp for a memory.
 */
export async function updateMemoryAccess(memoryId: string) {
  return prisma.memory.update({
    where: { id: memoryId },
    data: {
      accessCount: { increment: 1 },
      lastAccessed: new Date(),
    },
  });
}

/**
 * List memories with pagination and optional type filter.
 */
export async function listMemories(
  userId: string,
  type?: string,
  limit = 50,
  offset = 0,
) {
  const where: { userId: string; type?: string } = { userId };
  if (type) where.type = type;

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.memory.count({ where }),
  ]);

  return { memories, total };
}

/**
 * Delete a memory by id, verifying ownership.
 */
export async function deleteMemory(id: string, userId: string) {
  return prisma.memory.delete({ where: { id, userId } });
}

/**
 * Get memory stats for a user.
 */
export async function getMemoryStats(userId: string) {
  const [totalPeople, totalProjects, totalCommitments, totalConcepts, totalCompanies, total] =
    await Promise.all([
      prisma.memory.count({ where: { userId, type: "person" } }),
      prisma.memory.count({ where: { userId, type: "project" } }),
      prisma.memory.count({ where: { userId, type: "commitment" } }),
      prisma.memory.count({ where: { userId, type: "concept" } }),
      prisma.memory.count({ where: { userId, type: "company" } }),
      prisma.memory.count({ where: { userId } }),
    ]);

  return { total, totalPeople, totalProjects, totalCommitments, totalConcepts, totalCompanies };
}
