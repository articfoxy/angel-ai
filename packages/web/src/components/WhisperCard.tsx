import { useEffect, useState } from 'react';
import { Lightbulb, Bell, Info, Sparkles, X, ThumbsUp, ThumbsDown, Search, HelpCircle, CheckCircle, BarChart3, Zap } from 'lucide-react';
import type { WhisperCard as WhisperCardType } from '../types';

interface WhisperCardProps {
  card: WhisperCardType;
  onDismiss: (id: string) => void;
}

const typeIcons: Record<string, typeof Sparkles> = {
  suggestion: Lightbulb,
  reminder: Bell,
  context: Search,
  insight: Sparkles,
  question: HelpCircle,
  commitment: CheckCircle,
  fact_check: BarChart3,
  nudge: Bell,
  action: Zap,
};

const typeColors: Record<string, string> = {
  suggestion: 'border-warning/30 bg-warning/5',
  reminder: 'border-primary/30 bg-primary/5',
  context: 'border-blue-500/30 bg-blue-500/5',
  insight: 'border-success/30 bg-success/5',
  question: 'border-yellow-500/30 bg-yellow-500/5',
  commitment: 'border-green-500/30 bg-green-500/5',
  fact_check: 'border-purple-500/30 bg-purple-500/5',
  nudge: 'border-orange-500/30 bg-orange-500/5',
  action: 'border-cyan-500/30 bg-cyan-500/5',
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
