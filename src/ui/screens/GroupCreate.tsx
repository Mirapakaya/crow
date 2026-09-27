import React, { useState, useCallback, useMemo } from 'react';
import { t } from '@i18n';
import type { Contact } from '@core/models';

interface GroupCreateProps {
  onBack?: () => void;
  onCreated?: (conversationId: string) => void;
}

// Placeholder — real data from vault repo
const PLACEHOLDER_CONTACTS: Contact[] = [];

const ContactCheckbox = React.memo(function ContactCheckbox({
  contact,
  selected,
  onToggle,
}: {
  contact: Contact;
  selected: boolean;
  onToggle: (pubKey: string) => void;
}) {
  return (
    <div
      className="chat-list-item"
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onToggle(contact.pubKey)}
      onKeyDown={(e) => e.key === 'Enter' && onToggle(contact.pubKey)}
      aria-label={contact.displayName}
    >
      <div className="avatar" style={{ width: 32, height: 32, fontSize: 'var(--text-xs)' }}>
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
        </div>
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 'var(--radius-sm)',
          border: `2px solid ${selected ? 'var(--accent-primary)' : 'var(--border-default)'}`,
          backgroundColor: selected ? 'var(--accent-primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {selected && <span style={{ color: 'var(--text-inverse)', fontSize: 12 }}>✓</span>}
      </div>
    </div>
  );
});

export default function GroupCreate({ onBack, onCreated }: GroupCreateProps) {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return PLACEHOLDER_CONTACTS;
    const q = search.toLowerCase();
    return PLACEHOLDER_CONTACTS.filter((c) => c.displayName.toLowerCase().includes(q));
  }, [search]);

  const toggleMember = useCallback((pubKey: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(pubKey)) next.delete(pubKey);
      else next.add(pubKey);
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedMembers.size === 0) {
      setError('Select at least one member');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      // TODO: Call messengerEngine.createGroup({ name, description, members })
      const convId = `group-${Date.now()}`;
      if (onCreated) onCreated(convId);
    } catch {
      setError(t('errors.unknownError'));
    } finally {
      setIsCreating(false);
    }
  }, [groupName, selectedMembers, onCreated]);

  return (
    <div className="screen">
      <div className="header">
        {onBack && (
          <button className="btn btn-icon btn-ghost" onClick={onBack} aria-label={t('app.back')}>
            ←
          </button>
        )}
        <h1 className="header-title">{t('groups.newGroup')}</h1>
      </div>

      <div className="screen-scroll">
        {/* MLS Notice */}
        <div className="settings-section">
          <div
            className="card"
            style={{ borderColor: 'var(--warning)', backgroundColor: 'var(--warning-subtle)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--warning)' }}>⚠️</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)' }}>
                Group encryption not yet available (MLS pending)
              </span>
            </div>
          </div>
        </div>

        {/* Group Info */}
        <div className="settings-section">
          <h2 className="settings-section-title">{t('groups.groupInfo')}</h2>

          <label className="input-label" htmlFor="group-name">
            {t('groups.groupName')} *
          </label>
          <input
            id="group-name"
            className={`input ${error === 'Group name is required' ? 'input-error' : ''}`}
            type="text"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              setError(null);
            }}
            placeholder={t('groups.groupName')}
            maxLength={100}
            aria-label={t('groups.groupName')}
          />

          <label
            className="input-label"
            htmlFor="group-desc"
            style={{ marginTop: 'var(--space-3)' }}
          >
            {t('groups.groupDescription')} ({t('app.edit').toLowerCase()})
          </label>
          <textarea
            id="group-desc"
            className="input"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder={t('groups.groupDescription')}
            maxLength={500}
            rows={3}
            style={{ resize: 'vertical', minHeight: 60 }}
            aria-label={t('groups.groupDescription')}
          />
        </div>

        {/* Member Selection */}
        <div className="settings-section">
          <h2 className="settings-section-title">
            {t('groups.addMembers')} ({selectedMembers.size} selected)
          </h2>

          <div className="search-bar" style={{ padding: 0, marginBottom: 'var(--space-3)' }}>
            <input
              className="search-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t('app.search')} ${t('contacts.contacts').toLowerCase()}…`}
              aria-label={`${t('app.search')} ${t('contacts.contacts')}`}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div className="empty-state-text">{t('contacts.noContacts')}</div>
            </div>
          ) : (
            <div className="chat-list" role="list" style={{ maxHeight: 300, overflow: 'auto' }}>
              {filtered.map((contact) => (
                <ContactCheckbox
                  key={contact.pubKey}
                  contact={contact}
                  selected={selectedMembers.has(contact.pubKey)}
                  onToggle={toggleMember}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error + Create */}
        {error && (
          <div style={{ padding: '0 var(--space-6)' }}>
            <div className="input-error-text">{error}</div>
          </div>
        )}

        <div style={{ padding: 'var(--space-4) var(--space-6)' }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.size === 0 || isCreating}
          >
            {isCreating ? t('app.loading') : t('groups.newGroup')}
          </button>
        </div>
      </div>
    </div>
  );
}
