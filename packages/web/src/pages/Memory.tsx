import { useState, useEffect } from 'react';
import { Search, Loader, Brain, ArrowLeft, X, Clock, Link } from 'lucide-react';
import { PersonCard } from '../components/PersonCard';
import { api } from '../services/api';
import type { Memory as MemoryType } from '../types';

const filterTabs = [
  { value: 'all', label: 'All' },
  { value: 'person', label: 'People' },
  { value: 'company', label: 'Companies' },
  { value: 'project', label: 'Projects' },
  { value: 'idea', label: 'Ideas' },
  { value: 'commitment', label: 'Commitments' },
];

const demoMemories: MemoryType[] = [
  {
    id: '1',
    type: 'person',
    name: 'Alex Chen',
    content: 'Lead designer working on the mobile app redesign. Prefers async communication.',
    lastMentioned: new Date(Date.now() - 86400000).toISOString(),
    sessionIds: ['s1', 's2'],
  },
  {
    id: '2',
    type: 'company',
    name: 'Acme Corp',
    content: 'Potential client for enterprise deal. Main contact is Sarah Johnson.',
    lastMentioned: new Date(Date.now() - 172800000).toISOString(),
    sessionIds: ['s3'],
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
    type: 'idea',
    name: 'AI Meeting Summary',
    content: 'Automatically generate meeting summaries and action items using GPT-4.',
    lastMentioned: new Date(Date.now() - 259200000).toISOString(),
    sessionIds: ['s5'],
  },
  {
    id: '5',
    type: 'commitment',
    name: 'Weekly Check-in',
    content: 'Promised to have weekly 30-min check-ins with design team every Monday.',
    lastMentioned: new Date(Date.now() - 604800000).toISOString(),
    sessionIds: ['s2'],
  },
];

export function Memory() {
  const [memories, setMemories] = useState<MemoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemory, setSelectedMemory] = useState<MemoryType | null>(null);

  useEffect(() => {
    api
      .getMemories(activeFilter, search)
      .then(setMemories)
      .catch(() => {
        // Demo mode
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
          <h1 className="text-base font-semibold text-text">{selectedMemory.name}</h1>
        </div>

        <div className="px-5 py-4">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full mb-4">
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

      {/* Memory grid */}
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
              <PersonCard
                key={memory.id}
                memory={memory}
                onClick={setSelectedMemory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
