import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { RecordButton } from '../components/RecordButton';
import { AudioRecorder } from '../components/AudioRecorder';
import { TranscriptView } from '../components/TranscriptView';
import { WhisperCard } from '../components/WhisperCard';
import { api } from '../services/api';
import { Pause, Square, MessageSquare, Footprints } from 'lucide-react';
import type { SessionState } from '../types';

type SessionMode = 'conversation' | 'walk_and_think';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(h.toString().padStart(2, '0'));
  parts.push(m.toString().padStart(2, '0'));
  parts.push(s.toString().padStart(2, '0'));
  return parts.join(':');
}

export function Session() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<SessionMode>('conversation');

  const {
    state,
    transcript,
    whisperCards,
    duration,
    connect,
    disconnect,
    sendAudioChunk,
    dismissWhisper,
  } = useSession({ sessionId, token });

  const handleToggleRecord = useCallback(async () => {
    if (state === 'idle') {
      try {
        const session = await api.startSession(mode);
        setSessionId(session.id);
        connect();
      } catch {
        // Demo mode: simulate recording locally
        setSessionId('demo-session');
        connect();
      }
    } else if (state === 'recording') {
      disconnect();
      if (sessionId) {
        try {
          await api.endSession(sessionId);
        } catch {
          // Demo mode: navigate directly
        }
        navigate(`/session/${sessionId}/debrief`);
      }
    }
  }, [state, mode, sessionId, connect, disconnect, navigate]);

  const handleEndSession = async () => {
    disconnect();
    if (sessionId) {
      try {
        await api.endSession(sessionId);
      } catch {
        // Demo mode
      }
      navigate(`/session/${sessionId}/debrief`);
    }
  };

  const isActive = state === 'recording' || state === 'processing';

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Top bar */}
      {isActive && (
        <div className="bg-danger/10 border-b border-danger/20 px-4 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-xs text-danger font-medium">
              Recording in progress
            </span>
          </div>
          <button
            onClick={handleEndSession}
            className="flex items-center gap-1.5 text-xs text-danger font-medium px-3 py-1.5 rounded-lg hover:bg-danger/10 transition-colors"
          >
            <Square size={12} />
            End
          </button>
        </div>
      )}

      {/* Mode selector (only when idle) */}
      {state === 'idle' && (
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-xl font-bold text-text mb-4">New Session</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setMode('conversation')}
              className={`flex-1 rounded-xl p-4 border transition-colors ${
                mode === 'conversation'
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-surface border-border'
              }`}
            >
              <MessageSquare
                size={20}
                className={mode === 'conversation' ? 'text-primary' : 'text-text-secondary'}
              />
              <p className="text-sm font-medium text-text mt-2">Conversation</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                Meeting or discussion
              </p>
            </button>
            <button
              onClick={() => setMode('walk_and_think')}
              className={`flex-1 rounded-xl p-4 border transition-colors ${
                mode === 'walk_and_think'
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-surface border-border'
              }`}
            >
              <Footprints
                size={20}
                className={mode === 'walk_and_think' ? 'text-primary' : 'text-text-secondary'}
              />
              <p className="text-sm font-medium text-text mt-2">Walk & Think</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                Solo brainstorming
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Timer + Mode indicator */}
      {isActive && (
        <div className="text-center py-4">
          <p className="text-3xl font-mono text-text font-light">
            {formatDuration(duration)}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {mode === 'conversation' ? (
              <MessageSquare size={12} className="text-text-secondary" />
            ) : (
              <Footprints size={12} className="text-text-secondary" />
            )}
            <span className="text-xs text-text-secondary capitalize">
              {mode === 'walk_and_think' ? 'Walk & Think' : 'Conversation'}
            </span>
          </div>
        </div>
      )}

      {/* Transcript */}
      <TranscriptView segments={transcript} />

      {/* Whisper cards */}
      {whisperCards.length > 0 && (
        <div className="px-4 space-y-2 mb-4">
          {whisperCards.map((card) => (
            <WhisperCard key={card.id} card={card} onDismiss={dismissWhisper} />
          ))}
        </div>
      )}

      {/* Record button */}
      <div className="flex justify-center py-6">
        <RecordButton state={state} onClick={handleToggleRecord} />
      </div>

      {/* Audio recorder (invisible, handles mic) */}
      <AudioRecorder active={state === 'recording'} onChunk={sendAudioChunk} />
    </div>
  );
}
