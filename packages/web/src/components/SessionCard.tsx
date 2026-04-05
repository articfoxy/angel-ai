import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, CheckCircle, Clock, Footprints } from 'lucide-react';
import type { Session } from '../types';

interface SessionCardProps {
  session: Session;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function SessionCard({ session }: SessionCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/session/${session.id}/debrief`)}
      className="w-full text-left bg-surface rounded-xl p-4 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text truncate">
            {session.title || 'Untitled Session'}
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            {formatDate(session.startedAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-text-tertiary ml-2">
          {session.mode === 'walk_and_think' ? (
            <Footprints size={14} />
          ) : (
            <MessageSquare size={14} />
          )}
          <span className="text-[10px] capitalize">
            {session.mode === 'walk_and_think' ? 'Walk' : 'Chat'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDuration(session.duration)}
        </span>
        {session.participants.length > 0 && (
          <span className="flex items-center gap-1">
            <Users size={12} />
            {session.participants.length}
          </span>
        )}
        {session.actionItems.length > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle size={12} />
            {session.actionItems.filter((a) => !a.completed).length} action
            {session.actionItems.filter((a) => !a.completed).length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}
