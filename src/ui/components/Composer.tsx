import React, { useState, useRef, useCallback, useEffect } from 'react';
import { t } from '@i18n';

interface ComposerProps {
  onSend: (text: string) => void;
  onAttach?: () => void;
  onVoice?: () => void;
  isSending?: boolean;
  placeholder?: string;
}

export default function Composer({
  onSend,
  onAttach,
  onVoice,
  isSending = false,
  placeholder,
}: ComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const broadcastTyping = useCallback(() => {
    // Debounced typing indicator broadcast
    if (!isTyping) {
      setIsTyping(true);
      // TODO: Call messengerEngine.sendTypingIndicator(conversationId)
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }, [isTyping]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setText('');
    setIsTyping(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isSending, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      broadcastTyping();

      // Auto-resize up to max
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    },
    [broadcastTyping],
  );

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <div className="composer" role="form" aria-label="Message composer">
      {onAttach && (
        <button
          className="btn btn-icon btn-ghost"
          onClick={onAttach}
          aria-label={t('chat.attach')}
          disabled={isSending}
        >
          📎
        </button>
      )}

      <div className="composer-input-wrap">
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('chat.typeMessage')}
          rows={1}
          disabled={isSending}
          aria-label={t('chat.typeMessage')}
        />
      </div>

      {onVoice && !canSend && (
        <button
          className="btn btn-icon btn-ghost"
          onClick={onVoice}
          aria-label={t('chat.voice')}
          disabled={isSending}
        >
          🎤
        </button>
      )}

      {canSend ? (
        <button
          className="btn btn-icon btn-primary"
          onClick={handleSend}
          aria-label={t('accessibility.sendMessage')}
        >
          ➤
        </button>
      ) : (
        <button
          className="btn btn-icon btn-ghost"
          disabled
          aria-label={t('accessibility.sendMessage')}
        >
          ➤
        </button>
      )}
    </div>
  );
}
