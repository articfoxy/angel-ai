import {
  getProvider,
  TranscriptSegment,
  TranscribeOptions,
} from "./ai-provider.js";

export async function transcribeAudio(
  audio: Buffer,
  options?: TranscribeOptions
): Promise<TranscriptSegment[]> {
  const provider = getProvider();
  return provider.transcribe(audio, options);
}

export function createMockTranscriptSegment(
  text: string,
  speaker: string = "Speaker 1"
): TranscriptSegment {
  return {
    speaker,
    text,
    timestamp: Date.now(),
  };
}
