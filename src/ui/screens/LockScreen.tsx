import React, { useState } from 'react';
import { useAppStore } from '@app/Store';
import { vault } from '@vault/vault';
import { RelayPool } from '@transport/relayPool';
import { DEFAULT_RELAYS } from '@transport/defaultRelays';
import { t } from '@i18n';

export default function LockScreen() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setVaultState = useAppStore((s) => s.setVaultState);
  const setRelayPool = useAppStore((s) => s.setRelayPool);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);

  const handleUnlock = async () => {
    if (!passphrase) return;
    setLoading(true);
    setError('');
    try {
      await vault.unlock(passphrase, 'passphrase');
      setVaultState('unlocked');

      // Re-initialize relay pool after unlock
      const pool = new RelayPool();
      for (const url of DEFAULT_RELAYS) {
        pool.addRelay(url);
      }
      pool.onRelayStateChange = () => {
        const infos = pool.getAllRelayInfo();
        const hasConnected = infos.some((i) => i.state === 'connected');
        const hasConnecting = infos.some(
          (i) => i.state === 'connecting' || i.state === 'reconnecting',
        );
        if (hasConnected) {
          setConnectionStatus('connected');
        } else if (hasConnecting) {
          setConnectionStatus('connecting');
        } else {
          setConnectionStatus('offline');
        }
      };
      setRelayPool(pool);
      pool.connectAll().catch(() => {
        setConnectionStatus('offline');
      });
    } catch {
      setError(t('lockScreen.incorrectPassphrase'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="screen" style={{ background: 'var(--bg-base)' }}>
      <div className="empty-state" style={{ height: '100%', padding: 'var(--space-8)' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-6)' }}>🔒</div>
        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {t('app.name')}
        </h1>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-6)',
            textAlign: 'center',
          }}
        >
          {t('lockScreen.description')}
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            width: '100%',
            maxWidth: 320,
          }}
        >
          <input
            className="input"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('lockScreen.passphrasePlaceholder')}
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="input-error-text">{error}</p>}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleUnlock}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 20, height: 20 }} />
            ) : (
              t('lockScreen.unlock')
            )}
          </button>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              marginTop: 'var(--space-2)',
            }}
          >
            🔐 {t('lockScreen.biometricHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
