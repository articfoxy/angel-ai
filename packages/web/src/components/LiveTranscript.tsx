import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '../types';

interface LiveTranscriptProps {
  segments: TranscriptSegment[];
  compact?: boolean;
  isCapturing?: boolean;
}

const speakerColors: Record<number, string> = {
  0: 'text-primary',
  1: 'text-success',
  2: 'text-warning',
  3: 'text-[#ec4899]',
  4: 'text-[#06b6d4]',
};

function getSpeakerColor(speaker: string): string {
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return speakerColors[hash % 5] || 'text-primary';
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LiveTranscript({ segments, compact, isCapturing }: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments]);

  if (segments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {isCapturing && (
            <div className="flex items-center justify-center gap-1 mb-3">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-xs text-text-tertiary">Listening...</span>
            </div>
          )}
          <p className="text-text-tertiary text-sm">Waiting for speech...</p>
        </div>
      </div>
    );
  }

  if (compact) {
    const last = segments[segments.length - 1];
    return (
      <div className="px-4 py-2">
        <div className="flex items-center gap-2">
          {isCapturing && (
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse shrink-0" />
          )}
          <span className={`text-xs font-medium ${getSpeakerColor(last.speaker)}`}>
            {last.speaker}
          </span>
        </div>
        <p
          className={`text-sm leading-relaxed mt-1 ${
            last.isFinal === false ? 'text-text-secondary italic' : 'text-text/90'
          }`}
        >
          {last.text}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
      {segments.map((seg, i) => (
        <div key={seg.id || i} className="animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${getSpeakerColor(seg.speaker)}`}>
              {seg.speaker}
            </span>
            <span className="text-[10px] text-text-tertiary">
              {formatTimestamp(seg.timestamp)}
            </span>
          </div>
          <p
            className={`text-sm leading-relaxed ${
              seg.isFinal === false
                ? 'text-text-secondary italic'
                : 'text-text/90'
            }`}
          >
            {seg.text}
          </p>
        </div>
      ))}
    </div>
  );
}
