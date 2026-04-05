import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import { extractAndStoreMemories } from "./memory.service.js";
import { recordSessionActivity } from "./engagement.service.js";
import { getBuiltInModeConfig } from "./modes.service.js";
import { getSessionTranscript, clearSessionInference } from "./inference.service.js";

interface PostSessionResult {
  sessionId: string;
  summary: Record<string, unknown> | null;
  memoriesExtracted: number;
  savesDetected: number;
}

/**
 * Run post-session processing after a live session ends.
 *
 * Steps:
 * 1. Save complete transcript to session record
 * 2. Extract memories (people, companies, commitments, etc.)
 * 3. Generate session summary based on mode
 * 4. Update streak
 * 5. Detect Angel Save moments
 */
export async function processSessionEnd(
  sessionId: string,
  userId: string,
  modeId: string,
): Promise<PostSessionResult> {
  const transcript = getSessionTranscript(sessionId);

  // 1. Mark session as processing
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "processing",
      isLive: false,
      endedAt: new Date(),
      transcript: transcript
        ? [{ speaker: "transcript", text: transcript, timestamp: Date.now() }]
        : undefined,
    },
  });

  // 2. Extract and store memories
  let memoriesExtracted = 0;
  if (transcript) {
    const memories = await extractAndStoreMemories(userId, sessionId, transcript);
    memoriesExtracted = memories.length;
  }

  // 3. Generate session summary based on mode
  const modeConfig = getBuiltInModeConfig(modeId);
  const summary = await generateSessionSummary(
    transcript,
    modeConfig?.postSessionOutputs ?? ["summary"],
  );

  // 4. Update session with summary and mark completed
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      summary: (summary ?? Prisma.DbNull) as Prisma.InputJsonValue,
    },
  });

  // 5. Update streak
  await recordSessionActivity(userId);

  // 6. Detect Angel Save moments
  const helpfulCards = await prisma.whisperCard.count({
    where: {
      sessionId,
      status: "helpful",
    },
  });

  if (helpfulCards > 0) {
    await prisma.streak.upsert({
      where: { userId },
      create: { userId, totalSaves: helpfulCards },
      update: { totalSaves: { increment: helpfulCards } },
    });
  }

  // Cleanup inference state
  clearSessionInference(sessionId);

  return {
    sessionId,
    summary,
    memoriesExtracted,
    savesDetected: helpfulCards,
  };
}

/**
 * Generate a mode-appropriate session summary.
 */
async function generateSessionSummary(
  transcript: string,
  outputTypes: string[],
): Promise<Record<string, unknown> | null> {
  if (!transcript) return null;

  const apiKey = config.ai.openaiApiKey;
  if (!apiKey) {
    return {
      summary: "Session completed. (AI summary unavailable — no API key configured)",
      outputs: outputTypes.reduce(
        (acc, t) => ({ ...acc, [t]: `Mock ${t} output` }),
        {} as Record<string, string>,
      ),
    };
  }

  try {
    const outputInstructions = outputTypes
      .map((t) => `- ${t}: Generate appropriate content for this output type`)
      .join("\n");

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
            content: `Generate a post-session summary. Return a JSON object with these keys:
- summary: A concise overall summary
${outputInstructions}

Be concise and actionable.`,
          },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("Summary generation error:", response.statusText);
      return { summary: "Session completed.", error: "Summary generation failed" };
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("Summary generation failed:", err);
    return { summary: "Session completed.", error: "Summary generation failed" };
  }
}
