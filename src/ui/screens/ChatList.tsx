import { useState } from 'react';
import { useAppStore } from '@app/Store';

interface ChatListItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isVerified: boolean;
}

// Placeholder data — real data comes from vault repo
const PLACEHOLDER_CHATS: ChatListItem[] = [];

export default function ChatList() {
  const [search, setSearch] = useState('');
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  return (
    <div className="screen">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span style={{ fontSize: 24 }}>🐦</span>
          <span className="sidebar-brand-name">Crow</span>
        </div>
        <div className="connection-indicator">
          <span className={`connection-dot ${connectionStatus}`} />
          <span>{connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}</span>
        </div>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
      </div>

      <div className="chat-list" role="list">
        {PLACEHOLDER_CHATS.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No conversations yet</div>
            <div className="empty-state-text">Add a contact to start a private encrypted conversation</div>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
              Add Contact
            </button>
          </div>
        ) : (
          PLACEHOLDER_CHATS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).map((chat) => (
            <div
              key={chat.id}
              className="chat-list-item"
              role="listitem"
              tabIndex={0}
              onClick={() => setActiveConversation(chat.id)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveConversation(chat.id)}
            >
              <div className="avatar">{chat.name.charAt(0).toUpperCase()}</div>
              <div className="chat-list-item-content">
                <div className="chat-list-item-name">
                  {chat.name}
                  {chat.isVerified && <span className="shield-verified" style={{ fontSize: 12, marginLeft: 4 }}>✓</span>}
                </div>
                <div className="chat-list-item-preview">{chat.lastMessage}</div>
              </div>
              <div className="chat-list-item-meta">
                <span className="chat-list-item-time">{chat.time}</span>
                {chat.unreadCount > 0 && <span className="unread-badge">{chat.unreadCount}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
