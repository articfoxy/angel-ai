import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '../types';

interface LiveTranscriptProps {
  segments: TranscriptSegment[];
  compact?: boolean;
  isCapturing?: boolean;
}

const speakerColors: Record<number, string> = {
  0: 'text-blue-400',
  1: 'text-green-400',
  2: 'text-amber-400',
  3: 'text-pink-400',
  4: 'text-cyan-400',
};

function getSpeakerColor(speaker: string): string {
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return speakerColors[hash % 5] || 'text-blue-400';
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
      <div className={`flex items-center justify-center ${compact ? 'py-8' : 'flex-1'}`}>
        <div className="flex items-center gap-2">
          {isCapturing && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          <p className="text-text-tertiary text-sm">
            {isCapturing ? 'Listening...' : 'Waiting for speech...'}
          </p>
        </div>
      </div>
    );
  }

  const displaySegments = compact ? segments.slice(-3) : segments;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto px-4 py-2 space-y-3 ${compact ? 'max-h-48' : 'flex-1'}`}
    >
      {displaySegments.map((seg, i) => (
        <div key={seg.id || i} className="animate-fade-in">
          <div className="flex items-center gap-2 mb-0.5">
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
                ? 'text-text-tertiary italic'
                : 'text-text/90'
            }`}
          >
            {seg.text}
          </p>
        </div>
      ))}
      {isCapturing && segments.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
        </div>
      )}
    </div>
  );
}
