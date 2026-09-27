import { useState } from 'react';
import { useAppStore } from '@app/Store';
import { vault } from '@vault/vault';
import { generateIdentityKeyPair } from '@identity/keygen';
import { generateMnemonic } from '@identity/mnemonic';
import { RelayPool } from '@transport/relayPool';
import { DEFAULT_RELAYS } from '@transport/defaultRelays';
import { t } from '@i18n';

type OnboardingStep = 'welcome' | 'create' | 'mnemonic' | 'confirm' | 'ready';

export default function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const setHasIdentity = useAppStore((s) => s.setHasIdentity);
  const setVaultState = useAppStore((s) => s.setVaultState);
  const setIdentityPubKey = useAppStore((s) => s.setIdentityPubKey);
  const setIdentityPrivateKey = useAppStore((s) => s.setIdentityPrivateKey);
  const setRelayPool = useAppStore((s) => s.setRelayPool);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);

  const handleCreate = async () => {
    if (passphrase.length < 8) {
      setError(t('onboarding.error.passphraseTooShort'));
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError(t('onboarding.error.passphraseMismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Initialize the vault with the user's passphrase
      await vault.initialize(passphrase, 'passphrase');

      // 2. Generate identity key pair
      const keyPair = generateIdentityKeyPair();

      // 3. Generate BIP-39 mnemonic for recovery
      const words = generateMnemonic(12);
      setMnemonic(words);

      // 4. Store public key in the store
      const pubKeyHex = Array.from(keyPair.publicKey)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setIdentityPubKey(pubKeyHex);
      setIdentityPrivateKey(keyPair.privateKey);

      // 5. Mark identity created and vault unlocked
      setHasIdentity(true);
      setVaultState('unlocked');

      // 6. Initialize relay pool and connect
      const pool = new RelayPool();
      for (const url of DEFAULT_RELAYS) {
        pool.addRelay(url);
      }
      pool.onRelayStateChange = (_url, _state) => {
        // Derive overall connection status from pool state
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
      // Fire-and-forget: connect in the background
      pool.connectAll().catch(() => {
        setConnectionStatus('offline');
      });

      setStep('mnemonic');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(t('onboarding.error.createFailed') + (msg ? ` (${msg})` : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMnemonic = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  const handleConfirmMnemonic = () => {
    setStep('ready');
  };

  return (
    <div className="screen" style={{ background: 'var(--bg-base)' }}>
      <div className="empty-state" style={{ height: '100%', padding: 'var(--space-8)' }}>
        {step === 'welcome' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 'var(--space-6)' }}>🐦</div>
            <h1
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-3)',
              }}
            >
              {t('app.name')}
            </h1>
            <p
              style={{
                fontSize: 'var(--text-base)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-8)',
                maxWidth: 400,
                lineHeight: 'var(--leading-relaxed)',
                textAlign: 'center',
              }}
            >
              {t('onboarding.welcome.description')}
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                width: '100%',
                maxWidth: 320,
              }}
            >
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setStep('create')}
                style={{ width: '100%' }}
              >
                {t('onboarding.welcome.createIdentity')}
              </button>
              <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} disabled>
                {t('onboarding.welcome.restoreBackup')}
              </button>
            </div>
          </>
        )}

        {step === 'create' && (
          <>
            <h2
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {t('onboarding.create.title')}
            </h2>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-6)',
                textAlign: 'center',
              }}
            >
              {t('onboarding.create.description')}
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
              <div>
                <label className="input-label">{t('onboarding.create.passphrase')}</label>
                <input
                  className="input"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={t('onboarding.create.passphrasePlaceholder')}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="input-label">{t('onboarding.create.confirmPassphrase')}</label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder={t('onboarding.create.confirmPlaceholder')}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="input-error-text">{error}</p>}
              <button
                className="btn btn-primary btn-lg"
                onClick={handleCreate}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                ) : (
                  t('onboarding.create.submit')
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setStep('welcome');
                  setError('');
                }}
              >
                {t('common.back')}
              </button>
            </div>
          </>
        )}

        {step === 'mnemonic' && (
          <>
            <h2
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {t('onboarding.mnemonic.title')}
            </h2>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-6)',
                textAlign: 'center',
              }}
            >
              {t('onboarding.mnemonic.description')}
            </p>
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 'var(--space-4)',
                wordSpacing: '0.5em',
                lineHeight: '2',
                fontSize: 'var(--text-base)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                userSelect: 'all',
              }}
            >
              {mnemonic}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCopyMnemonic}
              style={{ marginBottom: 'var(--space-4)' }}
            >
              {copied ? t('common.copied') : t('common.copy')}
            </button>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--error)',
                marginBottom: 'var(--space-4)',
                textAlign: 'center',
              }}
            >
              ⚠ {t('onboarding.mnemonic.warning')}
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleConfirmMnemonic}
              style={{ width: '100%', maxWidth: 320 }}
            >
              {t('onboarding.mnemonic.confirm')}
            </button>
          </>
        )}

        {step === 'ready' && (
          <>
            <div style={{ fontSize: 48, color: 'var(--verified)', marginBottom: 'var(--space-4)' }}>
              ✓
            </div>
            <h2
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {t('onboarding.ready.title')}
            </h2>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              {t('onboarding.ready.description')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
