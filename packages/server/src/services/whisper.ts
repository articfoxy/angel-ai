import { getProvider, WhisperCardSuggestion } from "./ai-provider.js";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";

export async function generateWhisperCards(
  sessionId: string,
  transcript: string,
  userId: string
): Promise<WhisperCardSuggestion[]> {
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { lastMentioned: "desc" },
    take: 20,
    select: { name: true, content: true },
  });

  const memoriesForProvider = memories.map((m) => ({
    name: m.name || "Unknown",
    content: m.content,
  }));

  const provider = getProvider();
  const suggestions = await provider.suggest(transcript, memoriesForProvider);

  const threshold = config.ai.whisperConfidenceThreshold;
  const filtered = suggestions.filter((s) => s.confidence >= threshold);

  for (const suggestion of filtered) {
    await prisma.whisperCard.create({
      data: {
        sessionId,
        userId,
        type: suggestion.type,
        content: suggestion.content,
        confidence: suggestion.confidence,
      },
    });
  }

  return filtered;
}
