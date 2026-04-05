import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  User,
  Sparkles,
  Shield,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export function Settings() {
  const { user, logout } = useAuth();
  const [whisperFrequency, setWhisperFrequency] = useState<'low' | 'medium' | 'high'>('medium');
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold text-text">Settings</h1>
      </div>

      {/* Profile */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">Profile</h2>
        </div>
        <div className="bg-surface rounded-xl p-4 space-y-4">
          <div>
            <label className="text-xs text-text-tertiary">Name</label>
            <p className="text-sm text-text mt-0.5">{user?.name || 'Demo User'}</p>
          </div>
          <div>
            <label className="text-xs text-text-tertiary">Email</label>
            <p className="text-sm text-text mt-0.5">
              {user?.email || 'demo@angel.ai'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Preferences */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">AI Preferences</h2>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <label className="text-xs text-text-tertiary">
            Whisper Card Frequency
          </label>
          <div className="flex gap-2 mt-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setWhisperFrequency(level)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                  whisperFrequency === level
                    ? 'bg-primary text-white'
                    : 'bg-bg text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-tertiary mt-2">
            Controls how often AI suggestions appear during sessions
          </p>
        </div>
      </div>

      {/* Privacy */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">Privacy</h2>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <label className="text-xs text-text-tertiary">
            Auto-delete sessions after
          </label>
          <div className="flex gap-2 mt-2">
            {[7, 30, 90, 0].map((days) => (
              <button
                key={days}
                onClick={() => setAutoDeleteDays(days)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  autoDeleteDays === days
                    ? 'bg-primary text-white'
                    : 'bg-bg text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {days === 0 ? 'Never' : `${days}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">About</h2>
        </div>
        <div className="bg-surface rounded-xl divide-y divide-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-text">Version</span>
            <span className="text-sm text-text-secondary">0.1.0 MVP</span>
          </div>
          <button className="w-full px-4 py-3 flex items-center justify-between text-left">
            <span className="text-sm text-text">Privacy Policy</span>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
          <button className="w-full px-4 py-3 flex items-center justify-between text-left">
            <span className="text-sm text-text">Terms of Service</span>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mb-6">
        <button
          onClick={logout}
          className="w-full bg-surface rounded-xl px-4 py-3 flex items-center gap-3 text-danger hover:bg-surface-hover transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
