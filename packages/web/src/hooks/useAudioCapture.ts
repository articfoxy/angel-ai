import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioCaptureOptions {
  onPCMFrame: (frame: Int16Array) => void;
}

interface UseAudioCaptureReturn {
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  isCapturing: boolean;
  error: string | null;
}

export function useAudioCapture({ onPCMFrame }: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onPCMFrameRef = useRef(onPCMFrame);
  onPCMFrameRef.current = onPCMFrame;

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

      // Try AudioWorklet first, fallback to MediaRecorder
      if (typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype) {
        const ctx = new AudioContext({ sampleRate: 16000 });
        contextRef.current = ctx;

        await ctx.audioWorklet.addModule('/audio-processor.js');
        const source = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, 'audio-capture');

        workletNode.port.onmessage = (e: MessageEvent<Int16Array>) => {
          onPCMFrameRef.current(e.data);
        };

        source.connect(workletNode);
        workletNode.connect(ctx.destination);
      } else {
        // Fallback: use MediaRecorder and send encoded chunks
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0) {
            const buffer = await e.data.arrayBuffer();
            const int16 = new Int16Array(buffer);
            onPCMFrameRef.current(int16);
          }
        };

        recorder.start(100);
        // Store recorder on stream for cleanup
        (stream as unknown as Record<string, unknown>).__recorder = recorder;
      }

      setIsCapturing(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in your browser settings.');
      } else {
        setError('Could not access microphone. Please check your device.');
      }
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }
    if (streamRef.current) {
      const recorder = (streamRef.current as unknown as Record<string, unknown>).__recorder;
      if (recorder && (recorder as MediaRecorder).state !== 'inactive') {
        (recorder as MediaRecorder).stop();
      }
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (contextRef.current) contextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { startCapture, stopCapture, isCapturing, error };
}
