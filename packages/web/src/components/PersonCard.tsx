import type { Memory } from '../types';
import { Building2, Lightbulb, FolderKanban, Handshake, User, Settings } from 'lucide-react';

interface PersonCardProps {
  memory: Memory;
  onClick: (memory: Memory) => void;
}

const typeIcons: Record<string, typeof User> = {
  person: User,
  company: Building2,
  project: FolderKanban,
  idea: Lightbulb,
  commitment: Handshake,
  preference: Settings,
};

const typeColors: Record<string, string> = {
  person: 'bg-primary/20 text-primary',
  company: 'bg-success/20 text-success',
  project: 'bg-warning/20 text-warning',
  idea: 'bg-[#ec4899]/20 text-[#ec4899]',
  commitment: 'bg-[#06b6d4]/20 text-[#06b6d4]',
  preference: 'bg-text-secondary/20 text-text-secondary',
};

function formatLastMentioned(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function PersonCard({ memory, onClick }: PersonCardProps) {
  const Icon = typeIcons[memory.type] || User;
  const colorClass = typeColors[memory.type] || typeColors.person;

  const initials = memory.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={() => onClick(memory)}
      className="w-full text-left bg-surface rounded-xl p-4 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
        >
          {memory.type === 'person' ? (
            <span className="text-xs font-semibold">{initials}</span>
          ) : (
            <Icon size={18} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text truncate">{memory.name}</h3>
            <span className="text-[10px] text-text-tertiary ml-2 shrink-0">
              {formatLastMentioned(memory.lastMentioned)}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
            {memory.content}
          </p>
        </div>
      </div>
    </button>
  );
}
