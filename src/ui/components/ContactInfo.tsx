import { useState, useCallback } from 'react';
import { t } from '@i18n';
import type { Contact } from '@core/models';

interface ContactInfoProps {
  contact: Contact;
  onVerify?: (pubKey: string) => void;
  onBlock?: (pubKey: string) => void;
  onMute?: (pubKey: string) => void;
  onClose?: () => void;
}

export default function ContactInfo({
  contact,
  onVerify,
  onBlock,
  onMute,
  onClose,
}: ContactInfoProps) {
  const [copied, setCopied] = useState(false);

  const truncatedKey = contact.pubKey.slice(0, 12) + '…' + contact.pubKey.slice(-8);

  const handleCopyKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contact.pubKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied
    }
  }, [contact.pubKey]);

  const trustLabel =
    contact.trust === 'verified'
      ? t('contacts.verified')
      : contact.trust === 'unverified'
        ? t('contacts.notVerified')
        : '—';

  const trustBadge =
    contact.trust === 'verified'
      ? 'badge-success'
      : contact.trust === 'unverified'
        ? 'badge-warning'
        : '';

  return (
    <div className="card" role="region" aria-label={`${contact.displayName} info`}>
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}
      >
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('contacts.contacts')}
        </h3>
        {onClose && (
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={onClose}
            aria-label={t('app.close')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Avatar + Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div className="avatar avatar-lg">
          {contact.avatarUrl ? (
            <img src={contact.avatarUrl} alt="" />
          ) : (
            contact.displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <div
            style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {contact.displayName}
          </div>
          {contact.about && (
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                marginTop: 'var(--space-1)',
              }}
            >
              {contact.about}
            </div>
          )}
        </div>
      </div>

      {/* Public Key */}
      <div className="settings-item">
        <div>
          <div className="settings-item-label">{t('security.identityKey')}</div>
          <div
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}
          >
            {truncatedKey}
          </div>
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={handleCopyKey}
          aria-label="Copy public key"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>

      {/* Verification Status */}
      <div className="settings-item">
        <div>
          <div className="settings-item-label">{t('security.verifySecurity')}</div>
          <div style={{ marginTop: 'var(--space-1)' }}>
            <span className={`badge ${trustBadge}`}>
              {contact.trust === 'verified' && '✓ '}
              {trustLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Safety Number */}
      {contact.safetyNumber && (
        <div className="settings-item">
          <div>
            <div className="settings-item-label">{t('security.safetyNumber')}</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                wordBreak: 'break-all',
                lineHeight: 'var(--leading-relaxed)',
                maxWidth: 240,
              }}
            >
              {contact.safetyNumber.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        </div>
      )}

      {/* Device Count */}
      <div className="settings-item">
        <div>
          <div className="settings-item-label">{t('settings.devices')}</div>
          <div className="settings-item-description">
            {contact.devices.length} linked device{contact.devices.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-3)',
        }}
      >
        {onVerify && contact.trust !== 'verified' && (
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => onVerify(contact.pubKey)}
            aria-label={t('contacts.verifyContact')}
          >
            🛡️ {t('contacts.verifyContact')}
          </button>
        )}
        {onMute && (
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => onMute(contact.pubKey)}
            aria-label={contact.isMuted ? 'Unmute' : 'Mute'}
          >
            {contact.isMuted ? '🔔 Unmute' : '🔕 Mute'}
          </button>
        )}
        {onBlock && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--error)' }}
            onClick={() => onBlock(contact.pubKey)}
            aria-label={contact.isBlocked ? t('contacts.unblock') : t('contacts.blocked')}
          >
            {contact.isBlocked ? `🔓 ${t('contacts.unblock')}` : `🚫 ${t('contacts.blocked')}`}
          </button>
        )}
      </div>
    </div>
  );
}
