import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { LiveTranscript } from '../components/LiveTranscript';
import { WhisperStack } from '../components/WhisperStack';
import { ModeSelector, getModeById } from '../components/ModeSelector';
import { ModePill } from '../components/ModePill';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { api } from '../services/api';
import { ArrowLeft, Square, Loader } from 'lucide-react';
import type { SessionState } from '../types';

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
  const [mode, setMode] = useState('meeting');
  const [selectedMode, setSelectedMode] = useState<string>('meeting');

  const {
    state,
    transcript,
    whisperCards,
    duration,
    isThinking,
    connect,
    disconnect,
    sendPCMChunk,
    sendAudioChunk,
    dismissWhisper,
    sendWhisperFeedback,
    acknowledgeWhisper,
    startLiveSession,
    stopLiveSession,
    switchMode,
  } = useSession({ sessionId, token });

  const { startCapture, stopCapture, isCapturing, error: audioError } = useAudioCapture({
    onPCMFrame: (frame) => {
      // Convert Int16Array to base64 for the socket
      const bytes = new Uint8Array(frame.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      sendAudioChunk(btoa(binary));
    },
  });

  const handleStartSession = useCallback(async () => {
    try {
      const session = await api.startSession(mode);
      setSessionId(session.id);
      connect();
      startLiveSession(mode);
      await startCapture();
    } catch {
      // Demo mode: simulate recording locally
      setSessionId('demo-session');
      connect();
      await startCapture();
    }
  }, [mode, connect, startLiveSession, startCapture]);

  const handleStopSession = useCallback(async () => {
    stopCapture();
    stopLiveSession();
    disconnect();
    if (sessionId) {
      try {
        await api.endSession(sessionId);
      } catch {
        // Demo mode
      }
      navigate(`/session/${sessionId}/debrief`);
    }
  }, [sessionId, stopCapture, stopLiveSession, disconnect, navigate]);

  const handleModeSwitch = useCallback((newMode: string) => {
    setMode(newMode);
    if (currentState === 'recording') {
      switchMode(newMode);
    }
  }, [state, switchMode]);

  const currentState = state as string;
  const isActive = currentState === 'recording' || currentState === 'processing';

  // Mode selection screen
  if (currentState === 'idle') {
    return (
      <div className="flex-1 flex flex-col pb-24">
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-text-secondary hover:text-text rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-text">New Session</h1>
          </div>
          <p className="text-sm text-text-secondary mb-6">Choose your Angel mode</p>
          <ModeSelector
            selectedMode={selectedMode}
            onSelect={(mode) => setSelectedMode(mode)}
          />
        </div>

        {audioError && (
          <div className="mx-5 mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl">
            <p className="text-xs text-danger">{audioError}</p>
          </div>
        )}

        <div className="flex-1" />

        <div className="px-5 pb-6">
          <button
            onClick={handleStartSession}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
          >
            <span>{getModeById(selectedMode).icon}</span>
            Start {getModeById(selectedMode).name}
          </button>
        </div>
      </div>
    );
  }

  // Processing screen
  if (currentState === 'processing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pb-24">
        <Loader size={32} className="text-primary animate-spin-slow mb-4" />
        <p className="text-text-secondary text-sm">Processing your session...</p>
        <p className="text-text-tertiary text-xs mt-1">This may take a moment</p>
      </div>
    );
  }

  // Live recording screen
  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* Header */}
      {isActive ? (
        <div className="sticky top-0 bg-bg/95 backdrop-blur-sm z-20 px-4 py-3 flex items-center justify-between border-b border-border">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-text-secondary hover:text-text rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <ModePill currentMode={mode} onSwitch={handleModeSwitch} />
          <div className="w-10" />
        </div>
      ) : (
        <div className="px-5 pt-12 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-text-secondary hover:text-text rounded-lg mb-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-text">New Session</h1>
          <p className="text-sm text-text-secondary mt-1">Choose your Angel mode</p>
        </div>
      )}

      {/* Mode selector (only when idle) */}
      {currentState === 'idle' && (
        <div className="px-5 py-4 animate-fade-in">
          <ModeSelector selectedMode={mode} onSelect={setMode} />
        </div>
      )}

      {/* Live recording view */}
      {isActive && (
        <>
          {/* Recording indicator + timer */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
              </span>
              <span className="text-xs font-medium text-danger uppercase tracking-wide">Live</span>
            </div>
            <p className="text-3xl font-mono text-text font-light">
              {formatDuration(duration)}
            </p>
          </div>

          {/* Transcript area */}
          <div className="flex-1 mx-4 bg-surface/50 rounded-xl border border-border overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border/50">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wide font-medium">Live Transcript</span>
            </div>
            <LiveTranscript
              segments={transcript}
              isCapturing={isCapturing}
            />
          </div>

          {/* Thinking indicator */}
          <ThinkingIndicator visible={isThinking} />

          {/* Audio error */}
          {audioError && (
            <div className="mx-4 mt-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              <p className="text-xs text-danger">{audioError}</p>
            </div>
          )}

          {/* Stop button */}
          <div className="px-5 py-4">
            <button
              onClick={handleStopSession}
              disabled={currentState === 'processing'}
              className="w-full flex items-center justify-center gap-2 bg-danger hover:bg-danger/90 disabled:opacity-50 text-white font-medium py-4 rounded-xl transition-colors"
            >
              {currentState === 'processing' ? (
                <Loader size={18} className="animate-spin-slow" />
              ) : (
                <Square size={18} />
              )}
              {currentState === 'processing' ? 'Processing...' : 'Stop Session'}
            </button>
          </div>
        </>
      )}

      {/* Start button (idle state) */}
      {currentState === 'idle' && (
        <div className="px-5 py-4 mt-auto">
          <button
            onClick={handleStartSession}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-4 rounded-xl transition-colors text-base animate-scale-up"
          >
            Start Session
          </button>
        </div>
      )}

      {/* Whisper stack (floating) */}
      <WhisperStack
        cards={whisperCards}
        onDismiss={dismissWhisper}
        onFeedback={sendWhisperFeedback}
        onAcknowledge={acknowledgeWhisper}
      />
    </div>
  );
}
