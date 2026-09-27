import { useCallback } from 'react';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👎'] as const;

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
}

export default function EmojiPicker({ onSelect, onDismiss }: EmojiPickerProps) {
  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      onDismiss();
    },
    [onSelect, onDismiss],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 28 }}
        onClick={onDismiss}
        aria-hidden="true"
      />
      <div
        className="context-menu"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-1)',
          padding: 'var(--space-2)',
          minWidth: 180,
          zIndex: 31,
        }}
        role="listbox"
        aria-label="Reaction emojis"
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="btn btn-ghost"
            style={{
              fontSize: 22,
              padding: 'var(--space-2)',
              minHeight: 'auto',
              minWidth: 'auto',
            }}
            onClick={() => handleSelect(emoji)}
            role="option"
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
