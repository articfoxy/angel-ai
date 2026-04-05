import type { Mode } from '../types';

interface ModeSelectorProps {
  selectedModeId: string;
  onSelect: (mode: Mode) => void;
}

export const ANGEL_MODES: Mode[] = [
  {
    id: 'meeting',
    name: 'Meeting Angel',
    icon: '🎯',
    description: 'People context, smart questions, commitment tracking',
    color: 'blue',
  },
  {
    id: 'translator',
    name: 'Translator Angel',
    icon: '🌍',
    description: 'Real-time translation during conversations',
    color: 'emerald',
  },
  {
    id: 'think',
    name: 'Think Angel',
    icon: '🧠',
    description: 'Solo brainstorm with idea connections',
    color: 'violet',
  },
  {
    id: 'sales',
    name: 'Sales Angel',
    icon: '💼',
    description: 'Objection handling, competitor intel',
    color: 'amber',
  },
  {
    id: 'learning',
    name: 'Learning Angel',
    icon: '📚',
    description: 'Key concepts, flashcards, knowledge building',
    color: 'rose',
  },
  {
    id: 'coach',
    name: 'Coach Angel',
    icon: '🗣️',
    description: 'Speaking pace, filler words, communication tips',
    color: 'orange',
  },
  {
    id: 'builder',
    name: 'Builder Angel',
    icon: '🔧',
    description: 'Technical fact checks, decision records',
    color: 'cyan',
  },
];

const modeColorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
};

export function ModeSelector({ selectedModeId, onSelect }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ANGEL_MODES.map((mode) => {
        const isSelected = selectedModeId === mode.id;
        const colors = modeColorClasses[mode.color] || modeColorClasses.blue;

        return (
          <button
            key={mode.id}
            onClick={() => onSelect(mode)}
            className={`rounded-xl p-4 border transition-all animate-scale-up text-left ${
              isSelected
                ? `${colors.bg} ${colors.border}`
                : 'bg-surface border-border hover:bg-surface-hover'
            }`}
          >
            <span className="text-2xl">{mode.icon}</span>
            <p className={`text-sm font-medium mt-2 ${isSelected ? colors.text : 'text-text'}`}>
              {mode.name}
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5 leading-relaxed">
              {mode.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
