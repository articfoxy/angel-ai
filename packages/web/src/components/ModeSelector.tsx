import { ANGEL_MODES, type AngelMode } from '../types';

interface ModeSelectorProps {
  selectedMode: string;
  onSelect: (modeId: string) => void;
}

const modeColorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  text: 'text-violet-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' },
  pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    text: 'text-pink-400' },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400' },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400' },
};

export function ModeSelector({ selectedMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ANGEL_MODES.map((mode) => {
        const isActive = selectedMode === mode.id;
        const colors = modeColorClasses[mode.color] || modeColorClasses.blue;

        return (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`rounded-xl p-4 border transition-all duration-200 text-left ${
              isActive
                ? `${colors.bg} ${colors.border} scale-[1.02]`
                : 'bg-surface border-border hover:bg-surface-hover'
            }`}
          >
            <span className="text-2xl block mb-2">{mode.icon}</span>
            <p className={`text-sm font-medium ${isActive ? colors.text : 'text-text'}`}>
              {mode.name.replace(' Angel', '')}
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5 leading-snug">
              {mode.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function getModeById(id: string): AngelMode {
  return ANGEL_MODES.find((m) => m.id === id) || ANGEL_MODES[0];
}
