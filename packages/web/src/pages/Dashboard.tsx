import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Mic,
  Brain,
  Flame,
  Sparkles,
  ChevronRight,
  Loader,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { SessionCard } from '../components/SessionCard';
import { ANGEL_MODES } from '../components/ModeSelector';
import { api } from '../services/api';
import type { Session, ActionItem, DashboardStats } from '../types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const demoStats: DashboardStats = {
  streak: { current: 7, longest: 14, lastSessionDate: new Date().toISOString() },
  saves: 3,
  memoryStats: { people: 47, projects: 12, commitments: 89, saves: 5, total: 153 },
  pendingCommitments: [
    { id: 'c1', text: 'Send proposal to Mike', completed: false, dueDate: new Date(Date.now() + 86400000).toISOString() },
    { id: 'c2', text: 'Review Q3 budget doc', completed: false, dueDate: new Date(Date.now() + 172800000).toISOString() },
  ],
  todaySessions: 0,
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSessions().catch(() => []),
      api.getDashboardStats().catch(() => demoStats),
    ]).then(([sess, stats]) => {
      setSessions(sess as Session[]);
      setDashStats(stats as DashboardStats);
      setLoading(false);
    });
  }, []);

  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.startedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const pendingActions: (ActionItem & { sessionTitle: string })[] = sessions.flatMap(
    (s) =>
      (s.actionItems || [])
        .filter((a) => !a.completed)
        .map((a) => ({ ...a, sessionTitle: s.title || 'Untitled' }))
  );

  const recentSessions = sessions.slice(0, 5);
  const firstName = user?.name?.split(' ')[0] || 'there';
  const streak = dashStats?.streak?.current || 0;
  const saves = dashStats?.saves || 0;
  const memStats = dashStats?.memoryStats;

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Greeting */}
      <div className="px-5 pt-12 pb-4">
        <p className="text-text-secondary text-sm">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-text mt-1">{firstName}</h1>
      </div>

      {/* Streak + Stats Row */}
      <div className="px-5 grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface rounded-xl p-3 text-center">
          <Flame size={18} className="text-orange-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-text">{streak}</p>
          <p className="text-[10px] text-text-secondary">Day Streak</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <Sparkles size={18} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-semibold text-text">{saves}</p>
          <p className="text-[10px] text-text-secondary">Angel Saves</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <Brain size={18} className="text-success mx-auto mb-1" />
          <p className="text-lg font-semibold text-text">
            {memStats ? memStats.people : '--'}
          </p>
          <p className="text-[10px] text-text-secondary">
            {memStats
              ? `${memStats.people} people, ${memStats.projects} projects`
              : 'Memories'}
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <div className="px-5 mb-5">
        <button
          onClick={() => navigate('/session')}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-3 text-base"
        >
          <Mic size={22} />
          Start Session
        </button>
        {/* Mode shortcuts */}
        <div className="flex justify-center gap-4 mt-3">
          {ANGEL_MODES.slice(0, 5).map((mode) => (
            <button
              key={mode.id}
              onClick={() => navigate('/session')}
              className="flex flex-col items-center gap-1 group"
              title={mode.name}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                {mode.icon}
              </span>
              <span className="text-[9px] text-text-tertiary">{mode.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Commitments */}
      {(dashStats?.pendingCommitments?.length || pendingActions.length > 0) && (
        <div className="px-5 mb-5">
          <h2 className="text-sm font-semibold text-text mb-3">Pending Commitments</h2>
          <div className="space-y-2">
            {(dashStats?.pendingCommitments || pendingActions)
              .slice(0, 4)
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-surface rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  {item.completed ? (
                    <CheckCircle size={16} className="text-success shrink-0" />
                  ) : (
                    <Circle size={16} className="text-warning shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{item.text}</p>
                    {item.dueDate && (
                      <p className="text-[10px] text-text-tertiary">
                        Due: {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    )}
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
            <Mic size={32} className="text-text-tertiary mx-auto mb-3" />
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
