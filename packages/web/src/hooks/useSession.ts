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
  connect: () => void;
  disconnect: () => void;
  sendAudioChunk: (chunk: string) => void;
  dismissWhisper: (id: string) => void;
}

export function useSession({ sessionId, token }: UseSessionOptions): UseSessionReturn {
  const [state, setState] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [whisperCards, setWhisperCards] = useState<WhisperCard[]>([]);
  const [duration, setDuration] = useState(0);
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

    socket.on('transcript:update', (segment: TranscriptSegment) => {
      setTranscript((prev) => [...prev, segment]);
    });

    socket.on('whisper:card', (card: WhisperCard) => {
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

  const dismissWhisper = useCallback((id: string) => {
    setWhisperCards((prev) => prev.filter((c) => c.id !== id));
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
    connect,
    disconnect,
    sendAudioChunk,
    dismissWhisper,
  };
}
