import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { LiveTranscript } from '../components/LiveTranscript';
import { WhisperStack } from '../components/WhisperStack';
import { ModeSelector, ANGEL_MODES } from '../components/ModeSelector';
import { ModePill } from '../components/ModePill';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { api } from '../services/api';
import { ArrowLeft, Square, Loader } from 'lucide-react';
import type { Mode } from '../types';

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
  const [selectedMode, setSelectedMode] = useState<Mode>(ANGEL_MODES[0]);

  const {
    state,
    transcript,
    whisperCards,
    duration,
    isThinking,
    connect,
    disconnect,
    sendPcmFrame,
    dismissWhisper,
    submitFeedback,
    acknowledgeWhisper,
    switchMode,
    startLive,
  } = useSession({ sessionId, token });

  const { startCapture, stopCapture, isCapturing, error: audioError } = useAudioCapture({
    onPcmFrame: (frame) => {
      sendPcmFrame(frame);
    },
  });

  const handleStartSession = useCallback(async () => {
    try {
      const session = await api.startSession(selectedMode.id);
      setSessionId(session.id);
      connect();
      startLive(selectedMode.id);
      await startCapture();
    } catch {
      // Demo mode
      setSessionId('demo-session');
      connect();
      await startCapture();
    }
  }, [selectedMode, connect, startLive, startCapture]);

  const handleStopSession = useCallback(async () => {
    stopCapture();
    disconnect();
    if (sessionId) {
      try {
        await api.endSession(sessionId);
      } catch {
        // Demo mode
      }
      navigate(`/session/${sessionId}/debrief`);
    }
  }, [sessionId, stopCapture, disconnect, navigate]);

  const handleModeSwitch = useCallback(
    (modeId: string) => {
      const mode = ANGEL_MODES.find((m) => m.id === modeId);
      if (mode) {
        setSelectedMode(mode);
        switchMode(modeId);
      }
    },
    [switchMode]
  );

  const isActive = state === 'recording' || state === 'processing';

  // Mode selection screen
  if (state === 'idle') {
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
            selectedModeId={selectedMode.id}
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
            <span>{selectedMode.icon}</span>
            Start {selectedMode.name}
          </button>
        </div>
      </div>
    );
  }

  // Processing screen
  if (state === 'processing') {
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
    <div className="flex-1 flex flex-col pb-24">
      {/* Top bar */}
      <div className="bg-bg/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-text-secondary hover:text-text"
        >
          <ArrowLeft size={18} />
        </button>
        <ModePill currentModeId={selectedMode.id} onSwitch={handleModeSwitch} />
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Recording indicator + timer */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          <span className="text-xs text-danger font-medium">LIVE</span>
        </div>
        <p className="text-3xl font-mono text-text font-light">
          {formatDuration(duration)}
        </p>
      </div>

      {/* Transcript */}
      <div className="flex-1 bg-surface/30 rounded-xl mx-4 overflow-hidden flex flex-col">
        <LiveTranscript
          segments={transcript}
          isCapturing={isCapturing}
        />
      </div>

      {/* Thinking indicator */}
      <ThinkingIndicator visible={isThinking} />

      {/* Stop button */}
      <div className="px-5 py-4">
        <button
          onClick={handleStopSession}
          className="w-full bg-danger/10 border border-danger/20 text-danger font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Square size={16} />
          Stop Session
        </button>
      </div>

      {/* Whisper card stack */}
      <WhisperStack
        cards={whisperCards}
        onDismiss={dismissWhisper}
        onFeedback={submitFeedback}
        onAcknowledge={acknowledgeWhisper}
      />
    </div>
  );
}
