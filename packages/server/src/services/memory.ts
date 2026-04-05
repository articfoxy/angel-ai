import { prisma } from "../lib/prisma.js";

/**
 * Legacy memory service — preserved for backward compatibility with existing routes.
 * New code should use memory.service.ts instead.
 */

export async function searchMemories(
  userId: string,
  query?: string,
  type?: string,
) {
  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ];
  }

  return prisma.memory.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

export async function createMemory(
  userId: string,
  data: {
    type: string;
    name: string;
    content: unknown;
    tags?: string[];
    sourceSessionId?: string;
  },
) {
  return prisma.memory.create({
    data: {
      userId,
      type: data.type,
      title: data.name,
      content: typeof data.content === "string" ? data.content : JSON.stringify(data.content),
      metadata: data.tags ? { tags: data.tags } : undefined,
      sessionId: data.sourceSessionId,
    },
  });
}

export async function updateMemory(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    content: unknown;
    tags: string[];
    type: string;
  }>,
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.title = data.name;
  if (data.content !== undefined) {
    updateData.content = typeof data.content === "string" ? data.content : JSON.stringify(data.content);
  }
  if (data.type !== undefined) updateData.type = data.type;
  if (data.tags !== undefined) updateData.metadata = { tags: data.tags };

  return prisma.memory.update({
    where: { id, userId },
    data: updateData,
  });
}

export async function deleteMemory(id: string, userId: string) {
  return prisma.memory.delete({ where: { id, userId } });
}

export async function getMemoryById(id: string, userId: string) {
  return prisma.memory.findFirst({ where: { id, userId } });
}

export async function getPeople(userId: string) {
  return prisma.memory.findMany({
    where: { userId, type: "person" },
    orderBy: { lastAccessed: "desc" },
  });
}

export async function getContextByName(userId: string, name: string) {
  return prisma.memory.findMany({
    where: {
      userId,
      title: { contains: name, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
  });
}
