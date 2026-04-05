import { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TranscriptSegment, WhisperCard, SessionState } from '../types';

interface UseSessionOptions {
  sessionId: string | null;
  token: string | null;
}

interface UseSessionReturn {
  state: SessionState;
  transcript: TranscriptSegment[];
  whisperCards: WhisperCard[];
  duration: number;
  isThinking: boolean;
  connect: () => void;
  disconnect: () => void;
  sendAudioChunk: (chunk: string) => void;
  sendPcmFrame: (frame: Int16Array) => void;
  dismissWhisper: (id: string) => void;
  submitFeedback: (cardId: string, helpful: boolean) => void;
  acknowledgeWhisper: (cardId: string) => void;
  switchMode: (modeId: string) => void;
  startLive: (modeId: string) => void;
  stopLive: () => void;
}

export function useSession({ sessionId, token }: UseSessionOptions): UseSessionReturn {
  const [state, setState] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [whisperCards, setWhisperCards] = useState<WhisperCard[]>([]);
  const [duration, setDuration] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const connect = useCallback(() => {
    if (!sessionId || !token) return;

    const url = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(url, {
      auth: { token },
      query: { sessionId },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    });

    // Legacy transcript update (still supported)
    socket.on('transcript:update', (segment: TranscriptSegment) => {
      setTranscript((prev) => [...prev, { ...segment, isFinal: true }]);
    });

    // New: streaming delta (interim results)
    socket.on('transcript:delta', (delta: TranscriptSegment) => {
      setTranscript((prev) => {
        const existing = prev.findIndex((s) => s.id === delta.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...delta, isFinal: false };
          return updated;
        }
        return [...prev, { ...delta, isFinal: false }];
      });
    });

    // New: final segment
    socket.on('transcript:final', (segment: TranscriptSegment) => {
      setTranscript((prev) => {
        const existing = prev.findIndex((s) => s.id === segment.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...segment, isFinal: true };
          return updated;
        }
        return [...prev, { ...segment, isFinal: true }];
      });
    });

    socket.on('whisper:card', (card: WhisperCard) => {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setWhisperCards((prev) => [...prev, card]);
    });

    socket.on('session:processing', () => {
      setState('processing');
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('session:completed', () => {
      setState('completed');
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('session:live-status', (status: { state: SessionState; duration: number }) => {
      setState(status.state);
      setDuration(status.duration);
    });

    socket.on('inference:thinking', () => {
      setIsThinking(true);
      setTimeout(() => setIsThinking(false), 3000);
    });

    socket.on('disconnect', () => {
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socketRef.current = socket;
  }, [sessionId, token]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setState('idle');
  }, []);

  const sendAudioChunk = useCallback((chunk: string) => {
    socketRef.current?.emit('audio:chunk', { data: chunk });
  }, []);

  const sendPcmFrame = useCallback((frame: Int16Array) => {
    socketRef.current?.emit('audio:chunk', frame.buffer);
  }, []);

  const dismissWhisper = useCallback((id: string) => {
    setWhisperCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const submitFeedback = useCallback((cardId: string, helpful: boolean) => {
    socketRef.current?.emit('whisper:feedback', { cardId, helpful });
    setWhisperCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, feedback: helpful ? 'positive' : 'negative' } : c
      )
    );
  }, []);

  const acknowledgeWhisper = useCallback((cardId: string) => {
    socketRef.current?.emit('whisper:acknowledge', { cardId });
    setWhisperCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, acknowledged: true } : c))
    );
  }, []);

  const switchMode = useCallback((modeId: string) => {
    socketRef.current?.emit('mode:switch', { modeId });
  }, []);

  const startLive = useCallback((modeId: string) => {
    socketRef.current?.emit('session:start-live', { modeId });
  }, []);

  const stopLive = useCallback(() => {
    socketRef.current?.emit('session:stop-live');
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    state,
    transcript,
    whisperCards,
    duration,
    isThinking,
    connect,
    disconnect,
    sendAudioChunk,
    sendPcmFrame,
    dismissWhisper,
    submitFeedback,
    acknowledgeWhisper,
    switchMode,
    startLive,
    stopLive,
  };
}
