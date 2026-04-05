import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ANGEL_MODES } from '../components/ModeSelector';
import { api } from '../services/api';
import {
  User,
  Sparkles,
  Shield,
  Info,
  LogOut,
  ChevronRight,
  Clock,
  Bell,
} from 'lucide-react';
import type { UserPreferences } from '../types';

const whisperLevels = [
  { value: 'silent' as const, label: 'Silent', desc: 'No whispers during sessions' },
  { value: 'minimal' as const, label: 'Minimal', desc: 'Only critical insights' },
  { value: 'active' as const, label: 'Active', desc: 'Regular helpful whispers' },
  { value: 'aggressive' as const, label: 'Aggressive', desc: 'Maximum AI assistance' },
];

export function Settings() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>({
    whisperFrequency: 'active',
    dailyDigest: true,
    dailyDigestTime: '08:00',
    defaultModeId: 'meeting',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoDeleteDays: 30,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getPreferences().then(setPrefs).catch(() => {});
  }, []);

  const updatePref = async (update: Partial<UserPreferences>) => {
    const updated = { ...prefs, ...update };
    setPrefs(updated);
    setSaving(true);
    try {
      await api.updatePreferences(update);
    } catch {
      // Demo mode
    } finally {
      setSaving(false);
    }
  };

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

      {/* Whisper Frequency */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">Whisper Frequency</h2>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {whisperLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => updatePref({ whisperFrequency: level.value })}
                className={`py-2.5 px-3 rounded-lg text-left transition-colors ${
                  prefs.whisperFrequency === level.value
                    ? 'bg-primary text-white'
                    : 'bg-bg text-text-secondary hover:bg-surface-hover'
                }`}
              >
                <p className="text-xs font-medium">{level.label}</p>
                <p className={`text-[10px] mt-0.5 ${
                  prefs.whisperFrequency === level.value ? 'text-white/70' : 'text-text-tertiary'
                }`}>
                  {level.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Digest */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">Daily Digest</h2>
        </div>
        <div className="bg-surface rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text">Enable daily digest</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                Get a summary of your day
              </p>
            </div>
            <button
              onClick={() => updatePref({ dailyDigest: !prefs.dailyDigest })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                prefs.dailyDigest ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs.dailyDigest ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {prefs.dailyDigest && (
            <div>
              <label className="text-xs text-text-tertiary">Delivery time</label>
              <input
                type="time"
                value={prefs.dailyDigestTime || '08:00'}
                onChange={(e) => updatePref({ dailyDigestTime: e.target.value })}
                className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Default Mode */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">Default Mode</h2>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {ANGEL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updatePref({ defaultModeId: mode.id })}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors ${
                  prefs.defaultModeId === mode.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-bg hover:bg-surface-hover border border-transparent'
                }`}
              >
                <span className="text-base">{mode.icon}</span>
                <span className="text-xs font-medium text-text">{mode.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text">Timezone</h2>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-sm text-text">{prefs.timezone}</p>
          <p className="text-[10px] text-text-tertiary mt-1">Auto-detected from your browser</p>
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
                onClick={() => updatePref({ autoDeleteDays: days })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  prefs.autoDeleteDays === days
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
            <span className="text-sm text-text-secondary">0.2.0</span>
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

      {saving && (
        <div className="fixed top-4 right-4 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-secondary shadow-lg z-50 animate-fade-in">
          Saving...
        </div>
      )}
    </div>
  );
}
