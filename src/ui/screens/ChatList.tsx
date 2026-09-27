import { useState, useMemo } from 'react';
import { useAppStore } from '@app/Store';
import { formatRelativeTime, t } from '@i18n';
import type { ContactTrust } from '@models';

export default function ChatList() {
  const [search, setSearch] = useState('');
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const conversations = useAppStore((s) => s.conversations);
  const contacts = useAppStore((s) => s.contacts);
  const navigate = useAppStore((s) => s.navigate);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((conv) => {
      const name = conv.displayName?.toLowerCase() ?? '';
      // Also try matching against contact display names
      const contactMatch = conv.participants.some((pk) => {
        const contact = contacts.find((c) => c.pubKey === pk);
        return contact?.displayName.toLowerCase().includes(q);
      });
      return name.includes(q) || contactMatch;
    });
  }, [conversations, contacts, search]);

  const getConnectionLabel = (): string => {
    switch (connectionStatus) {
      case 'connected':
        return t('chatList.connected');
      case 'connecting':
        return t('chatList.connecting');
      case 'degraded':
        return t('chatList.degraded');
      case 'offline':
        return t('chatList.offline');
    }
  };

  const getDisplayName = (conv: (typeof conversations)[number]): string => {
    if (conv.displayName) return conv.displayName;
    // Look up contact name
    const contact = conv.participants
      .map((pk) => contacts.find((c) => c.pubKey === pk))
      .find(Boolean);
    return contact?.displayName ?? conv.id.slice(0, 12) + '…';
  };

  const getTrustBadge = (conv: (typeof conversations)[number]): ContactTrust | null => {
    const contact = conv.participants
      .map((pk) => contacts.find((c) => c.pubKey === pk))
      .find(Boolean);
    return contact?.trust === 'verified' ? 'verified' : null;
  };

  const getLastMessagePreview = (conv: (typeof conversations)[number]): string => {
    const msgs = useAppStore.getState().messages.get(conv.id);
    if (!msgs || msgs.length === 0) return t('chatList.noMessages');
    const last = msgs[msgs.length - 1];
    if (last.isDeleted) return t('chatList.messageDeleted');
    if (last.kind === 'call') return t('chatList.callMessage');
    const preview = last.content.length > 60 ? last.content.slice(0, 60) + '…' : last.content;
    return preview;
  };

  const getLastMessageTime = (conv: (typeof conversations)[number]): string => {
    if (!conv.lastMessageAt) return '';
    return formatRelativeTime(new Date(conv.lastMessageAt));
  };

  return (
    <div className="screen">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span style={{ fontSize: 24 }}>🐦</span>
          <span className="sidebar-brand-name">{t('app.name')}</span>
        </div>
        <div className="connection-indicator">
          <span className={`connection-dot ${connectionStatus}`} />
          <span>{getConnectionLabel()}</span>
        </div>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('chatList.searchPlaceholder')}
          aria-label={t('chatList.searchPlaceholder')}
        />
      </div>

      <div className="chat-list" role="list">
        {filteredConversations.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">{t('chatList.emptyTitle')}</div>
            <div className="empty-state-text">{t('chatList.emptyDescription')}</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => navigate('/addContact')}
            >
              {t('chatList.addContact')}
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const name = getDisplayName(conv);
            const trustBadge = getTrustBadge(conv);
            const preview = getLastMessagePreview(conv);
            const time = getLastMessageTime(conv);

            return (
              <div
                key={conv.id}
                className="chat-list-item"
                role="listitem"
                tabIndex={0}
                onClick={() => {
                  setActiveConversation(conv.id);
                  navigate(`/chatView/${conv.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveConversation(conv.id);
                    navigate(`/chatView/${conv.id}`);
                  }
                }}
              >
                <div className="avatar">{name.charAt(0).toUpperCase()}</div>
                <div className="chat-list-item-content">
                  <div className="chat-list-item-name">
                    {name}
                    {trustBadge === 'verified' && (
                      <span className="shield-verified" style={{ fontSize: 12, marginLeft: 4 }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="chat-list-item-preview">{preview}</div>
                </div>
                <div className="chat-list-item-meta">
                  <span className="chat-list-item-time">{time}</span>
                  {conv.unreadCount > 0 && <span className="unread-badge">{conv.unreadCount}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
