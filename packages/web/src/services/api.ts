import type {
  AuthResponse,
  Session,
  Memory,
  Action,
  Digest,
  User,
  WhisperCard,
  MemoryStats,
  Streak,
  DashboardStats,
  UserPreferences,
  AngelMode,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('angel_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('angel_token');
    localStorage.removeItem('angel_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }

  const json = await res.json();
  // Server wraps responses in { success, data } — unwrap automatically
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return { user: data.user, token: data.accessToken };
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const data = await request<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return { user: data.user, token: data.accessToken };
  },

  async getProfile(): Promise<User> {
    return request<User>('/api/auth/me');
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    const res = await request<{ sessions: Session[]; total: number } | Session[]>('/api/sessions');
    if (Array.isArray(res)) return res;
    return (res as { sessions: Session[] }).sessions || [];
  },

  getSession(id: string) {
    return request<Session>(`/api/sessions/${id}`);
  },

  startSession(mode: string) {
    return request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  endSession(id: string) {
    return request<Session>(`/api/sessions/${id}/end`, { method: 'POST' });
  },

  // Memory
  getMemories(type?: string, search?: string) {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.set('type', type);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request<Memory[]>(`/api/memory${qs ? `?${qs}` : ''}`);
  },

  getMemory(id: string) {
    return request<Memory>(`/api/memory/${id}`);
  },

  searchMemories(query: string) {
    return request<Memory[]>(`/api/memory?search=${encodeURIComponent(query)}`);
  },

  deleteMemory(id: string) {
    return request<void>(`/api/memory/${id}`, { method: 'DELETE' });
  },

  getMemoryStats() {
    return request<MemoryStats>('/api/memory/stats');
  },

  // Actions
  getActions(sessionId?: string) {
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return request<Action[]>(`/api/actions${qs}`);
  },

  generateAction(sessionId: string, type: string) {
    return request<Action>('/api/actions/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, type }),
    });
  },

  updateAction(id: string, data: Partial<Action>) {
    return request<Action>(`/api/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Digest
  getDigest(date?: string) {
    const qs = date ? `?date=${date}` : '';
    return request<Digest>(`/api/digest${qs}`);
  },

  generateDigest(date: string) {
    return request<Digest>('/api/digest/generate', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  },

  // Modes
  getModes() {
    return request<AngelMode[]>('/api/modes');
  },

  getMode(modeId: string) {
    return request<AngelMode>(`/api/modes/${modeId}`);
  },

  updateModeSettings(modeId: string, settings: Record<string, unknown>) {
    return request<void>(`/api/modes/${modeId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  setDefaultMode(modeId: string) {
    return request<void>('/api/modes/default', {
      method: 'PUT',
      body: JSON.stringify({ modeId }),
    });
  },

  // Whisper Cards
  getSessionWhispers(sessionId: string) {
    return request<WhisperCard[]>(`/api/sessions/${sessionId}/whispers`);
  },

  submitWhisperFeedback(cardId: string, helpful: boolean) {
    return request<void>(`/api/whispers/${cardId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  },

  // Engagement
  getStreak() {
    return request<Streak>('/api/engagement/streak');
  },

  getDashboardStats() {
    return request<DashboardStats>('/api/dashboard/stats');
  },

  // Preferences
  getPreferences() {
    return request<UserPreferences>('/api/preferences');
  },

  updatePreferences(prefs: Partial<UserPreferences>) {
    return request<UserPreferences>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },
};
