import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Circle,
  FileText,
  Mail,
  ClipboardList,
  Loader,
  Sparkles,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { ActionPanel } from '../components/ActionPanel';
import { WhisperCardNew } from '../components/WhisperCardNew';
import { getModeById } from '../components/ModeSelector';
import type { Session, Action, WhisperCard } from '../types';

export function SessionDebrief() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [whispers, setWhispers] = useState<WhisperCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPanel, setActionPanel] = useState<{
    type: string;
    title: string;
  } | null>(null);
  const [generatedAction, setGeneratedAction] = useState<Action | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [s, w] = await Promise.all([
          api.getSession(id),
          api.getSessionWhispers(id).catch(() => []),
        ]);
        setSession(s);
        setWhispers(w);
      } catch {
        // Demo: show placeholder data
        setSession({
          id: id,
          userId: 'demo',
          mode: 'meeting',
          status: 'completed',
          title: 'Demo Session',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          duration: 1200,
          transcript: [
            { id: '1', speaker: 'Speaker 1', text: 'We need to finalize the Q3 budget before Friday.', timestamp: 30 },
            { id: '2', speaker: 'Speaker 2', text: 'I agree. Let me pull the numbers from finance.', timestamp: 45 },
            { id: '3', speaker: 'Speaker 1', text: 'Also, Sarah mentioned concerns about the vendor evaluation.', timestamp: 90 },
          ],
          summary:
            'Discussed project timeline for Q2, design direction, and budget approval process. Key decisions were made about vendor evaluation and team scheduling.',
          participants: [
            { name: 'You', role: 'Host' },
            { name: 'Alex Chen', role: 'Designer' },
          ],
          keyFacts: [
            'Discussed project timeline for Q2',
            'Agreed on new design direction',
            'Budget approval needed from finance team',
          ],
          promises: [
            'Send updated mockups by Friday',
            'Schedule follow-up with engineering',
          ],
          actionItems: [
            { id: '1', text: 'Send updated project timeline to the team', completed: false, assignee: 'You' },
            { id: '2', text: 'Review design mockups', completed: false, assignee: 'Alex' },
            { id: '3', text: 'Book meeting room for next Wednesday', completed: true, assignee: 'You' },
          ],
        });
        setWhispers([
          { id: 'w1', sessionId: id, type: 'context', content: 'Last met Alex 2 weeks ago — discussed mobile redesign progress', createdAt: new Date().toISOString(), helpful: true },
          { id: 'w2', sessionId: id, type: 'commitment', content: 'You promised to send mockups by Friday', createdAt: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleToggleAction = (actionId: string) => {
    if (!session) return;
    setSession({
      ...session,
      actionItems: session.actionItems.map((a) =>
        a.id === actionId ? { ...a, completed: !a.completed } : a
      ),
    });
  };

  const handleGenerate = async (type: string, title: string) => {
    setActionPanel({ type, title });
    setGenerating(true);
    try {
      const action = await api.generateAction(id!, type);
      setGeneratedAction(action);
    } catch {
      setGeneratedAction({
        id: 'demo-action',
        sessionId: id!,
        type: type as Action['type'],
        title,
        content:
          type === 'email'
            ? `Hi team,\n\nFollowing our discussion today, here's a summary of what we covered:\n\n${session?.keyFacts?.map((f) => `- ${f}`).join('\n') || '- Key topics discussed'}\n\nAction items:\n${session?.actionItems?.map((a) => `- ${a.text} (${a.assignee || 'TBD'})`).join('\n') || '- Follow up on discussed items'}\n\nBest regards`
            : type === 'memo'
              ? `MEETING MEMO\nDate: ${new Date().toLocaleDateString()}\n\nSummary:\n${session?.summary || 'Session summary here'}\n\nKey Decisions:\n${session?.keyFacts?.map((f) => `- ${f}`).join('\n') || '- Decisions noted'}\n\nCommitments:\n${session?.promises?.map((p) => `- ${p}`).join('\n') || '- Commitments noted'}`
              : `Tasks from session:\n${session?.actionItems?.map((a) => `[ ] ${a.text} — ${a.assignee || 'Unassigned'}`).join('\n') || '- Tasks noted'}`,
        status: 'draft',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (content: string) => {
    if (generatedAction) {
      try {
        await api.updateAction(generatedAction.id, { content, status: 'approved' });
      } catch {
        // Demo mode
      }
    }
    setActionPanel(null);
    setGeneratedAction(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader size={24} className="text-text-tertiary animate-spin-slow" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Session not found</p>
      </div>
    );
  }

  const modeInfo = getModeById(session.mode);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-bg/95 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-text-secondary hover:text-text rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-text">
            {session.title || 'Session Debrief'}
          </h1>
          <p className="text-xs text-text-tertiary">
            {new Date(session.startedAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        {/* Mode badge */}
        <span className="flex items-center gap-1 bg-surface rounded-full px-2.5 py-1 text-xs">
          <span>{modeInfo.icon}</span>
          <span className="text-text-secondary">{modeInfo.name.replace(' Angel', '')}</span>
        </span>
      </div>

      {/* Summary */}
      {session.summary && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-primary" />
            <h2 className="text-sm font-semibold text-text">Summary</h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {session.summary}
          </p>
        </div>
      )}

      {/* Participants */}
      {session.participants.length > 0 && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-text-secondary" />
            <h2 className="text-sm font-semibold text-text">Participants</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            {session.participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {p.name.split(' ').map((w) => w[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-text">{p.name}</p>
                  {p.role && <p className="text-[10px] text-text-tertiary">{p.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Facts */}
      {session.keyFacts.length > 0 && (
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-3">Key Facts</h2>
          <ul className="space-y-2">
            {session.keyFacts.map((fact, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-sm text-text-secondary">{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Commitments / Promises */}
      {session.promises.length > 0 && (
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-3">Commitments</h2>
          <ul className="space-y-2">
            {session.promises.map((promise, i) => (
              <li
                key={i}
                className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-text-secondary flex items-start gap-2"
              >
                <span className="text-green-400 mt-0.5">&#x2705;</span>
                <span>{promise}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {session.actionItems.length > 0 && (
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-3">Action Items</h2>
          <div className="space-y-2">
            {session.actionItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleToggleAction(item.id)}
                className="w-full flex items-start gap-3 bg-surface rounded-xl px-4 py-3 text-left"
              >
                {item.completed ? (
                  <CheckCircle size={18} className="text-success mt-0.5 shrink-0" />
                ) : (
                  <Circle size={18} className="text-text-tertiary mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${item.completed ? 'text-text-tertiary line-through' : 'text-text'}`}>
                    {item.text}
                  </p>
                  {item.assignee && (
                    <p className="text-[10px] text-text-tertiary mt-0.5">{item.assignee}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Whisper Cards Review */}
      {whispers.length > 0 && (
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-3">Angel Whispers</h2>
          <div className="space-y-2">
            {whispers.map((card) => (
              <WhisperCardNew
                key={card.id}
                card={{ ...card, ttl: 0 }}
                onDismiss={() => {}}
                onFeedback={(cardId, helpful) => {
                  api.submitWhisperFeedback(cardId, helpful).catch(() => {});
                  setWhispers((prev) =>
                    prev.map((w) => (w.id === cardId ? { ...w, helpful } : w))
                  );
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full Transcript */}
      {session.transcript.length > 0 && (
        <div className="px-5 py-4">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 mb-3"
          >
            <MessageSquare size={14} className="text-text-secondary" />
            <h2 className="text-sm font-semibold text-text">Full Transcript</h2>
            <span className="text-xs text-text-tertiary">
              ({session.transcript.length} segments)
            </span>
          </button>
          {showTranscript && (
            <div className="bg-surface rounded-xl p-4 space-y-3 animate-fade-in">
              {session.transcript.map((seg, i) => (
                <div key={seg.id || i}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-primary">{seg.speaker}</span>
                    <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                      <Clock size={8} />
                      {Math.floor(seg.timestamp / 60)}:{(Math.floor(seg.timestamp % 60)).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-sm text-text/90 leading-relaxed">{seg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Actions */}
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-text mb-3">Generate</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleGenerate('email', 'Draft Email')}
            className="bg-surface rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-surface-hover transition-colors"
          >
            <Mail size={20} className="text-primary" />
            <span className="text-xs text-text-secondary">Email</span>
          </button>
          <button
            onClick={() => handleGenerate('memo', 'Meeting Memo')}
            className="bg-surface rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-surface-hover transition-colors"
          >
            <FileText size={20} className="text-warning" />
            <span className="text-xs text-text-secondary">Memo</span>
          </button>
          <button
            onClick={() => handleGenerate('task', 'Create Tasks')}
            className="bg-surface rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-surface-hover transition-colors"
          >
            <ClipboardList size={20} className="text-success" />
            <span className="text-xs text-text-secondary">Tasks</span>
          </button>
        </div>
      </div>

      {/* Action Panel */}
      {actionPanel && (
        <ActionPanel
          title={actionPanel.title}
          content={generatedAction?.content || ''}
          loading={generating}
          onApprove={handleApprove}
          onCancel={() => {
            setActionPanel(null);
            setGeneratedAction(null);
          }}
        />
      )}
    </div>
  );
}
