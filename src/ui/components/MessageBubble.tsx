import React, { useState, useCallback } from 'react';
import { t } from '@i18n';
import type { Message, DeliveryState } from '@core/models';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  senderName?: string;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
}

function DeliveryIcon({ state }: { state: DeliveryState }) {
  switch (state) {
    case 'sending':
      return (
        <span className="message-status sent" aria-label={t('chat.deliverySent')}>
          ✓
        </span>
      );
    case 'sent':
      return (
        <span className="message-status sent" aria-label={t('chat.deliverySent')}>
          ✓
        </span>
      );
    case 'delivered':
      return (
        <span className="message-status delivered" aria-label={t('chat.deliveryDelivered')}>
          ✓✓
        </span>
      );
    case 'read':
      return (
        <span className="message-status read" aria-label={t('chat.deliveryRead')}>
          ✓✓
        </span>
      );
    case 'failed':
      return (
        <span className="message-status failed" aria-label={t('chat.failedToSend')}>
          ✓✓✗
        </span>
      );
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isOwn,
  showSender,
  senderName,
  onReply,
  onReact,
  onDelete,
  onEdit,
}: MessageBubbleProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleLongPress = useCallback(() => {
    setContextMenu({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
  }, []);

  const closeMenu = useCallback(() => setContextMenu(null), []);

  // Deleted message
  if (message.isDeleted) {
    return (
      <div className={`message-row ${isOwn ? 'sent' : 'received'}`}>
        <div className="message-bubble">
          <div className="message-deleted">{t('chat.deleteLocally')}</div>
        </div>
      </div>
    );
  }

  const reactionEntries = message.reactions ? Array.from(message.reactions.entries()) : [];

  return (
    <>
      <div
        className={`message-row ${isOwn ? 'sent' : 'received'}`}
        onContextMenu={handleContextMenu}
        onTouchStart={() => {
          const timer = setTimeout(handleLongPress, 600);
          const clear = () => clearTimeout(timer);
          document.addEventListener('touchend', clear, { once: true });
          document.addEventListener('touchmove', clear, { once: true });
        }}
        role="article"
        aria-label={`Message from ${senderName || 'unknown'} at ${formatTime(message.createdAt)}`}
      >
        <div className="message-bubble">
          {/* Reply preview */}
          {message.replyTo && (
            <div className="reply-preview">
              <div className="reply-preview-sender">{t('chat.replyShort')}</div>
              <div className="reply-preview-text">{message.replyTo}</div>
            </div>
          )}

          {/* Sender name (groups) */}
          {showSender && senderName && !isOwn && <div className="message-sender">{senderName}</div>}

          {/* Attachments handled by parent via AttachmentView */}

          {/* Message text */}
          <div className="message-text">{message.content}</div>

          {/* Meta row */}
          <div className="message-meta">
            {message.editedAt && <span className="edited-indicator">{t('chat.edited')}</span>}
            <span className="encryption-badge" aria-label={t('security.encrypted')}>
              🔒
            </span>
            <span className="message-time">{formatTime(message.createdAt)}</span>
            {isOwn && <DeliveryIcon state={message.deliveryState} />}
          </div>

          {/* Reactions */}
          {reactionEntries.length > 0 && (
            <div className="message-reactions">
              {reactionEntries.map(([emoji, users]) => (
                <span
                  key={emoji}
                  className={`reaction-chip${users.includes(message.senderPubKey) ? ' active' : ''}`}
                  onClick={() => onReact?.(message.id, emoji)}
                  role="button"
                  aria-label={`${emoji} reaction, ${users.length}`}
                >
                  {emoji}
                  {users.length > 1 && <span className="reaction-count">{users.length}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 29 }} onClick={closeMenu} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div
              className="context-menu-item"
              onClick={() => {
                onReply?.(message.id);
                closeMenu();
              }}
              role="button"
              tabIndex={0}
              aria-label={t('chat.reply')}
            >
              ↩ {t('chat.reply')}
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onReact?.(message.id, '👍');
                closeMenu();
              }}
              role="button"
              tabIndex={0}
              aria-label={t('chat.react')}
            >
              😊 {t('chat.react')}
            </div>
            {isOwn && (
              <div
                className="context-menu-item"
                onClick={() => {
                  onEdit?.(message.id);
                  closeMenu();
                }}
                role="button"
                tabIndex={0}
                aria-label={t('chat.edit')}
              >
                ✏️ {t('chat.edit')}
              </div>
            )}
            <div className="context-menu-divider" />
            <div
              className="context-menu-item"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                closeMenu();
              }}
              role="button"
              tabIndex={0}
              aria-label={t('chat.copy')}
            >
              📋 {t('chat.copy')}
            </div>
            <div className="context-menu-divider" />
            <div
              className="context-menu-item danger"
              onClick={() => {
                onDelete?.(message.id);
                closeMenu();
              }}
              role="button"
              tabIndex={0}
              aria-label={t('chat.delete')}
            >
              🗑️ {t('chat.delete')}
            </div>
          </div>
        </>
      )}
    </>
  );
});

export default MessageBubble;
