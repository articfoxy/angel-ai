import { useState, useCallback, useRef, useEffect } from 'react';
import { WhisperCardNew } from './WhisperCardNew';
import type { WhisperCard } from '../types';

interface WhisperStackProps {
  cards: WhisperCard[];
  onDismiss: (id: string) => void;
  onFeedback: (id: string, helpful: boolean) => void;
  onAcknowledge: (id: string) => void;
}

const MAX_VISIBLE = 3;
const THROTTLE_WINDOW = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MAX = 2;

export function WhisperStack({ cards, onDismiss, onFeedback, onAcknowledge }: WhisperStackProps) {
  const [displayedIds, setDisplayedIds] = useState<Set<string>>(new Set());
  const displayTimesRef = useRef<number[]>([]);

  // Client-side throttle: max 2 per 5 minutes
  const canDisplay = useCallback(() => {
    const now = Date.now();
    const recent = displayTimesRef.current.filter((t) => now - t < THROTTLE_WINDOW);
    displayTimesRef.current = recent;
    return recent.length < THROTTLE_MAX;
  }, []);

  useEffect(() => {
    for (const card of cards) {
      if (!displayedIds.has(card.id) && canDisplay()) {
        setDisplayedIds((prev) => new Set(prev).add(card.id));
        displayTimesRef.current.push(Date.now());
      }
    }
  }, [cards, displayedIds, canDisplay]);

  const visibleCards = cards
    .filter((c) => displayedIds.has(c.id))
    .slice(-MAX_VISIBLE);

  const handleDismiss = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (card?.type === 'commitment') {
      onAcknowledge(id);
    }
    onDismiss(id);
  };

  if (visibleCards.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 space-y-2 pointer-events-none">
      {visibleCards.map((card) => (
        <div key={card.id} className="pointer-events-auto">
          <WhisperCardNew
            card={card}
            onDismiss={handleDismiss}
            onFeedback={onFeedback}
          />
        </div>
      ))}
    </div>
  );
}
