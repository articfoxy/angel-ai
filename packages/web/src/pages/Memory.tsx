import { useState, useEffect } from 'react';
import { Search, Loader, Brain, ArrowLeft, X, Clock, Link, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import type { Memory as MemoryType, MemoryStats } from '../types';

const filterTabs = [
  { value: 'all', label: 'All' },
  { value: 'person', label: 'People' },
  { value: 'project', label: 'Projects' },
  { value: 'commitment', label: 'Commitments' },
  { value: 'idea', label: 'Ideas' },
  { value: 'company', label: 'Companies' },
];

const typeIcons: Record<string, string> = {
  person: '👤',
  company: '🏢',
  project: '📋',
  idea: '💡',
  commitment: '✅',
  preference: '⚙️',
};

const typeColors: Record<string, string> = {
  person: 'bg-primary/10 text-primary border-primary/20',
  company: 'bg-success/10 text-success border-success/20',
  project: 'bg-warning/10 text-warning border-warning/20',
  idea: 'bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899]/20',
  commitment: 'bg-success/10 text-success border-success/20',
  preference: 'bg-text-secondary/10 text-text-secondary border-text-secondary/20',
};

function formatLastMentioned(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const demoMemories: MemoryType[] = [
  {
    id: '1',
    type: 'person',
    name: 'Sarah Chen',
    content: 'Q3 budget concerns, vendor evaluation lead. Prefers morning meetings.',
    lastMentioned: new Date(Date.now() - 172800000).toISOString(),
    sessionIds: ['s1', 's2'],
  },
  {
    id: '2',
    type: 'person',
    name: 'Alex Chen',
    content: 'Lead designer working on the mobile app redesign. Prefers async communication.',
    lastMentioned: new Date(Date.now() - 86400000).toISOString(),
    sessionIds: ['s1', 's2'],
  },
  {
    id: '3',
    type: 'project',
    name: 'Q2 Redesign',
    content: 'Major product refresh targeting mobile-first experience. Deadline: June 30.',
    lastMentioned: new Date(Date.now() - 43200000).toISOString(),
    sessionIds: ['s1', 's4'],
  },
  {
    id: '4',
    type: 'commitment',
    name: 'Send proposal to Mike',
    content: 'Committed during Monday standup. Due by end of week.',
    lastMentioned: new Date(Date.now() - 86400000).toISOString(),
    sessionIds: ['s3'],
  },
  {
    id: '5',
    type: 'idea',
    name: 'Cross-team retro format',
    content: 'Try a cross-team retrospective next quarter to share learnings.',
    lastMentioned: new Date(Date.now() - 259200000).toISOString(),
    sessionIds: ['s5'],
  },
];

const demoStats: MemoryStats = {
  people: 47,
  projects: 12,
  commitments: 89,
  saves: 5,
  total: 153,
};

export function Memory() {
  const [memories, setMemories] = useState<MemoryType[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemory, setSelectedMemory] = useState<MemoryType | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    api.getMemoryStats().then(setStats).catch(() => setStats(demoStats));
  }, []);

  useEffect(() => {
    setLoading(true);

    const fetchMemories = search.length >= 2
      ? api.searchMemories(search)
      : api.getMemories(activeFilter, search);

    fetchMemories
      .then(setMemories)
      .catch(() => {
        let filtered = demoMemories;
        if (activeFilter !== 'all') {
          filtered = filtered.filter((m) => m.type === activeFilter);
        }
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              m.content.toLowerCase().includes(q)
          );
        }
        setMemories(filtered);
      })
      .finally(() => setLoading(false));
  }, [activeFilter, search]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (selectedMemory?.id === id) setSelectedMemory(null);
    } catch {
      // Demo mode: remove locally
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (selectedMemory?.id === id) setSelectedMemory(null);
    } finally {
      setDeleting(null);
    }
  };

  // Detail view
  if (selectedMemory) {
    return (
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="sticky top-0 bg-bg/95 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-border">
          <button
            onClick={() => setSelectedMemory(null)}
            className="p-2 -ml-2 text-text-secondary hover:text-text rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold text-text flex-1">{selectedMemory.name}</h1>
          <button
            onClick={() => handleDelete(selectedMemory.id)}
            className="p-2 text-danger/60 hover:text-danger rounded-lg"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div
            className={`inline-flex items-center gap-1.5 border text-xs px-2.5 py-1 rounded-full mb-4 ${
              typeColors[selectedMemory.type] || ''
            }`}
          >
            <span>{typeIcons[selectedMemory.type]}</span>
            <span className="capitalize">{selectedMemory.type}</span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            {selectedMemory.content}
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Clock size={14} />
              <span>
                Last mentioned:{' '}
                {new Date(selectedMemory.lastMentioned).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Link size={14} />
              <span>
                Referenced in {selectedMemory.sessionIds.length} session
                {selectedMemory.sessionIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">
        <h1 className="text-xl font-bold text-text">Memory</h1>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
            <span>👤 {stats.people} people</span>
            <span className="text-border">·</span>
            <span>📋 {stats.projects} projects</span>
            <span className="text-border">·</span>
            <span>✅ {stats.commitments} commitments</span>
            <span className="text-border">·</span>
            <span>✨ {stats.saves} saves</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-5 pb-3 overflow-x-auto">
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory list */}
      <div className="px-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader size={24} className="text-text-tertiary animate-spin-slow" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12">
            <Brain size={32} className="text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">No memories found</p>
            <p className="text-xs text-text-tertiary mt-1">
              Memories are created from your sessions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {memories.map((memory) => (
              <button
                key={memory.id}
                onClick={() => setSelectedMemory(memory)}
                className="w-full text-left bg-surface rounded-xl px-4 py-3 hover:bg-surface-hover transition-colors flex items-start gap-3"
              >
                <span className="text-lg mt-0.5">{typeIcons[memory.type] || '📝'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text truncate">{memory.name}</p>
                    <span className="text-[10px] text-text-tertiary shrink-0">
                      {formatLastMentioned(memory.lastMentioned)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {memory.content}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(memory.id);
                  }}
                  className="p-1.5 text-text-tertiary hover:text-danger shrink-0 rounded-lg hover:bg-danger/10 transition-colors"
                  disabled={deleting === memory.id}
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
