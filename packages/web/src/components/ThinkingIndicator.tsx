interface ThinkingIndicatorProps {
  visible: boolean;
}

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-thinking-pulse"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-thinking-pulse"
          style={{ animationDelay: '200ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-thinking-pulse"
          style={{ animationDelay: '400ms' }}
        />
      </div>
      <span className="text-[10px] text-text-tertiary">Angel is thinking...</span>
    </div>
  );
}
