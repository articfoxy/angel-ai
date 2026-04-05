import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ANGEL_MODES } from './ModeSelector';
import type { Mode } from '../types';

interface ModePillProps {
  currentModeId: string;
  onSwitch: (modeId: string) => void;
}

export function ModePill({ currentModeId, onSwitch }: ModePillProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMode = ANGEL_MODES.find((m) => m.id === currentModeId) || ANGEL_MODES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover transition-colors"
      >
        <span>{currentMode.icon}</span>
        <span>{currentMode.name}</span>
        <ChevronDown size={12} className={`text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-surface border border-border rounded-xl shadow-lg shadow-black/40 z-50 overflow-hidden animate-scale-up">
          {ANGEL_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onSwitch(mode.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors ${
                mode.id === currentModeId ? 'bg-primary/10' : ''
              }`}
            >
              <span className="text-lg">{mode.icon}</span>
              <div>
                <p className="text-xs font-medium text-text">{mode.name}</p>
                <p className="text-[10px] text-text-tertiary">{mode.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
