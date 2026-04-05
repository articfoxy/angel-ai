import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Loader,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import type { Digest as DigestType, DigestItem } from '../types';

function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const demoDigest: DigestType = {
  id: 'demo',
  userId: 'demo',
  date: toDateString(new Date()),
  keyMoments: [
    {
      id: '1',
      content: 'Discussed the new product timeline with engineering team',
      sessionId: 's1',
      sessionTitle: 'Team Standup',
    },
    {
      id: '2',
      content: 'Alex presented the updated design system components',
      sessionId: 's2',
      sessionTitle: 'Design Review',
    },
  ],
  followUps: [
    {
      id: '3',
      content: 'Send updated budget proposal to finance (due Friday)',
      sessionId: 's1',
      sessionTitle: 'Team Standup',
    },
    {
      id: '4',
      content: 'Review and approve the new landing page copy',
      sessionId: 's3',
      sessionTitle: 'Marketing Sync',
    },
  ],
  opportunities: [
    {
      id: '5',
      content: 'Acme Corp mentioned interest in expanding their enterprise plan',
      sessionId: 's4',
      sessionTitle: 'Client Call',
    },
  ],
  ideas: [
    {
      id: '6',
      content: 'Consider adding voice commands for hands-free operation during walks',
      sessionId: 's5',
      sessionTitle: 'Solo Brainstorm',
    },
  ],
};

interface DigestSectionProps {
  title: string;
  icon: typeof Sparkles;
  iconColor: string;
  items: DigestItem[];
  onItemClick: (item: DigestItem) => void;
}

function DigestSection({ title, icon: Icon, iconColor, items, onItemClick }: DigestSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={iconColor} />
        <h2 className="text-sm font-semibold text-text">{title}</h2>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="w-full text-left bg-surface rounded-xl px-4 py-3 hover:bg-surface-hover transition-colors"
          >
            <p className="text-sm text-text leading-relaxed">{item.content}</p>
            {item.sessionTitle && (
              <p className="text-[10px] text-text-tertiary mt-1.5">
                From: {item.sessionTitle}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Digest() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [digest, setDigest] = useState<DigestType | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getDigest(toDateString(currentDate))
      .then(setDigest)
      .catch(() => {
        // Demo: show demo digest for today, null for other days
        const isToday =
          toDateString(currentDate) === toDateString(new Date());
        setDigest(isToday ? demoDigest : null);
      })
      .finally(() => setLoading(false));
  }, [currentDate]);

  const handlePrevDay = () => {
    setCurrentDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  };

  const handleNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (currentDate < tomorrow) {
      setCurrentDate((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        return next;
      });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const d = await api.generateDigest(toDateString(currentDate));
      setDigest(d);
    } catch {
      // Demo mode
      setDigest(demoDigest);
    } finally {
      setGenerating(false);
    }
  };

  const handleItemClick = (item: DigestItem) => {
    if (item.sessionId) {
      navigate(`/session/${item.sessionId}/debrief`);
    }
  };

  const isToday = toDateString(currentDate) === toDateString(new Date());
  const isFuture = currentDate > new Date();

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">
        <h1 className="text-xl font-bold text-text">Daily Digest</h1>
      </div>

      {/* Date navigation */}
      <div className="px-5 py-3 flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="p-2 text-text-secondary hover:text-text rounded-lg hover:bg-surface transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-text">
            {isToday ? 'Today' : formatDate(currentDate)}
          </p>
          {isToday && (
            <p className="text-xs text-text-tertiary">{formatDate(currentDate)}</p>
          )}
        </div>
        <button
          onClick={handleNextDay}
          disabled={isFuture}
          className="p-2 text-text-secondary hover:text-text rounded-lg hover:bg-surface transition-colors disabled:opacity-30 disabled:hover:text-text-secondary"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={24} className="text-text-tertiary animate-spin-slow" />
        </div>
      ) : !digest ? (
        <div className="text-center py-12 px-5">
          <FileText size={40} className="text-text-tertiary mx-auto mb-4" />
          <p className="text-sm text-text-secondary mb-1">No digest yet</p>
          <p className="text-xs text-text-tertiary mb-6">
            Generate a digest to see your day's highlights
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {generating ? (
              <Loader size={16} className="animate-spin-slow" />
            ) : (
              <Sparkles size={16} />
            )}
            Generate Digest
          </button>
        </div>
      ) : (
        <>
          <DigestSection
            title="Key Moments"
            icon={Sparkles}
            iconColor="text-primary"
            items={digest.keyMoments}
            onItemClick={handleItemClick}
          />
          <DigestSection
            title="Follow-ups Due"
            icon={AlertCircle}
            iconColor="text-warning"
            items={digest.followUps}
            onItemClick={handleItemClick}
          />
          <DigestSection
            title="Opportunities Noticed"
            icon={TrendingUp}
            iconColor="text-success"
            items={digest.opportunities}
            onItemClick={handleItemClick}
          />
          <DigestSection
            title="Ideas Worth Developing"
            icon={Lightbulb}
            iconColor="text-[#ec4899]"
            items={digest.ideas}
            onItemClick={handleItemClick}
          />
        </>
      )}
    </div>
  );
}
