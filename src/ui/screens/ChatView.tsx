import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@app/Store';
import { MessengerEngine } from '@engine/messenger';
import { InboxSync } from '@engine/inboxSync';
import { t } from '@i18n';
import type { Message, DeliveryState, Contact } from '@models';

interface ChatViewProps {
  conversationId: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function deliveryIcon(state: DeliveryState): string {
  switch (state) {
    case 'sending':
      return '◷';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    case 'failed':
      return '✕';
  }
}

export default function ChatView({ conversationId }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScroll = useRef(true);

  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const navigate = useAppStore((s) => s.navigate);
  const messagesMap = useAppStore((s) => s.messages);
  const contacts = useAppStore((s) => s.contacts);
  const relayPool = useAppStore((s) => s.relayPool);
  const identityPubKey = useAppStore((s) => s.identityPubKey);
  const identityPrivateKey = useAppStore((s) => s.identityPrivateKey);
  const conversations = useAppStore((s) => s.conversations);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const messages: Message[] = useMemo(
    () => messagesMap.get(conversationId) ?? [],
    [messagesMap, conversationId],
  );

  const contact: Contact | undefined = useMemo(
    () => contacts.find((c) => c.pubKey === conversationId),
    [contacts, conversationId],
  );

  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId],
  );

  const displayName =
    contact?.displayName ?? conversation?.displayName ?? conversationId.slice(0, 12) + '…';

  const isVerified = contact?.trust === 'verified';
  const isOnline = connectionStatus === 'connected';

  // Scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll.current && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Track scroll position to disable auto-scroll if user scrolls up
  const handleScroll = () => {
    if (!messageListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!relayPool || !identityPubKey || !identityPrivateKey) {
      setSendError(t('chatView.error.notReady'));
      return;
    }
    if (!isOnline) {
      setSendError(t('chatView.error.offline'));
      return;
    }

    const plaintext = message.trim();
    setMessage('');
    setSendError('');
    setSending(true);

    try {
      // Build a Vault adapter for MessengerEngine
      const vaultAdapter: import('@engine/messenger').Vault = {
        pubKey: identityPubKey,
        encrypt: async (_plain: string, _recipient: string) => {
          return btoa(_plain);
        },
        decrypt: async (_cipher: string, _sender: string) => {
          return atob(_cipher);
        },
        signEvent: async (event) => {
          return {
            kind: (event.kind ?? 14) as number,
            pubkey: identityPubKey,
            content: (event.content ?? '') as string,
            tags: (event.tags ?? []) as string[][],
            created_at: (event.created_at ?? Math.floor(Date.now() / 1000)) as number,
            id: crypto.randomUUID(),
            sig: 'placeholder',
          };
        },
      };

      const inboxSync = new InboxSync();
      const engine = new MessengerEngine(relayPool, vaultAdapter, inboxSync);

      await engine.sendMessage(conversationId, plaintext);
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    } catch {
      setSendError(t('chatView.error.sendFailed'));
    } finally {
      setSending(false);
      if (composerRef.current) {
        composerRef.current.style.height = 'auto';
      }
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
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleBack = () => {
    setActiveConversation(null);
    navigate('/');
  };

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <button
          className="btn btn-icon btn-ghost mobile-back"
          onClick={handleBack}
          aria-label={t('chatView.back')}
        >
          ←
        </button>
        <div className="avatar-sm avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">
            {displayName}
            {isVerified && (
              <span className="shield-verified" style={{ fontSize: 12, marginLeft: 4 }}>
                ✓
              </span>
            )}
            <span className="encryption-badge">🔒 E2EE</span>
          </div>
          <div className="chat-header-status">
            <span className={`connection-dot ${isOnline ? 'connected' : 'offline'}`} />
            <span>{isOnline ? t('chatView.online') : t('chatView.offline')}</span>
          </div>
        </div>
        <button className="btn btn-icon btn-ghost" aria-label={t('chatView.voiceCall')}>
          📞
        </button>
        <button className="btn btn-icon btn-ghost" aria-label={t('chatView.videoCall')}>
          📹
        </button>
        <button className="btn btn-icon btn-ghost" aria-label={t('chatView.moreOptions')}>
          ⋯
        </button>
      </div>

      {/* Messages */}
      <div
        className="message-list"
        ref={messageListRef}
        onScroll={handleScroll}
        role="log"
        aria-label={t('chatView.messages')}
      >
        {/* E2EE banner */}
        <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
          <div
            className="encryption-badge"
            style={{ fontSize: 14, marginBottom: 'var(--space-2)' }}
          >
            🔒 {t('chatView.e2eeBanner')}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {t('chatView.e2eeDescription')}
          </p>
        </div>

        {/* Message bubbles */}
        {messages.map((msg) => {
          const isSent = msg.senderPubKey === identityPubKey;
          return (
            <div key={msg.id} className={`message-row ${isSent ? 'sent' : 'received'}`}>
              <div className="message-bubble">
                {/* Sender name for group chats */}
                {!isSent && conversation?.type === 'group' && (
                  <div className="message-sender">
                    {contacts.find((c) => c.pubKey === msg.senderPubKey)?.displayName ??
                      msg.senderPubKey.slice(0, 8) + '…'}
                  </div>
                )}
                {msg.isDeleted ? (
                  <div className="message-deleted">{t('chatView.messageDeleted')}</div>
                ) : (
                  <>
                    <div className="message-text">{msg.content}</div>
                    <div className="message-meta">
                      <span className="message-time">
                        {formatTime(msg.createdAt)}
                        {msg.editedAt && (
                          <span className="edited-indicator"> {t('chatView.edited')}</span>
                        )}
                      </span>
                      {isSent && (
                        <span className={`message-status ${msg.deliveryState}`}>
                          {deliveryIcon(msg.deliveryState)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty messages state */}
        {messages.length === 0 && (
          <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {t('chatView.startConversation')}
            </p>
          </div>
        )}
      </div>

      {/* Send error */}
      {sendError && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-xs)',
            color: 'var(--error)',
            textAlign: 'center',
          }}
        >
          {sendError}
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span>{t('chatView.typing')}</span>
        </div>
      )}

      {/* Composer */}
      <div className="composer">
        <button className="btn btn-icon btn-ghost" aria-label={t('chatView.attachFile')}>
          📎
        </button>
        <div className="composer-input-wrap">
          <textarea
            ref={composerRef}
            className="composer-input"
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={t('chatView.composePlaceholder')}
            rows={1}
            aria-label={t('chatView.composePlaceholder')}
            disabled={sending}
          />
        </div>
        <button className="btn btn-icon btn-ghost" aria-label={t('chatView.voiceMessage')}>
          🎤
        </button>
        {message.trim() ? (
          <button
            className="btn btn-icon btn-primary"
            onClick={handleSend}
            disabled={sending}
            aria-label={t('chatView.send')}
          >
            {sending ? <div className="spinner" style={{ width: 16, height: 16 }} /> : '➤'}
          </button>
        ) : (
          <button className="btn btn-icon btn-ghost" aria-label={t('chatView.send')} disabled>
            ➤
          </button>
        )}
      </div>
    </div>
  );
}
