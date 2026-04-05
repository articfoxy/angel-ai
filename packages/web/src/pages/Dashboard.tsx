import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Mic,
  Brain,
  Zap,
  MessageSquare,
  FileText,
  ChevronRight,
  Loader,
} from 'lucide-react';
import { SessionCard } from '../components/SessionCard';
import { api } from '../services/api';
import type { Session, ActionItem } from '../types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSessions()
      .then(setSessions)
      .catch(() => {
        // Demo mode: show empty state gracefully
      })
      .finally(() => setLoading(false));
  }, []);

  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.startedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const totalActions = sessions.reduce((n, s) => n + s.actionItems.length, 0);
  const pendingActions: (ActionItem & { sessionTitle: string })[] = sessions.flatMap(
    (s) =>
      s.actionItems
        .filter((a) => !a.completed)
        .map((a) => ({ ...a, sessionTitle: s.title || 'Untitled' }))
  );

  const recentSessions = sessions.slice(0, 5);
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Greeting */}
      <div className="px-5 pt-12 pb-6">
        <p className="text-text-secondary text-sm">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-text mt-1">{firstName}</h1>
      </div>

      {/* Stats Row */}
      <div className="px-5 grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-3 text-center">
          <MessageSquare size={18} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-semibold text-text">{todaySessions.length}</p>
          <p className="text-[10px] text-text-secondary">Sessions</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <Zap size={18} className="text-warning mx-auto mb-1" />
          <p className="text-lg font-semibold text-text">{totalActions}</p>
          <p className="text-[10px] text-text-secondary">Actions</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <Brain size={18} className="text-success mx-auto mb-1" />
          <p className="text-lg font-semibold text-text">--</p>
          <p className="text-[10px] text-text-secondary">Memories</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/session')}
            className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3 hover:bg-primary/20 transition-colors"
          >
            <Mic size={20} className="text-primary" />
            <span className="text-sm font-medium text-text">Start Session</span>
          </button>
          <button
            onClick={() => navigate('/digest')}
            className="flex-1 bg-surface border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-surface-hover transition-colors"
          >
            <FileText size={20} className="text-text-secondary" />
            <span className="text-sm font-medium text-text">View Digest</span>
          </button>
        </div>
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="px-5 mb-6">
          <h2 className="text-sm font-semibold text-text mb-3">Action Items</h2>
          <div className="space-y-2">
            {pendingActions.slice(0, 3).map((action) => (
              <div
                key={action.id}
                className="bg-surface rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full border-2 border-primary/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{action.text}</p>
                  <p className="text-[10px] text-text-tertiary">{action.sessionTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text">Recent Sessions</h2>
          {sessions.length > 5 && (
            <button className="text-xs text-primary flex items-center gap-0.5">
              View all <ChevronRight size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader size={24} className="text-text-tertiary animate-spin-slow" />
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={32} className="text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">No sessions yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Start your first session to begin
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
