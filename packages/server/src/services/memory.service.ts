import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

interface MemoryCreateInput {
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  importance?: number;
}

interface MemorySearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: unknown;
  importance: number;
  similarity?: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!config.ai.openaiApiKey) {
    return null;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.ai.openaiApiKey });

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0]?.embedding || null;
  } catch (err) {
    console.error("[Memory] Failed to generate embedding:", err);
    return null;
  }
}

export async function createMemoryWithEmbedding(
  userId: string,
  input: MemoryCreateInput
): Promise<{ id: string }> {
  const embedding = await generateEmbedding(`${input.title} ${input.content}`);

  const memory = await prisma.memory.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      content: input.content,
      embedding: embedding ?? undefined,
      metadata: input.metadata as Prisma.JsonObject || undefined,
      importance: input.importance ?? 0.5,
      sessionId: input.sessionId,
      tags: [],
      name: input.title,
    },
  });

  return { id: memory.id };
}

export async function searchMemoriesByVector(
  userId: string,
  query: string,
  limit: number = 5
): Promise<MemorySearchResult[]> {
  const embedding = await generateEmbedding(query);

  if (embedding) {
    try {
      // Fetch recent memories with embeddings and compute cosine similarity in app code
      const memories = await prisma.memory.findMany({
        where: {
          userId,
          embedding: { not: Prisma.DbNull },
        },
        orderBy: { updatedAt: "desc" },
        take: 1000,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          metadata: true,
          importance: true,
          embedding: true,
        },
      });

      const scored = memories
        .map((m) => ({
          id: m.id,
          type: m.type,
          title: m.title,
          content: m.content,
          metadata: m.metadata,
          importance: m.importance,
          similarity: cosineSimilarity(embedding, m.embedding as number[]),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return scored;
    } catch (err) {
      console.error("[Memory] Vector search failed, falling back to text search:", err);
    }
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
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      metadata: true,
      importance: true,
    },
  });

  return memories.map((m) => ({
    ...m,
    metadata: m.metadata,
    importance: m.importance,
  }));
}

export async function getRelevantMemories(
  userId: string,
  transcriptChunk: string
): Promise<MemorySearchResult[]> {
  // Extract potential entity names for targeted search
  const results = await searchMemoriesByVector(userId, transcriptChunk, 5);
  return results;
}

export async function extractAndStoreMemories(
  userId: string,
  sessionId: string,
  transcript: string
): Promise<Array<{ id: string; type: string; title: string }>> {
  const stored: Array<{ id: string; type: string; title: string }> = [];

  if (!config.ai.openaiApiKey) {
    // Mock extraction
    const mockMemories = [
      { type: "concept", title: "Discussion Topic", content: "Key topic discussed in this session" },
    ];

    for (const mem of mockMemories) {
      const result = await createMemoryWithEmbedding(userId, {
        ...mem,
        sessionId,
      });
      stored.push({ id: result.id, type: mem.type, title: mem.title });
    }

    return stored;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.ai.openaiApiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract memorable entities from this transcript. Return JSON:
{
  "memories": [
    {
      "type": "person|company|project|concept|commitment",
      "title": "short title",
      "content": "detailed description",
      "importance": 0.0-1.0
    }
  ]
}
Extract people mentioned, companies, projects discussed, key concepts, and commitments made. Be selective - only extract truly noteworthy items.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{"memories":[]}');
    const memories: Array<{
      type: string;
      title: string;
      content: string;
      importance?: number;
    }> = Array.isArray(parsed.memories) ? parsed.memories : [];

    for (const mem of memories) {
      try {
        const result = await createMemoryWithEmbedding(userId, {
          type: mem.type,
          title: mem.title,
          content: mem.content,
          importance: mem.importance,
          sessionId,
        });
        stored.push({ id: result.id, type: mem.type, title: mem.title });
      } catch (err) {
        console.error("[Memory] Failed to store extracted memory:", err);
      }
    }
  } catch (err) {
    console.error("[Memory] Memory extraction failed:", err);
  }

  return stored;
}

export async function updateMemoryAccess(memoryId: string): Promise<void> {
  await prisma.memory.update({
    where: { id: memoryId },
    data: {
      accessCount: { increment: 1 },
      lastAccessed: new Date(),
    },
  });
}

export async function getMemoryStats(userId: string) {
  const [total, byType] = await Promise.all([
    prisma.memory.count({ where: { userId } }),
    prisma.memory.groupBy({
      by: ["type"],
      where: { userId },
      _count: true,
    }),
  ]);

  const stats: Record<string, number> = { total };
  for (const group of byType) {
    stats[group.type] = group._count;
  }

  return stats;
}

// Re-export legacy functions for backward compatibility with existing routes
export {
  searchMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  getMemoryById,
  getPeople,
  getContextByName,
} from "./memory.js";
