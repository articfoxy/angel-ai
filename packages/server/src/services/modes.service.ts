import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export interface ModeConfig {
  name: string;
  icon: string;
  systemPrompt: string;
  whisperTypes: string[];
  postSessionOutputs: string[];
  maxWhispersPerMinute: number;
}

export const BUILT_IN_MODES: Record<string, ModeConfig> = {
  meeting: {
    name: "Meeting Angel",
    icon: "\u{1F3AF}",
    systemPrompt: `You are Angel AI in Meeting mode. Focus on:
- Identifying people mentioned and pulling context from memory
- Suggesting smart questions at topic shifts or decision points
- Detecting commitments and promises ("I'll send...", "Let's schedule...", "We agreed to...")
- Noting action items
Keep suggestions meeting-appropriate: professional, concise, timely.`,
    whisperTypes: ["context", "question", "commitment", "action"],
    postSessionOutputs: ["summary", "action_items", "commitments", "follow_up_emails"],
    maxWhispersPerMinute: 0.4,
  },
  translator: {
    name: "Translator Angel",
    icon: "\u{1F30D}",
    systemPrompt: `You are Angel AI in Translator mode. Your primary job is real-time translation.
- Detect the source language automatically
- Translate to the user's target language
- Preserve tone and intent, not just literal meaning
- Flag culturally significant phrases or idioms
- Keep translations concise and natural`,
    whisperTypes: ["context"],
    postSessionOutputs: ["bilingual_transcript", "key_terms_glossary"],
    maxWhispersPerMinute: 2,
  },
  think: {
    name: "Think Angel",
    icon: "\u{1F9E0}",
    systemPrompt: `You are Angel AI in Think mode for solo brainstorming.
- Connect current ideas to past thoughts from memory
- Suggest structure for rambling thoughts
- Challenge assumptions gently
- Note when an idea contradicts or builds on something from a previous session
- Help organize stream of consciousness into actionable concepts`,
    whisperTypes: ["context", "question", "nudge"],
    postSessionOutputs: ["structured_memo", "idea_map", "action_items"],
    maxWhispersPerMinute: 0.5,
  },
  sales: {
    name: "Sales Angel",
    icon: "\u{1F4BC}",
    systemPrompt: `You are Angel AI in Sales mode.
- Detect objections and suggest responses
- Pull competitor intel from memory
- Track pricing discussions and commitments
- Note buying signals and hesitations
- Suggest closing techniques when appropriate`,
    whisperTypes: ["context", "question", "commitment", "action", "fact_check"],
    postSessionOutputs: ["call_scorecard", "crm_update", "next_steps_email"],
    maxWhispersPerMinute: 0.5,
  },
  learning: {
    name: "Learning Angel",
    icon: "\u{1F4DA}",
    systemPrompt: `You are Angel AI in Learning mode.
- Highlight key concepts and definitions
- Note when something contradicts or extends prior knowledge
- Suggest connections between topics
- Flag important formulas, dates, or facts
- Help build a mental model of the subject`,
    whisperTypes: ["context", "question", "fact_check", "nudge"],
    postSessionOutputs: ["study_notes", "flashcards", "knowledge_updates"],
    maxWhispersPerMinute: 0.4,
  },
  coach: {
    name: "Coach Angel",
    icon: "\u{1F5E3}\uFE0F",
    systemPrompt: `You are Angel AI in Coach mode for communication improvement.
- Monitor speaking pace (flag if too fast/slow)
- Detect filler words (um, uh, like, you know)
- Note strong points to reinforce
- Suggest when to pause for effect
- Track talk-to-listen ratio`,
    whisperTypes: ["context", "nudge"],
    postSessionOutputs: ["performance_scorecard", "communication_metrics", "improvement_tips"],
    maxWhispersPerMinute: 0.3,
  },
  builder: {
    name: "Builder Angel",
    icon: "\u{1F527}",
    systemPrompt: `You are Angel AI in Builder mode for technical discussions.
- Fact-check technical claims against known information
- Note architectural decisions and their rationale
- Detect conflicts with previous technical decisions from memory
- Suggest relevant patterns or approaches
- Track technical debt and TODOs mentioned`,
    whisperTypes: ["context", "question", "fact_check", "commitment", "action"],
    postSessionOutputs: ["decision_record", "technical_tasks", "architecture_notes"],
    maxWhispersPerMinute: 0.4,
  },
};

export function getModeConfig(modeId: string, userSettings?: Record<string, unknown> | null): ModeConfig & { modeId: string } {
  const base = BUILT_IN_MODES[modeId];
  if (!base) {
    // Fall back to meeting mode
    return { ...BUILT_IN_MODES.meeting, modeId: "meeting" };
  }
  if (userSettings) {
    return {
      ...base,
      ...userSettings,
      // Preserve system prompt and whisper types unless explicitly overridden
      systemPrompt: (userSettings.systemPrompt as string) || base.systemPrompt,
      whisperTypes: (userSettings.whisperTypes as string[]) || base.whisperTypes,
      modeId,
    };
  }
  return { ...base, modeId };
}

export async function getUserDefaultMode(userId: string): Promise<string> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  return prefs?.defaultMode || "meeting";
}

export async function setUserDefaultMode(userId: string, modeId: string): Promise<void> {
  if (!BUILT_IN_MODES[modeId]) {
    throw new Error(`Invalid mode: ${modeId}`);
  }
  await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, defaultMode: modeId },
    update: { defaultMode: modeId },
  });
}

export async function getUserModeSettings(userId: string, modeId: string): Promise<Record<string, unknown> | null> {
  const mode = await prisma.angelMode.findUnique({
    where: { userId_modeId: { userId, modeId } },
  });
  return (mode?.settings as Record<string, unknown>) || null;
}

export async function updateUserModeSettings(
  userId: string,
  modeId: string,
  settings: Record<string, unknown>
): Promise<void> {
  if (!BUILT_IN_MODES[modeId]) {
    throw new Error(`Invalid mode: ${modeId}`);
  }
  await prisma.angelMode.upsert({
    where: { userId_modeId: { userId, modeId } },
    create: { userId, modeId, settings: settings as Prisma.InputJsonValue },
    update: { settings: settings as Prisma.InputJsonValue },
  });
}

export function listAllModes(): Array<{ modeId: string } & ModeConfig> {
  return Object.entries(BUILT_IN_MODES).map(([modeId, config]) => ({
    modeId,
    ...config,
  }));
}
