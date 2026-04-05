export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  mode: string;
  status: 'active' | 'processing' | 'completed';
  title?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  transcript: TranscriptSegment[];
  summary?: string;
  participants: Participant[];
  keyFacts: string[];
  promises: string[];
  actionItems: ActionItem[];
  whisperCards?: WhisperCard[];
  modeId?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  isFinal?: boolean;
}

export interface Participant {
  name: string;
  role?: string;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

export interface Memory {
  id: string;
  type: 'person' | 'company' | 'project' | 'idea' | 'commitment' | 'preference';
  name: string;
  content: string;
  lastMentioned: string;
  sessionIds: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryStats {
  people: number;
  projects: number;
  commitments: number;
  saves: number;
  total: number;
}

export interface WhisperCard {
  id: string;
  sessionId: string;
  type: 'context' | 'question' | 'commitment' | 'fact_check' | 'nudge' | 'action';
  content: string;
  detail?: string;
  priority?: 'low' | 'medium' | 'high';
  ttl?: number;
  relatedMemoryId?: string;
  createdAt: string;
  helpful?: boolean | null;
}

export interface Action {
  id: string;
  sessionId: string;
  type: 'email' | 'memo' | 'task' | 'message';
  title: string;
  content: string;
  status: 'draft' | 'approved' | 'sent';
  createdAt: string;
}

export interface Digest {
  id: string;
  userId: string;
  date: string;
  streak?: number;
  sessionsToday?: number;
  keyMoments: DigestItem[];
  followUps: DigestItem[];
  opportunities: DigestItem[];
  ideas: DigestItem[];
  commitments?: DigestItem[];
  saves?: DigestItem[];
  streak?: number;
  sessionCount?: number;
}

export interface DigestItem {
  id: string;
  content: string;
  sessionId?: string;
  sessionTitle?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type SessionState = 'idle' | 'recording' | 'processing' | 'completed';

// Angel Modes
export interface AngelMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const ANGEL_MODES: AngelMode[] = [
  { id: 'meeting', name: 'Meeting Angel', icon: '\uD83C\uDFAF', description: 'People context, smart questions, commitment tracking', color: 'blue' },
  { id: 'translator', name: 'Translator Angel', icon: '\uD83C\uDF0D', description: 'Real-time translation during conversations', color: 'emerald' },
  { id: 'think', name: 'Think Angel', icon: '\uD83E\uDDE0', description: 'Solo brainstorm with idea connections', color: 'violet' },
  { id: 'sales', name: 'Sales Angel', icon: '\uD83D\uDCBC', description: 'Objection handling, competitor intel', color: 'amber' },
  { id: 'learning', name: 'Learning Angel', icon: '\uD83D\uDCDA', description: 'Key concepts, flashcards, knowledge building', color: 'pink' },
  { id: 'coach', name: 'Coach Angel', icon: '\uD83D\uDDE3\uFE0F', description: 'Speaking pace, filler words, communication tips', color: 'orange' },
  { id: 'builder', name: 'Builder Angel', icon: '\uD83D\uDD27', description: 'Technical fact checks, decision records', color: 'cyan' },
];

// Memory Stats
export interface MemoryStats {
  people: number;
  projects: number;
  commitments: number;
  saves: number;
  total: number;
}

// Streak / Engagement
export interface Streak {
  current: number;
  longest: number;
  todaySessions: number;
}

// Dashboard Stats
export interface DashboardStats {
  streak: Streak;
  angelSaves: number;
  memoryStats: MemoryStats;
  pendingCommitments: ActionItem[];
}

// User Preferences
export interface UserPreferences {
  whisperFrequency: 'silent' | 'minimal' | 'active' | 'aggressive';
  dailyDigest: boolean;
  digestTime: string;
  defaultMode: string;
  timezone: string;
  autoDeleteDays: number;
}
