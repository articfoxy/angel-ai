import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '../types';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
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

export function TranscriptView({ segments }: TranscriptViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments]);

  if (segments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-tertiary text-sm">Waiting for speech...</p>
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
          <p className="text-sm text-text/90 leading-relaxed">{seg.text}</p>
        </div>
      ))}
    </div>
  );
}
