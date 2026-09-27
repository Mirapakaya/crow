import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@app/Store';

interface ChatViewProps {
  conversationId: string;
}

export default function ChatView({ conversationId: _conversationId }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [isTyping, _setIsTyping] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);

  const handleSend = () => {
    if (!message.trim()) return;
    // TODO: Call messengerEngine.sendMessage(conversationId, message)
    setMessage('');
    if (composerRef.current) {
      composerRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <button
          className="btn btn-icon btn-ghost mobile-back"
          onClick={() => setActiveConversation(null)}
          aria-label="Back to conversations"
        >
          ←
        </button>
        <div className="avatar-sm avatar">?</div>
        <div className="chat-header-info">
          <div className="chat-header-name">
            Encrypted Chat
            <span className="encryption-badge">🔒 E2EE</span>
          </div>
          <div className="chat-header-status">
            <span className="connection-dot connected" />
            <span>Online</span>
          </div>
        </div>
        <button className="btn btn-icon btn-ghost" aria-label="Voice call">📞</button>
        <button className="btn btn-icon btn-ghost" aria-label="Video call">📹</button>
        <button className="btn btn-icon btn-ghost" aria-label="More options">⋯</button>
      </div>

      {/* Messages */}
      <div className="message-list" ref={messageListRef} role="log" aria-label="Messages">
        <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)' }}>
          <div className="encryption-badge" style={{ fontSize: 14, marginBottom: 'var(--space-2)' }}>
            🔒 Messages are end-to-end encrypted
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Start the conversation with a message below.
          </p>
        </div>
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span>typing...</span>
        </div>
      )}

      {/* Composer */}
      <div className="composer">
        <button className="btn btn-icon btn-ghost" aria-label="Attach file">📎</button>
        <div className="composer-input-wrap">
          <textarea
            ref={composerRef}
            className="composer-input"
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            aria-label="Message input"
          />
        </div>
        <button className="btn btn-icon btn-ghost" aria-label="Voice message">🎤</button>
        {message.trim() ? (
          <button className="btn btn-icon btn-primary" onClick={handleSend} aria-label="Send message">
            ➤
          </button>
        ) : (
          <button className="btn btn-icon btn-ghost" aria-label="Send message" disabled>
            ➤
          </button>
        )}
      </div>
    </div>
  );
}
