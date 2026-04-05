export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  mode: 'conversation' | 'walk_and_think';
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
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
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

export interface WhisperCard {
  id: string;
  sessionId: string;
  type: 'suggestion' | 'reminder' | 'context' | 'insight';
  content: string;
  relatedMemoryId?: string;
  createdAt: string;
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
  keyMoments: DigestItem[];
  followUps: DigestItem[];
  opportunities: DigestItem[];
  ideas: DigestItem[];
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
