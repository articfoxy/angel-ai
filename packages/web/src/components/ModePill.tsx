import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ANGEL_MODES } from '../types';
import { getModeById } from './ModeSelector';

interface ModePillProps {
  currentMode: string;
  onSwitch: (modeId: string) => void;
}

export function ModePill({ currentMode, onSwitch }: ModePillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = getModeById(currentMode);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 transition-colors hover:bg-surface-hover"
      >
        <span className="text-sm">{mode.icon}</span>
        <span className="text-xs font-medium text-text">{mode.name.replace(' Angel', '')}</span>
        <ChevronDown size={12} className={`text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-56 bg-zinc-800 border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
          {ANGEL_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSwitch(m.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                m.id === currentMode
                  ? 'bg-primary/10 text-primary'
                  : 'text-text hover:bg-surface-hover'
              }`}
            >
              <span className="text-base">{m.icon}</span>
              <div>
                <p className="text-xs font-medium">{m.name.replace(' Angel', '')}</p>
                <p className="text-[10px] text-text-tertiary">{m.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
