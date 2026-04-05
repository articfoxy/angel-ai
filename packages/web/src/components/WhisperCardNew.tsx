import { useEffect, useState, useRef } from 'react';
import { X, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { WhisperCard as WhisperCardType } from '../types';

interface WhisperCardNewProps {
  card: WhisperCardType;
  onDismiss: (id: string) => void;
  onFeedback: (id: string, helpful: boolean) => void;
}

const typeConfig: Record<string, { icon: string; label: string; borderColor: string; bgColor: string }> = {
  context:    { icon: '\uD83D\uDD0D', label: 'Context',    borderColor: 'border-l-blue-500',   bgColor: 'bg-blue-500/5' },
  question:   { icon: '\u2753',       label: 'Question',   borderColor: 'border-l-yellow-500', bgColor: 'bg-yellow-500/5' },
  commitment: { icon: '\u2705',       label: 'Commitment', borderColor: 'border-l-green-500',  bgColor: 'bg-green-500/5' },
  fact_check: { icon: '\uD83D\uDCCA', label: 'Fact Check', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-500/5' },
  nudge:      { icon: '\uD83D\uDD14', label: 'Nudge',      borderColor: 'border-l-orange-500', bgColor: 'bg-orange-500/5' },
  action:     { icon: '\u26A1',       label: 'Action',     borderColor: 'border-l-cyan-500',   bgColor: 'bg-cyan-500/5' },
};

const priorityRing: Record<string, string> = {
  low: '',
  medium: '',
  high: 'ring-1 ring-amber-500/30',
};

export function WhisperCardNew({ card, onDismiss, onFeedback }: WhisperCardNewProps) {
  const [dismissing, setDismissing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const config = typeConfig[card.type] || typeConfig.context;
  const ttl = card.type === 'commitment' ? 0 : (card.ttl || 10);
  const isPersistent = ttl === 0;

  useEffect(() => {
    if (isPersistent) return;

    const startTime = Date.now();
    const duration = ttl * 1000;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [card.id, ttl, isPersistent]);

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss(card.id), 300);
  };

  // Haptic feedback on mount
  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  // Touch swipe to dismiss
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 80) {
      handleDismiss();
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative rounded-xl border-l-4 ${config.borderColor} ${config.bgColor} bg-zinc-800/90 backdrop-blur-sm overflow-hidden transition-all duration-300 ${
        priorityRing[card.priority || 'medium']
      } ${dismissing ? 'animate-slide-down opacity-0' : 'animate-slide-up'}`}
    >
      {/* Progress bar for auto-dismiss */}
      {!isPersistent && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
          <div
            className="h-full bg-white/20 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <span className="text-base mt-0.5 shrink-0">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text leading-relaxed">
              {card.content.length > 140 && !expanded
                ? card.content.slice(0, 140) + '...'
                : card.content}
            </p>
            {card.detail && expanded && (
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                {card.detail.length > 500 ? card.detail.slice(0, 500) + '...' : card.detail}
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-text-tertiary hover:text-text shrink-0 p-0.5">
            <X size={14} />
          </button>
        </div>

        {/* Expand toggle */}
        {(card.detail || (card.content.length > 140)) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary mt-1.5 ml-7"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? 'Less' : 'More'}
          </button>
        )}

        {/* Feedback */}
        <div className="flex items-center gap-2 mt-2 ml-7">
          <button
            onClick={() => onFeedback(card.id, true)}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${
              card.helpful === true
                ? 'text-green-400 bg-green-500/10'
                : 'text-text-tertiary hover:text-green-400 hover:bg-green-500/10'
            }`}
          >
            <ThumbsUp size={10} />
          </button>
          <button
            onClick={() => onFeedback(card.id, false)}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${
              card.helpful === false
                ? 'text-red-400 bg-red-500/10'
                : 'text-text-tertiary hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <ThumbsDown size={10} />
          </button>
          {isPersistent && (
            <span className="text-[10px] text-green-400/60 ml-auto">Tap to acknowledge</span>
          )}
        </div>
      </div>
    </div>
  );
}
