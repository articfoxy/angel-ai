import { createClient, LiveTranscriptionEvents, LiveClient } from "@deepgram/sdk";
import { config } from "../config/index.js";

export interface TranscriptDelta {
  text: string;
  isFinal: boolean;
  speaker?: number;
  timestamp: number;
  confidence: number;
}

export interface DeepgramSessionHandle {
  send(audio: Buffer): void;
  close(): void;
  isOpen(): boolean;
}

type TranscriptCallback = (delta: TranscriptDelta) => void;
type ErrorCallback = (error: Error) => void;

/**
 * Creates a Deepgram live transcription connection for a session.
 * Falls back gracefully when DEEPGRAM_API_KEY is not set.
 */
export function createDeepgramSession(
  onTranscript: TranscriptCallback,
  onError: ErrorCallback,
): DeepgramSessionHandle {
  const apiKey = config.ai.deepgramApiKey;

  if (!apiKey) {
    console.warn("DEEPGRAM_API_KEY not set — using mock transcription");
    return createMockSession(onTranscript);
  }

  const deepgram = createClient(apiKey);

  let connection: LiveClient | null = null;
  let open = false;

  try {
    connection = deepgram.listen.live({
      model: "nova-3",
      language: "en",
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      diarize: true,
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      open = true;
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: Record<string, unknown>) => {
      const channel = data.channel as { alternatives?: Array<{ transcript?: string; confidence?: number; words?: Array<{ speaker?: number }> }> } | undefined;
      const alternative = channel?.alternatives?.[0];
      if (!alternative?.transcript) return;

      const delta: TranscriptDelta = {
        text: alternative.transcript,
        isFinal: (data.is_final as boolean) ?? false,
        speaker: alternative.words?.[0]?.speaker,
        timestamp: Date.now(),
        confidence: alternative.confidence ?? 0,
      };

      onTranscript(delta);
    });

    connection.on(LiveTranscriptionEvents.Error, (err: Error) => {
      console.error("Deepgram error:", err);
      onError(err);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      open = false;
    });
  } catch (err) {
    console.error("Failed to create Deepgram connection:", err);
    return createMockSession(onTranscript);
  }

  return {
    send(audio: Buffer) {
      if (open && connection) {
        // Convert Buffer to ArrayBuffer for Deepgram SDK
        const arrayBuffer = audio.buffer.slice(
          audio.byteOffset,
          audio.byteOffset + audio.byteLength,
        );
        connection.send(arrayBuffer as ArrayBuffer);
      }
    },
    close() {
      if (connection) {
        open = false;
        connection.requestClose();
        connection = null;
      }
    },
    isOpen() {
      return open;
    },
  };
}

/**
 * Mock transcription session for development without Deepgram key.
 */
function createMockSession(onTranscript: TranscriptCallback): DeepgramSessionHandle {
  let open = true;
  let chunkCount = 0;

  const mockPhrases = [
    "So I think the main thing we need to focus on is the timeline.",
    "Right, and we should also consider the budget implications.",
    "I'll send over the updated proposal by end of day Friday.",
    "Let's schedule a follow-up meeting for next week.",
    "The key metrics we're tracking show positive growth.",
    "We agreed to move forward with option B.",
    "Can someone take the action item to review the contract?",
    "I think that's a great point about the user experience.",
  ];

  return {
    send(_audio: Buffer) {
      if (!open) return;
      chunkCount++;

      // Emit a mock transcript every ~10 chunks (simulating real speech)
      if (chunkCount % 10 === 0) {
        const phraseIndex = Math.floor(chunkCount / 10) % mockPhrases.length;
        onTranscript({
          text: mockPhrases[phraseIndex],
          isFinal: true,
          speaker: chunkCount % 20 === 0 ? 1 : 0,
          timestamp: Date.now(),
          confidence: 0.92 + Math.random() * 0.08,
        });
      }
    },
    close() {
      open = false;
    },
    isOpen() {
      return open;
    },
  };
}
