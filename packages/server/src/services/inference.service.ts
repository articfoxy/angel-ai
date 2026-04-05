import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { getModeConfig, BUILT_IN_MODES } from "./modes.service.js";
import { searchMemoriesByVector } from "./memory.service.js";
import { getRecentTranscript } from "./deepgram.service.js";

interface InferenceWhisperCard {
  type: string;
  content: string;
  detail?: string;
  confidence: number;
  priority: string;
  sourceMemoryId?: string;
}

interface SessionInferenceState {
  modeId: string;
  lastInferenceTime: number;
  deliveredCardIds: Set<string>;
  cardTimestamps: number[];
  intervalId?: ReturnType<typeof setInterval>;
}

const sessionStates = new Map<string, SessionInferenceState>();

function hasOpenAIKey(): boolean {
  return Boolean(config.ai.openaiApiKey);
}

async function callOpenAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (!hasOpenAIKey()) {
    return JSON.stringify({ cards: [] });
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.ai.openaiApiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || JSON.stringify({ cards: [] });
  } catch (err) {
    console.error("[Inference] OpenAI call failed:", err);
    return JSON.stringify({ cards: [] });
  }
}

async function generateMockCards(modeId: string): Promise<InferenceWhisperCard[]> {
  const mode = BUILT_IN_MODES[modeId] || BUILT_IN_MODES.meeting;
  const type = mode.whisperTypes[Math.floor(Math.random() * mode.whisperTypes.length)] || "context";

  // Only occasionally generate mock cards
  if (Math.random() > 0.3) return [];

  return [
    {
      type,
      content: `[Mock] ${mode.name} suggestion based on recent conversation`,
      confidence: 0.88,
      priority: "medium",
    },
  ];
}

export async function runInference(
  sessionId: string,
  userId: string,
  emit: (card: Record<string, unknown>) => void
): Promise<void> {
  const state = sessionStates.get(sessionId);
  if (!state) return;

  const transcript = getRecentTranscript(sessionId);
  if (!transcript || transcript.trim().length < 20) return;

  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const recentCards = state.cardTimestamps.filter((t) => t > fiveMinutesAgo);
  if (recentCards.length >= 2) return; // Max 2 cards per 5 minutes

  emit({ type: "inference:thinking" });

  let cards: InferenceWhisperCard[];

  if (!hasOpenAIKey()) {
    cards = await generateMockCards(state.modeId);
  } else {
    // Get relevant memories for context
    let memoryContext = "";
    try {
      const memories = await searchMemoriesByVector(userId, transcript, 5);
      memoryContext = memories
        .map((m) => `[${m.type}] ${m.title}: ${m.content}`)
        .join("\n");
    } catch {
      // No memories or vector search unavailable
    }

    const modeConfig = getModeConfig(state.modeId);

    const messages = [
      {
        role: "system",
        content: `${modeConfig.systemPrompt}

You are generating WhisperCards - brief, high-value suggestions shown to the user during a live conversation. Rules:
- Generate 0-2 cards maximum
- Each card content must be under 140 characters
- Each card detail (optional, expandable) must be under 500 characters
- Only suggest if confidence >= 0.85
- Card types available: ${modeConfig.whisperTypes.join(", ")}
- Priority: low, medium, or high
- Be concise, actionable, and timely

Return JSON: { "cards": [{ "type": string, "content": string, "detail"?: string, "confidence": number, "priority": string }] }
If nothing useful to suggest, return { "cards": [] }`,
      },
      {
        role: "user",
        content: `Recent transcript:\n${transcript}\n\n${memoryContext ? `Relevant memories:\n${memoryContext}` : "No relevant memories found."}`,
      },
    ];

    const response = await callOpenAI(messages);
    try {
      const parsed = JSON.parse(response);
      cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    } catch {
      cards = [];
    }
  }

  const threshold = config.ai.whisperConfidenceThreshold;

  for (const card of cards) {
    if (card.confidence < threshold) continue;

    // Check for duplicate content
    const contentKey = card.content.toLowerCase().trim();
    if (state.deliveredCardIds.has(contentKey)) continue;

    try {
      const created = await prisma.whisperCard.create({
        data: {
          sessionId,
          userId,
          type: card.type,
          content: card.content.slice(0, 140),
          detail: card.detail?.slice(0, 500),
          confidence: card.confidence,
          priority: card.priority || "medium",
          sourceMemoryId: card.sourceMemoryId,
          status: "delivered",
        },
      });

      state.deliveredCardIds.add(contentKey);
      state.cardTimestamps.push(Date.now());

      emit({
        type: "whisper:card",
        card: {
          id: created.id,
          type: created.type,
          content: created.content,
          detail: created.detail,
          confidence: created.confidence,
          priority: created.priority,
          requiresAck: created.requiresAck,
          createdAt: created.createdAt,
        },
      });
    } catch (err) {
      console.error("[Inference] Failed to create whisper card:", err);
    }
  }

  state.lastInferenceTime = Date.now();
}

export function startInferenceLoop(
  sessionId: string,
  userId: string,
  modeId: string,
  emit: (card: Record<string, unknown>) => void,
  intervalMs: number = 45000
): void {
  // Stop existing loop if any
  stopInferenceLoop(sessionId);

  const state: SessionInferenceState = {
    modeId,
    lastInferenceTime: 0,
    deliveredCardIds: new Set(),
    cardTimestamps: [],
  };

  state.intervalId = setInterval(() => {
    runInference(sessionId, userId, emit).catch((err) => {
      console.error(`[Inference] Error in loop for session ${sessionId}:`, err);
    });
  }, intervalMs);

  sessionStates.set(sessionId, state);
}

export function stopInferenceLoop(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state?.intervalId) {
    clearInterval(state.intervalId);
  }
  sessionStates.delete(sessionId);
}

export function switchMode(sessionId: string, modeId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.modeId = modeId;
  }
}
