import { Prisma } from "@prisma/client";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { getModeConfig } from "./modes.service.js";
import { extractAndStoreMemories } from "./memory.service.js";
import { recordSessionActivity, recordSave } from "./engagement.service.js";

interface PostSessionResult {
  summary: Record<string, unknown>;
  memoriesExtracted: number;
  angelSaves: number;
}

export async function processPostSession(
  sessionId: string,
  userId: string
): Promise<PostSessionResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { whisperCards: true },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const transcript = session.transcript as Array<{ speaker: string; text: string }> | null;
  const transcriptText = transcript
    ? transcript.map((s) => `${s.speaker}: ${s.text}`).join("\n")
    : "";

  // 1. Extract and store memories
  let memoriesExtracted = 0;
  if (transcriptText) {
    const extracted = await extractAndStoreMemories(userId, sessionId, transcriptText);
    memoriesExtracted = extracted.length;
  }

  // 2. Generate session summary based on mode
  const modeConfig = getModeConfig(session.modeId);
  const summary = await generateModeSummary(transcriptText, modeConfig.postSessionOutputs, session.modeId);

  // 3. Update session with summary
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      summary: summary as Prisma.InputJsonValue,
      status: "completed",
      endedAt: session.endedAt || new Date(),
      isLive: false,
    },
  });

  // 4. Update streak
  await recordSessionActivity(userId);

  // 5. Detect Angel Save moments
  const helpfulCards = session.whisperCards.filter((c) => c.helpful === true);
  let angelSaves = 0;
  for (const card of helpfulCards) {
    await recordSave(userId, sessionId, `Whisper card "${card.content}" was helpful`);
    angelSaves++;
  }

  return {
    summary,
    memoriesExtracted,
    angelSaves,
  };
}

async function generateModeSummary(
  transcript: string,
  outputTypes: string[],
  modeId: string
): Promise<Record<string, unknown>> {
  if (!transcript) {
    return { brief: "No transcript available", outputs: {} };
  }

  if (!config.ai.openaiApiKey) {
    // Mock summary
    const outputs: Record<string, string> = {};
    for (const outputType of outputTypes) {
      outputs[outputType] = `[Mock ${outputType}] Generated from ${modeId} mode session`;
    }
    return {
      brief: `Session completed in ${modeId} mode`,
      detailed: "This is a mock summary. Connect an OpenAI API key for real summaries.",
      outputs,
    };
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.ai.openaiApiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate a post-session summary. Include these output types: ${outputTypes.join(", ")}.
Return JSON: {
  "brief": "1-2 sentence summary",
  "detailed": "detailed summary",
  "outputs": { "${outputTypes[0]}": "...", ... }
}`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (err) {
    console.error("[PostSession] Summary generation failed:", err);
    return { brief: "Summary generation failed", detailed: "" };
  }
}
