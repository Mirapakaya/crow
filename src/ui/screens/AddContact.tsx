import { useState, useCallback } from 'react';
import { t } from '@i18n';

interface AddContactProps {
  onAdded?: (pubKey: string) => void;
  onBack?: () => void;
}

const HEX_KEY_REGEX = /^[0-9a-fA-F]{64}$/;

export default function AddContact({ onAdded, onBack }: AddContactProps) {
  const [method, setMethod] = useState<'key' | 'qr' | 'link'>('key');
  const [pubKeyInput, setPubKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addedKey, setAddedKey] = useState<string | null>(null);

  const validateKey = useCallback((key: string): boolean => {
    return HEX_KEY_REGEX.test(key);
  }, []);

  const handleAdd = useCallback(async () => {
    const key = pubKeyInput.trim();
    if (!validateKey(key)) {
      setError('Invalid public key — must be 64 hex characters');
      return;
    }
    setError(null);
    setIsAdding(true);
    try {
      // TODO: Call messengerEngine.addContact(key)
      setAddedKey(key);
      if (onAdded) onAdded(key);
    } catch {
      setError(t('errors.unknownError'));
    } finally {
      setIsAdding(false);
    }
  }, [pubKeyInput, validateKey, onAdded]);

  const handlePasteLink = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (HEX_KEY_REGEX.test(text.trim())) {
        setPubKeyInput(text.trim());
        setError(null);
      }
    } catch {
      // clipboard read denied — ignore
    }
  }, []);

  return (
    <div className="screen">
      <div className="header">
        {onBack && (
          <button className="btn btn-icon btn-ghost" onClick={onBack} aria-label={t('app.back')}>
            ←
          </button>
        )}
        <h1 className="header-title">{t('contacts.addContact')}</h1>
      </div>

      <div className="screen-scroll">
        {/* Method tabs */}
        <div className="settings-section">
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <button
              className={`btn btn-sm ${method === 'key' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMethod('key')}
            >
              🔑 {t('security.identityKey')}
            </button>
            <button
              className={`btn btn-sm ${method === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMethod('qr')}
            >
              📷 {t('contacts.scanQr')}
            </button>
            <button
              className={`btn btn-sm ${method === 'link' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMethod('link')}
            >
              🔗 {t('contacts.inviteLink')}
            </button>
          </div>

          {/* Paste public key */}
          {method === 'key' && (
            <div className="card">
              <label className="input-label" htmlFor="add-contact-key">
                {t('security.identityKey')}
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  id="add-contact-key"
                  className={`input ${error ? 'input-error' : ''}`}
                  type="text"
                  value={pubKeyInput}
                  onChange={(e) => {
                    setPubKeyInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. a1b2c3d4… (64 hex chars)"
                  maxLength={64}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label={t('security.identityKey')}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
                />
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handlePasteLink}
                  aria-label="Paste from clipboard"
                >
                  📋
                </button>
              </div>
              {error && <div className="input-error-text">{error}</div>}
              <div className="input-hint">
                Enter the 64-character hexadecimal public key of the contact you want to add.
              </div>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleAdd}
                  disabled={!pubKeyInput.trim() || isAdding}
                >
                  {isAdding ? t('app.loading') : t('contacts.addContact')}
                </button>
              </div>
            </div>
          )}

          {/* Scan QR (placeholder) */}
          {method === 'qr' && (
            <div className="card">
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                <div style={{ fontSize: 48, marginBottom: 'var(--space-3)' }}>📷</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {t('contacts.scanQr')}
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  Camera access required — coming soon
                </p>
              </div>
            </div>
          )}

          {/* Invite link (placeholder) */}
          {method === 'link' && (
            <div className="card">
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                <div style={{ fontSize: 48, marginBottom: 'var(--space-3)' }}>🔗</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {t('contacts.inviteLink')}
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  Share your invite link — coming soon
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Verify Contact — shown after adding */}
        {addedKey && (
          <div className="settings-section">
            <h2 className="settings-section-title">{t('contacts.verifyContact')}</h2>
            <div className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <span style={{ color: 'var(--unverified)', fontSize: 20 }}>🛡️</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('security.safetyNumber')}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  wordBreak: 'break-all',
                  lineHeight: 'var(--leading-relaxed)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {/* Placeholder safety number */}
                12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890
                12345 67890 12345 67890 12345 67890 12345 67890
              </div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                  marginTop: 'var(--space-2)',
                }}
              >
                Compare this number with your contact out-of-band to verify their identity.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
