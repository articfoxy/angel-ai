import { prisma } from "../lib/prisma.js";

export async function searchMemories(
  userId: string,
  query?: string,
  type?: string
) {
  const where: any = { userId };
  if (type) where.type = type;
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { tags: { has: query } },
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
    content: any;
    tags?: string[];
    sourceSessionId?: string;
  }
) {
  return prisma.memory.create({
    data: {
      userId,
      type: data.type,
      title: data.name,
      name: data.name,
      content: JSON.stringify(data.content),
      tags: data.tags || [],
      sourceSessionId: data.sourceSessionId,
      lastMentioned: new Date(),
    },
  });
}

export async function updateMemory(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    content: any;
    tags: string[];
    type: string;
  }>
) {
  return prisma.memory.update({
    where: { id, userId },
    data: { ...data, updatedAt: new Date() },
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
    orderBy: { lastMentioned: "desc" },
  });
}

export async function getContextByName(userId: string, name: string) {
  return prisma.memory.findMany({
    where: {
      userId,
      name: { contains: name, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
  });
}
