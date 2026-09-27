import React, { useState, useMemo, useCallback } from 'react';
import { t } from '@i18n';
import { useAppStore } from '@app/Store';
import type { Contact } from '@core/models';

interface ContactsProps {
  onSelectContact?: (pubKey: string) => void;
  onAddContact?: () => void;
}

// Placeholder — real data from vault repo
const PLACEHOLDER_CONTACTS: Contact[] = [];

const ContactItem = React.memo(function ContactItem({
  contact,
  onSelect,
}: {
  contact: Contact;
  onSelect: (pubKey: string) => void;
}) {
  const lastActive = contact.lastActiveAt
    ? new Date(contact.lastActiveAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="chat-list-item"
      role="listitem"
      tabIndex={0}
      onClick={() => onSelect(contact.pubKey)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(contact.pubKey)}
      aria-label={`${contact.displayName}${contact.trust === 'verified' ? ', verified' : ''}`}
    >
      <div className="avatar">
        {contact.avatarUrl ? (
          <img src={contact.avatarUrl} alt="" />
        ) : (
          contact.displayName.charAt(0).toUpperCase()
        )}
      </div>
      <div className="chat-list-item-content">
        <div className="chat-list-item-name">
          {contact.displayName}
          {contact.trust === 'verified' && (
            <span className="shield-verified" style={{ fontSize: 12, marginLeft: 4 }}>
              ✓
            </span>
          )}
          {contact.isBlocked && (
            <span className="badge badge-warning" style={{ marginLeft: 4, fontSize: 10 }}>
              {t('contacts.blocked')}
            </span>
          )}
        </div>
        <div className="chat-list-item-preview">
          {contact.about || (lastActive ? `${t('chat.lastSeen')} ${lastActive}` : '—')}
        </div>
      </div>
      <div className="chat-list-item-meta">
        {lastActive && <span className="chat-list-item-time">{lastActive}</span>}
      </div>
    </div>
  );
});

export default function Contacts({ onSelectContact, onAddContact }: ContactsProps) {
  const [search, setSearch] = useState('');
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);

  const filtered = useMemo(() => {
    if (!search.trim()) return PLACEHOLDER_CONTACTS;
    const q = search.toLowerCase();
    return PLACEHOLDER_CONTACTS.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.pubKey.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelect = useCallback(
    (pubKey: string) => {
      if (onSelectContact) {
        onSelectContact(pubKey);
      } else {
        // Default: open direct conversation
        setActiveConversation(pubKey);
      }
    },
    [onSelectContact, setActiveConversation],
  );

  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">{t('contacts.contacts')}</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={onAddContact}
          aria-label={t('contacts.addContact')}
        >
          + {t('contacts.addContact')}
        </button>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t('app.search')} ${t('contacts.contacts').toLowerCase()}…`}
          aria-label={`${t('app.search')} ${t('contacts.contacts')}`}
        />
      </div>

      <div className="chat-list" role="list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">{t('contacts.noContacts')}</div>
            <div className="empty-state-text">Add someone to start a private conversation.</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={onAddContact}
            >
              + {t('contacts.addContact')}
            </button>
          </div>
        ) : (
          filtered.map((contact) => (
            <ContactItem key={contact.pubKey} contact={contact} onSelect={handleSelect} />
          ))
        )}
      </div>
    </div>
  );
}
