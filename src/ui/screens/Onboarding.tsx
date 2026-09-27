import { useState } from 'react';
import { useAppStore } from '@app/Store';

type OnboardingStep = 'welcome' | 'create' | 'mnemonic' | 'confirm' | 'ready';

export default function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setHasIdentity = useAppStore((s) => s.setHasIdentity);
  const setVaultState = useAppStore((s) => s.setVaultState);

  const handleCreate = async () => {
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // TODO: Call identity module to generate keys and initialize vault
      // For now, simulate
      setMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
      setStep('mnemonic');
    } catch (e) {
      setError('Failed to create identity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMnemonic = () => {
    setStep('ready');
    setHasIdentity(true);
    setVaultState('unlocked');
  };

  return (
    <div className="screen" style={{ background: 'var(--bg-base)' }}>
      <div className="empty-state" style={{ height: '100%', padding: 'var(--space-8)' }}>
        {step === 'welcome' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 'var(--space-6)' }}>🐦</div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              Crow
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', maxWidth: 400, lineHeight: 'var(--leading-relaxed)', textAlign: 'center' }}>
              Privacy-first, end-to-end encrypted messaging. Your keys, your data, your control.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', maxWidth: 320 }}>
              <button className="btn btn-primary btn-lg" onClick={() => setStep('create')} style={{ width: '100%' }}>
                Create New Identity
              </button>
              <button className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                Restore from Backup
              </button>
            </div>
          </>
        )}

        {step === 'create' && (
          <>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Secure Your Vault
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              Choose a strong passphrase to protect your encrypted data.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', maxWidth: 320 }}>
              <div>
                <label className="input-label">Passphrase</label>
                <input
                  className="input"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="input-label">Confirm Passphrase</label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter your passphrase"
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="input-error-text">{error}</p>}
              <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={loading} style={{ width: '100%' }}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Create Identity'}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep('welcome')}>
                Back
              </button>
            </div>
          </>
        )}

        {step === 'mnemonic' && (
          <>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Recovery Phrase
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              Write down these words in order. They are the only way to recover your identity if you lose access.
            </p>
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-6)',
              wordSpacing: '0.5em',
              lineHeight: '2',
              fontSize: 'var(--text-base)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              userSelect: 'all',
            }}>
              {mnemonic}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--error)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
              ⚠ Never share this phrase. Anyone with these words can access your account.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleConfirmMnemonic} style={{ width: '100%', maxWidth: 320 }}>
              I've Saved My Recovery Phrase
            </button>
          </>
        )}

        {step === 'ready' && (
          <>
            <div style={{ fontSize: 48, color: 'var(--verified)', marginBottom: 'var(--space-4)' }}>✓</div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Identity Created
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Your encrypted identity is ready. All messages are end-to-end encrypted.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
