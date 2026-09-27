import React, { useState } from 'react';
import { useAppStore } from '@app/Store';

export default function LockScreen() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setVaultState = useAppStore((s) => s.setVaultState);

  const handleUnlock = async () => {
    if (!passphrase) return;
    setLoading(true);
    setError('');
    try {
      // TODO: Call vault.unlock(passphrase)
      // Simulate for now
      await new Promise((r) => setTimeout(r, 500));
      setVaultState('unlocked');
    } catch {
      setError('Incorrect passphrase');
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
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Crow
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          Enter your passphrase to unlock your encrypted vault.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', maxWidth: 320 }}>
          <input
            className="input"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Passphrase"
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="input-error-text">{error}</p>}
          <button className="btn btn-primary btn-lg" onClick={handleUnlock} disabled={loading} style={{ width: '100%' }}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}
