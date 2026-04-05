import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import { getRelevantMemories } from "./memory.service.js";
import { getBuiltInModeConfig } from "./modes.service.js";
import type { Server as SocketServer } from "socket.io";

interface WhisperCardData {
  type: string;
  content: string;
  detail?: string;
  confidence: number;
  priority?: string;
  sourceMemoryId?: string;
}

interface SessionInferenceState {
  transcriptWindow: Array<{ text: string; speaker?: number; timestamp: number }>;
  lastInferenceAt: number;
  cardsDeliveredRecently: number;
  lastCardDeliveryAt: number;
  deliveredCardContents: Set<string>;
  modeId: string;
}

const sessionStates = new Map<string, SessionInferenceState>();

/**
 * Initialize inference state for a new live session.
 */
export function initSessionInference(sessionId: string, modeId: string): void {
  sessionStates.set(sessionId, {
    transcriptWindow: [],
    lastInferenceAt: 0,
    cardsDeliveredRecently: 0,
    lastCardDeliveryAt: 0,
    deliveredCardContents: new Set(),
    modeId,
  });
}

/**
 * Clean up inference state when session ends.
 */
export function clearSessionInference(sessionId: string): void {
  sessionStates.delete(sessionId);
}

/**
 * Switch the mode for a live session.
 */
export function switchSessionMode(sessionId: string, modeId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) state.modeId = modeId;
}

/**
 * Get the full accumulated transcript for a session.
 */
export function getSessionTranscript(sessionId: string): string {
  const state = sessionStates.get(sessionId);
  if (!state) return "";
  return state.transcriptWindow.map((s) => s.text).join(" ");
}

/**
 * Add transcript text to the rolling window and trigger inference if due.
 */
export async function addTranscriptAndMaybeInfer(
  sessionId: string,
  userId: string,
  text: string,
  speaker: number | undefined,
  io: SocketServer,
): Promise<void> {
  const state = sessionStates.get(sessionId);
  if (!state) return;

  const now = Date.now();
  state.transcriptWindow.push({ text, speaker, timestamp: now });

  // Keep a rolling 3-minute window
  const threeMinutesAgo = now - 3 * 60 * 1000;
  state.transcriptWindow = state.transcriptWindow.filter(
    (s) => s.timestamp > threeMinutesAgo,
  );

  // Mode-dependent inference interval and card limits
  const fastModes = new Set(["translator", "coach", "sales", "think"]);
  const isFastMode = fastModes.has(state.modeId);
  const inferenceInterval = isFastMode ? 10_000 : 20_000;
  const cardWindowMs = isFastMode ? 3 * 60 * 1000 : 5 * 60 * 1000;
  const maxCards = isFastMode ? 3 : 2;

  const timeSinceLastInference = now - state.lastInferenceAt;
  if (timeSinceLastInference < inferenceInterval) return;

  state.lastInferenceAt = now;

  // Reset card count based on mode window
  if (now - state.lastCardDeliveryAt > cardWindowMs) {
    state.cardsDeliveredRecently = 0;
  }

  if (state.cardsDeliveredRecently >= maxCards) return;

  try {
    io.to(`session:${sessionId}`).emit("inference:thinking", {});

    const cards = await runInference(sessionId, userId, state);

    for (const card of cards) {
      if (state.deliveredCardContents.has(card.content)) continue;

      const whisper = await prisma.whisperCard.create({
        data: {
          sessionId,
          userId,
          type: card.type,
          content: card.content,
          detail: card.detail,
          confidence: card.confidence,
          priority: card.priority ?? "medium",
          sourceMemoryId: card.sourceMemoryId,
        },
      });

      state.deliveredCardContents.add(card.content);
      state.cardsDeliveredRecently++;
      state.lastCardDeliveryAt = now;

      io.to(`session:${sessionId}`).emit("whisper:card", whisper);

      if (state.cardsDeliveredRecently >= maxCards) break;
    }
  } catch (err) {
    console.error("Inference error:", err);
  }
}

/**
 * Run GPT-4o-mini inference to generate whisper cards (streaming).
 */
async function runInference(
  sessionId: string,
  userId: string,
  state: SessionInferenceState,
): Promise<WhisperCardData[]> {
  const apiKey = config.ai.openaiApiKey;

  const transcriptText = state.transcriptWindow
    .map((s) => (s.speaker !== undefined ? `Speaker ${s.speaker}: ${s.text}` : s.text))
    .join("\n");

  // Get relevant memories (with caching — see memory.service.ts)
  const memories = await getRelevantMemories(userId, transcriptText, 5);
  const memoryContext = memories
    .map((m) => `[${m.type}] ${m.title}: ${m.content}`)
    .join("\n");

  const modeConfig = getBuiltInModeConfig(state.modeId);

  if (!apiKey) {
    return generateMockCards(state, modeConfig?.whisperTypes ?? ["context"]);
  }

  const systemPrompt = modeConfig?.systemPrompt ?? "You are Angel AI, a real-time conversation assistant.";
  const allowedTypes = modeConfig?.whisperTypes ?? ["context", "question"];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}

You are generating whisper cards — brief, real-time suggestions for the user during a live conversation.

Rules:
- Generate 0-2 cards maximum
- Each card must have confidence >= 0.85
- Content must be max 140 characters
- Detail (optional) must be max 500 characters
- Allowed types: ${allowedTypes.join(", ")}
- Only suggest if genuinely helpful — no filler

Return a JSON object with a "cards" array. Each card has: type, content, confidence (0-1), detail (optional), priority ("low"|"medium"|"high").

User's memory context:
${memoryContext || "No memories yet."}`,
          },
          {
            role: "user",
            content: `Recent conversation:\n${transcriptText}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("Inference API error:", response.statusText);
      return [];
    }

    // Collect streamed chunks into full response
    let fullContent = "";
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      console.error("No response body reader");
      return [];
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) fullContent += delta;
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (!fullContent) return [];

    const parsed = JSON.parse(fullContent) as { cards?: WhisperCardData[] };
    const cards = (parsed.cards ?? []).filter(
      (c) => c.confidence >= 0.85 && c.content.length <= 140,
    );

    return cards.slice(0, 2);
  } catch (err) {
    console.error("Inference request failed:", err);
    return [];
  }
}

/**
 * Generate mock whisper cards when no API key is available.
 */
function generateMockCards(
  state: SessionInferenceState,
  allowedTypes: string[],
): WhisperCardData[] {
  const transcriptText = state.transcriptWindow.map((s) => s.text).join(" ").toLowerCase();

  const cards: WhisperCardData[] = [];

  if (allowedTypes.includes("commitment") && /i'll|i will|let's|we agreed/.test(transcriptText)) {
    cards.push({
      type: "commitment",
      content: "A commitment was detected in the conversation.",
      confidence: 0.88,
      priority: "high",
    });
  }

  if (allowedTypes.includes("context") && cards.length === 0) {
    cards.push({
      type: "context",
      content: "Consider asking a follow-up question to dig deeper here.",
      confidence: 0.86,
      priority: "medium",
    });
  }

  return cards.slice(0, 1);
}
