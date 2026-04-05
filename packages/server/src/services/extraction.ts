import { getProvider } from "./ai-provider.js";

export interface ExtractionResult {
  participants?: Array<{ name: string; role: string; notes: string }>;
  keyFacts?: string[];
  actionItems?: Array<{
    task: string;
    assignee: string;
    due: string | null;
  }>;
  promises?: string[];
  risks?: string[];
  summary?: { brief: string; detailed: string };
}

export async function extractFromTranscript(
  transcript: string
): Promise<ExtractionResult> {
  const provider = getProvider();
  return provider.extract(transcript, {
    type: "session_debrief",
    fields: [
      "participants",
      "keyFacts",
      "actionItems",
      "promises",
      "risks",
      "summary",
    ],
  });
}
