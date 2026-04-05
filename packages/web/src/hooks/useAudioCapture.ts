import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioCaptureOptions {
  onPcmFrame: (frame: Int16Array) => void;
}

interface UseAudioCaptureReturn {
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  isCapturing: boolean;
  error: string | null;
}

export function useAudioCapture({ onPcmFrame }: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onPcmFrameRef = useRef(onPcmFrame);
  onPcmFrameRef.current = onPcmFrame;

  // Fallback: MediaRecorder-based capture for browsers without AudioWorklet
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);

  const cleanup = useCallback(() => {
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (fallbackRecorderRef.current && fallbackRecorderRef.current.state !== 'inactive') {
      fallbackRecorderRef.current.stop();
      fallbackRecorderRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const startWithWorklet = useCallback(async (stream: MediaStream) => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    contextRef.current = ctx;

    await ctx.audioWorklet.addModule('/audio-processor.js');
    const source = ctx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(ctx, 'audio-capture');

    workletNode.port.onmessage = (e: MessageEvent<Int16Array>) => {
      onPcmFrameRef.current(e.data);
    };

    source.connect(workletNode);
    workletNode.connect(ctx.destination);
  }, []);

  const startWithFallback = useCallback(async (stream: MediaStream) => {
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        const int16 = new Int16Array(buffer);
        onPcmFrameRef.current(int16);
      }
    };

    recorder.start(100);
    fallbackRecorderRef.current = recorder;
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      streamRef.current = stream;

      const hasWorklet = typeof AudioWorkletNode !== 'undefined';
      if (hasWorklet) {
        try {
          await startWithWorklet(stream);
        } catch {
          await startWithFallback(stream);
        }
      } else {
        await startWithFallback(stream);
      }

      setIsCapturing(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in your browser settings.');
      } else {
        setError('Could not access microphone. Please check your device.');
      }
    }
  }, [startWithWorklet, startWithFallback]);

  const stopCapture = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { startCapture, stopCapture, isCapturing, error };
}
