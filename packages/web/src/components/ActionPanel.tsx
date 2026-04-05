import { useState } from 'react';
import { X, Check, Loader } from 'lucide-react';

interface ActionPanelProps {
  title: string;
  content: string;
  loading?: boolean;
  onApprove: (content: string) => void;
  onCancel: () => void;
}

export function ActionPanel({
  title,
  content,
  loading,
  onApprove,
  onCancel,
}: ActionPanelProps) {
  const [editedContent, setEditedContent] = useState(content);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
        <div className="w-full bg-surface rounded-t-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader size={24} className="text-primary animate-spin-slow" />
            <span className="text-text-secondary">Generating {title.toLowerCase()}...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
      <div className="w-full max-h-[85vh] bg-surface rounded-t-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-medium text-text">{title}</h3>
          <button
            onClick={onCancel}
            className="p-2 text-text-secondary hover:text-text rounded-lg hover:bg-surface-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full min-h-[200px] bg-bg border border-border rounded-xl p-4 text-sm text-text leading-relaxed resize-none focus:outline-none focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-text-secondary bg-bg hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onApprove(editedContent)}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
