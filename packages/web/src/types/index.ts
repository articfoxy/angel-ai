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
  feedback?: 'positive' | 'negative';
  acknowledged?: boolean;
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
  saves?: DigestItem[];
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

export interface Mode {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastSessionDate: string;
}

export interface DashboardStats {
  streak: Streak;
  saves: number;
  memoryStats: MemoryStats;
  pendingCommitments: ActionItem[];
  todaySessions: number;
}

export interface UserPreferences {
  whisperFrequency: 'silent' | 'minimal' | 'active' | 'aggressive';
  dailyDigest: boolean;
  dailyDigestTime?: string;
  defaultModeId?: string;
  timezone: string;
  autoDeleteDays: number;
}
