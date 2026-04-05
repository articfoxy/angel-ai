import { useEffect, useState } from 'react';
import { Lightbulb, Bell, Info, Sparkles, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { WhisperCard as WhisperCardType } from '../types';

interface WhisperCardProps {
  card: WhisperCardType;
  onDismiss: (id: string) => void;
}

const typeIcons = {
  suggestion: Lightbulb,
  reminder: Bell,
  context: Info,
  insight: Sparkles,
};

const typeColors = {
  suggestion: 'border-warning/30 bg-warning/5',
  reminder: 'border-primary/30 bg-primary/5',
  context: 'border-text-secondary/30 bg-text-secondary/5',
  insight: 'border-success/30 bg-success/5',
};

export function WhisperCard({ card, onDismiss }: WhisperCardProps) {
  const [dismissing, setDismissing] = useState(false);
  const Icon = typeIcons[card.type] || Sparkles;
  const colorClass = typeColors[card.type] || typeColors.insight;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissing(true);
      setTimeout(() => onDismiss(card.id), 300);
    }, 10000);
    return () => clearTimeout(timer);
  }, [card.id, onDismiss]);

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss(card.id), 300);
  };

  return (
    <div
      className={`rounded-xl border p-4 backdrop-blur-sm ${colorClass} ${
        dismissing ? 'animate-slide-down' : 'animate-slide-up'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className="text-text-secondary mt-0.5 shrink-0" />
        <p className="text-sm text-text flex-1 leading-relaxed">{card.content}</p>
        <button onClick={handleDismiss} className="text-text-tertiary hover:text-text shrink-0">
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-3 ml-7">
        <button className="flex items-center gap-1 text-xs text-text-tertiary hover:text-success transition-colors px-2 py-1 rounded-lg hover:bg-success/10">
          <ThumbsUp size={12} />
          Helpful
        </button>
        <button className="flex items-center gap-1 text-xs text-text-tertiary hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger/10">
          <ThumbsDown size={12} />
          Not useful
        </button>
      </div>
    </div>
  );
}
