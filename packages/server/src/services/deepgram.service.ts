import { config } from "../config/index.js";

export interface TranscriptDelta {
  text: string;
  isFinal: boolean;
  speaker?: number;
  timestamp: number;
  confidence: number;
}

interface DeepgramConnection {
  send: (data: Buffer) => void;
  close: () => void;
}

interface SessionTranscription {
  connection: DeepgramConnection | null;
  accumulatedTranscript: string;
  segments: Array<{ speaker: string; text: string; timestamp: number }>;
  lastActivity: number;
}

const activeSessions = new Map<string, SessionTranscription>();

function hasDeepgramKey(): boolean {
  return Boolean(config.ai.deepgramApiKey);
}

export async function startTranscription(
  sessionId: string,
  onDelta: (delta: TranscriptDelta) => void,
  onError: (error: Error) => void
): Promise<void> {
  const session: SessionTranscription = {
    connection: null,
    accumulatedTranscript: "",
    segments: [],
    lastActivity: Date.now(),
  };

  activeSessions.set(sessionId, session);

  if (!hasDeepgramKey()) {
    console.log(`[Deepgram] No API key set, using mock transcription for session ${sessionId}`);
    // Mock mode: connection stays null, processAudioChunk will generate mock transcripts
    return;
  }

  try {
    const { createClient } = await import("@deepgram/sdk");
    const deepgram = createClient(config.ai.deepgramApiKey);

    const connection = deepgram.listen.live({
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

    connection.on("open", () => {
      console.log(`[Deepgram] Connection opened for session ${sessionId}`);
    });

    connection.on("Results", (data: Record<string, unknown>) => {
      try {
        const result = data as {
          channel?: {
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
              words?: Array<{ speaker?: number }>;
            }>;
          };
          is_final?: boolean;
          speech_final?: boolean;
        };

        const alternative = result.channel?.alternatives?.[0];
        if (!alternative?.transcript) return;

        const transcript = alternative.transcript;
        const isFinal = Boolean(result.is_final);
        const speaker = alternative.words?.[0]?.speaker;
        const confidence = alternative.confidence ?? 0;

        const delta: TranscriptDelta = {
          text: transcript,
          isFinal,
          speaker,
          timestamp: Date.now(),
          confidence,
        };

        if (isFinal && transcript.trim()) {
          session.accumulatedTranscript += (session.accumulatedTranscript ? " " : "") + transcript.trim();
          session.segments.push({
            speaker: speaker !== undefined ? `Speaker ${speaker}` : "Speaker 1",
            text: transcript.trim(),
            timestamp: Date.now(),
          });
        }

        session.lastActivity = Date.now();
        onDelta(delta);
      } catch (err) {
        console.error(`[Deepgram] Error processing result for session ${sessionId}:`, err);
      }
    });

    connection.on("error", (err: Error) => {
      console.error(`[Deepgram] Error for session ${sessionId}:`, err);
      onError(err);
    });

    connection.on("close", () => {
      console.log(`[Deepgram] Connection closed for session ${sessionId}`);
    });

    session.connection = {
      send: (data: Buffer) => {
        try {
          // Convert Buffer to ArrayBuffer for Deepgram SDK compatibility
          const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          connection.send(arrayBuffer as ArrayBuffer);
        } catch (err) {
          console.error(`[Deepgram] Error sending audio for session ${sessionId}:`, err);
        }
      },
      close: () => {
        try {
          connection.finish();
        } catch {
          // Ignore close errors
        }
      },
    };
  } catch (err) {
    console.error(`[Deepgram] Failed to initialize for session ${sessionId}:`, err);
    // Fall back to mock mode
    session.connection = null;
  }
}

let mockCounter = 0;

export function processAudioChunk(sessionId: string, chunk: Buffer): TranscriptDelta | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  session.lastActivity = Date.now();

  if (session.connection) {
    // Real Deepgram: forward audio, deltas come via callback
    session.connection.send(chunk);
    return null;
  }

  // Mock mode: generate a mock transcript every few chunks
  mockCounter++;
  if (mockCounter % 3 === 0) {
    const mockText = `Transcribed segment ${mockCounter} at ${new Date().toISOString()}`;
    const delta: TranscriptDelta = {
      text: mockText,
      isFinal: true,
      speaker: 1,
      timestamp: Date.now(),
      confidence: 0.95,
    };

    session.accumulatedTranscript += (session.accumulatedTranscript ? " " : "") + mockText;
    session.segments.push({
      speaker: "Speaker 1",
      text: mockText,
      timestamp: Date.now(),
    });

    return delta;
  }

  return null;
}

export function getAccumulatedTranscript(sessionId: string): string {
  return activeSessions.get(sessionId)?.accumulatedTranscript || "";
}

export function getTranscriptSegments(sessionId: string): Array<{ speaker: string; text: string; timestamp: number }> {
  return activeSessions.get(sessionId)?.segments || [];
}

export function getRecentTranscript(sessionId: string, windowMs: number = 180000): string {
  const session = activeSessions.get(sessionId);
  if (!session) return "";

  const cutoff = Date.now() - windowMs;
  const recentSegments = session.segments.filter((s) => s.timestamp >= cutoff);
  return recentSegments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
}

export function stopTranscription(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  if (session.connection) {
    session.connection.close();
  }

  activeSessions.delete(sessionId);
}

export function isSessionActive(sessionId: string): boolean {
  return activeSessions.has(sessionId);
}
