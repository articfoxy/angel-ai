import { useState, useEffect, useRef } from 'react';
import { WhisperCard } from './WhisperCard';
import type { WhisperCard as WhisperCardType } from '../types';

interface WhisperStackProps {
  cards: WhisperCardType[];
  onDismiss: (id: string) => void;
  onFeedback?: (cardId: string, helpful: boolean) => void;
  onAcknowledge?: (cardId: string) => void;
}

const MAX_VISIBLE = 3;
const THROTTLE_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_PER_WINDOW = 2;

export function WhisperStack({ cards, onDismiss, onFeedback, onAcknowledge }: WhisperStackProps) {
  const [visibleCards, setVisibleCards] = useState<WhisperCardType[]>([]);
  const displayTimesRef = useRef<number[]>([]);

  useEffect(() => {
    // Throttle: max 2 cards per 5 minutes
    const now = Date.now();
    displayTimesRef.current = displayTimesRef.current.filter(
      (t) => now - t < THROTTLE_WINDOW
    );

    const newCards = cards.filter(
      (c) => !visibleCards.some((v) => v.id === c.id)
    );

    const toAdd: WhisperCardType[] = [];
    for (const card of newCards) {
      if (displayTimesRef.current.length < MAX_PER_WINDOW) {
        toAdd.push(card);
        displayTimesRef.current.push(now);
      }
    }

    if (toAdd.length > 0) {
      setVisibleCards((prev) => [...prev, ...toAdd].slice(-MAX_VISIBLE));
    }
  }, [cards]);

  const handleDismiss = (id: string) => {
    setVisibleCards((prev) => prev.filter((c) => c.id !== id));
    onDismiss(id);
  };

  if (visibleCards.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 flex flex-col gap-2 md:left-auto md:right-6 md:w-96">
      {visibleCards.map((card) => (
        <WhisperCard
          key={card.id}
          card={card}
          onDismiss={handleDismiss}
          onFeedback={onFeedback}
          onAcknowledge={onAcknowledge}
        />
      ))}
    </div>
  );
}
