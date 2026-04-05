import { Mic, Loader } from 'lucide-react';
import type { SessionState } from '../types';

interface RecordButtonProps {
  state: SessionState;
  onClick: () => void;
  size?: number;
}

export function RecordButton({ state, onClick, size = 80 }: RecordButtonProps) {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Pulse ring when recording */}
      {isRecording && (
        <>
          <span
            className="absolute rounded-full bg-danger animate-pulse-ring"
            style={{ width: size, height: size }}
          />
          <span
            className="absolute rounded-full bg-danger animate-pulse-ring"
            style={{
              width: size,
              height: size,
              animationDelay: '0.5s',
            }}
          />
        </>
      )}

      {/* Main button */}
      <span
        className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-300 ${
          isRecording
            ? 'bg-danger shadow-lg shadow-danger/40'
            : isProcessing
              ? 'bg-surface-hover'
              : 'bg-primary shadow-lg shadow-primary/30 hover:bg-primary-hover'
        }`}
        style={{ width: size, height: size }}
      >
        {isProcessing ? (
          <Loader size={size * 0.35} className="text-text-secondary animate-spin-slow" />
        ) : (
          <Mic size={size * 0.35} className="text-white" />
        )}
      </span>
    </button>
  );
}
