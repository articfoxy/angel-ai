import { useEffect, useState, useRef } from 'react';
import {
  Search,
  HelpCircle,
  CheckCircle2,
  BarChart3,
  Bell,
  Zap,
  X,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WhisperCard as WhisperCardType } from '../types';

interface WhisperCardProps {
  card: WhisperCardType;
  onDismiss: (id: string) => void;
  onFeedback?: (cardId: string, helpful: boolean) => void;
  onAcknowledge?: (cardId: string) => void;
}

const typeConfig = {
  context: { icon: Search, color: 'border-l-blue-500', label: 'Context' },
  question: { icon: HelpCircle, color: 'border-l-yellow-500', label: 'Question' },
  commitment: { icon: CheckCircle2, color: 'border-l-green-500', label: 'Commitment' },
  fact_check: { icon: BarChart3, color: 'border-l-purple-500', label: 'Fact Check' },
  nudge: { icon: Bell, color: 'border-l-orange-500', label: 'Nudge' },
  action: { icon: Zap, color: 'border-l-cyan-500', label: 'Action' },
  // Legacy types
  suggestion: { icon: Zap, color: 'border-l-yellow-500', label: 'Suggestion' },
  reminder: { icon: Bell, color: 'border-l-blue-500', label: 'Reminder' },
  insight: { icon: Search, color: 'border-l-green-500', label: 'Insight' },
};

const priorityClasses = {
  low: 'opacity-80',
  medium: '',
  high: 'ring-1 ring-primary/20',
};

export function WhisperCard({ card, onDismiss, onFeedback, onAcknowledge }: WhisperCardProps) {
  const [dismissing, setDismissing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const config = typeConfig[card.type] || typeConfig.context;
  const Icon = config.icon;
  const ttl = card.type === 'commitment' ? null : (card.ttl || 10) * 1000;

  useEffect(() => {
    if (!ttl) return;
    const timer = setTimeout(() => {
      setDismissing(true);
      setTimeout(() => onDismiss(card.id), 300);
    }, ttl);
    return () => clearTimeout(timer);
  }, [card.id, onDismiss, ttl]);

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss(card.id), 300);
  };

  const handleFeedback = (helpful: boolean) => {
    onFeedback?.(card.id, helpful);
  };

  const handleAcknowledge = () => {
    onAcknowledge?.(card.id);
    handleDismiss();
  };

  // Swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startXRef.current;
    if (diff > 80) {
      handleDismiss();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border-l-4 ${config.color} bg-zinc-800/90 backdrop-blur-sm p-4 touch-pan-x ${
        priorityClasses[card.priority || 'medium']
      } ${dismissing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar for auto-dismiss */}
      {ttl && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-xl">
          <div
            className="h-full bg-white/10"
            style={{
              animation: `progress-shrink ${ttl}ms linear forwards`,
            }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Icon size={16} className="text-text-secondary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text leading-relaxed">
            {card.content.length > 140 && !expanded
              ? card.content.slice(0, 140) + '...'
              : card.content}
          </p>
          {card.detail && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-text-tertiary mt-1 hover:text-text-secondary"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Less' : 'More'}
            </button>
          )}
          {expanded && card.detail && (
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              {card.detail}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-tertiary hover:text-text shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Feedback + acknowledge */}
      <div className="flex items-center gap-2 mt-3 ml-7">
        {card.type === 'commitment' && !card.acknowledged && (
          <button
            onClick={handleAcknowledge}
            className="flex items-center gap-1 text-xs text-success hover:text-success/80 transition-colors px-2 py-1 rounded-lg hover:bg-success/10"
          >
            <CheckCircle2 size={12} />
            Got it
          </button>
        )}
        {!card.feedback && (
          <>
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-success transition-colors px-2 py-1 rounded-lg hover:bg-success/10"
            >
              <ThumbsUp size={11} />
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger/10"
            >
              <ThumbsDown size={11} />
            </button>
          </>
        )}
        {card.feedback === 'positive' && (
          <span className="text-[10px] text-success">Thanks!</span>
        )}
        {card.feedback === 'negative' && (
          <span className="text-[10px] text-text-tertiary">Noted</span>
        )}
      </div>
    </div>
  );
}
