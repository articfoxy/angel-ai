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
  TrendingUp,
  CheckCircle,
  Circle,
  FileText,
} from 'lucide-react';
import { SessionCard } from '../components/SessionCard';
import { api } from '../services/api';
import { ANGEL_MODES, type Session, type ActionItem, type DashboardStats, type Streak, type MemoryStats } from '../types';

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
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0, todaySessions: 0 });
  const [angelSaves, setAngelSaves] = useState(0);
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({ people: 0, projects: 0, commitments: 0, saves: 0, total: 0 });
  const [lastMode, setLastMode] = useState('meeting');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sessionsData, statsData] = await Promise.all([
          api.getSessions().catch(() => []),
          api.getDashboardStats().catch(() => null),
        ]);
        setSessions(sessionsData);

        if (statsData) {
          setStreak(statsData.streak);
          setAngelSaves(statsData.angelSaves);
          setMemoryStats(statsData.memoryStats);
        } else {
          // Demo fallback
          setStreak({ current: 7, longest: 14, todaySessions: sessionsData.filter((s: Session) => new Date(s.startedAt).toDateString() === new Date().toDateString()).length });
          setAngelSaves(3);
          setMemoryStats({ people: 47, projects: 12, commitments: 89, saves: 5, total: 153 });
        }

        // Get last used mode from most recent session
        if (sessionsData.length > 0) {
          setLastMode(sessionsData[0].mode || 'meeting');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const pendingActions: (ActionItem & { sessionTitle: string })[] = sessions.flatMap(
    (s) =>
      (s.actionItems || [])
        .filter((a) => !a.completed)
        .map((a) => ({ ...a, sessionTitle: s.title || 'Untitled' }))
  );

  const recentSessions = sessions.slice(0, 5);
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Greeting */}
      <div className="px-5 pt-12 pb-4">
        <p className="text-text-secondary text-sm">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-text mt-1">{firstName}</h1>
      </div>

      {/* Streak + Angel Saves row */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Flame size={20} className="text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-text">{streak.current}</p>
            <p className="text-[10px] text-text-secondary">Day Streak</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-text">{angelSaves}</p>
            <p className="text-[10px] text-text-secondary">Angel Saves</p>
          </div>
        </div>
      </div>

      {/* Memory Growth */}
      <div className="px-5 mb-4">
        <div className="bg-surface rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">Memory Growth</p>
            <p className="text-xs text-text-secondary">
              {memoryStats.people} people &middot; {memoryStats.projects} projects &middot; {memoryStats.commitments} commitments
            </p>
          </div>
          <Brain size={16} className="text-text-tertiary" />
        </div>
      </div>

      {/* Quick Start */}
      <div className="px-5 mb-4">
        <button
          onClick={() => navigate('/session')}
          className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
        >
          <Mic size={20} />
          Start Session
        </button>
        {/* Mode shortcut icons */}
        <div className="flex justify-center gap-3 mt-3">
          {ANGEL_MODES.slice(0, 5).map((mode) => (
            <button
              key={mode.id}
              onClick={() => navigate('/session')}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                lastMode === mode.id
                  ? 'bg-primary/20 ring-1 ring-primary/30'
                  : 'bg-surface hover:bg-surface-hover'
              }`}
              title={mode.name}
            >
              <span className="text-sm">{mode.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Commitments */}
      {pendingActions.length > 0 && (
        <div className="px-5 mb-4">
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

      {/* Quick Actions */}
      <div className="px-5 mb-4">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/digest')}
            className="flex-1 bg-surface border border-border rounded-xl p-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
          >
            <FileText size={18} className="text-text-secondary" />
            <span className="text-sm font-medium text-text">View Digest</span>
          </button>
          <button
            onClick={() => navigate('/memory')}
            className="flex-1 bg-surface border border-border rounded-xl p-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
          >
            <Brain size={18} className="text-text-secondary" />
            <span className="text-sm font-medium text-text">Memory</span>
          </button>
        </div>
      </div>

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
