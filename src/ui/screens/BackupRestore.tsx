import React, { useState, useCallback, useRef } from 'react';
import { t } from '@i18n';

type BackupStep = 'idle' | 'creating' | 'restoring' | 'done' | 'error';

export default function BackupRestore() {
  const [step, setStep] = useState<BackupStep>('idle');
  const [progress, setProgress] = useState(0);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Placeholder — real backup metadata from vault
  const lastBackupDate: string | null = null;

  const handleCreateBackup = useCallback(async () => {
    if (!passphrase || passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }
    setError(null);
    setStep('creating');
    setProgress(0);
    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((r) => setTimeout(r, 200));
      }
      // TODO: Call messengerEngine.createBackup(passphrase)
      setStep('done');
    } catch {
      setStep('error');
      setError(t('backup.backupFailed'));
    }
  }, [passphrase, confirmPassphrase]);

  const handleRestoreBackup = useCallback(async () => {
    if (!restorePassphrase) {
      setError('Enter the backup passphrase');
      return;
    }
    setError(null);
    setStep('restoring');
    setProgress(0);
    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((r) => setTimeout(r, 200));
      }
      // TODO: Call messengerEngine.restoreBackup(file, passphrase)
      setStep('done');
    } catch {
      setStep('error');
      setError(t('backup.backupFailed'));
    }
  }, [restorePassphrase]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: Store file reference for restore
    void file;
  }, []);

  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">{t('settings.backup')}</h1>
      </div>

      <div className="screen-scroll">
        {/* Last backup info */}
        {lastBackupDate && (
          <div className="settings-section">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--success)' }}>✅</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {t('backup.backupCreated')}: {lastBackupDate}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Create Backup */}
        <div className="settings-section">
          <h2 className="settings-section-title">{t('backup.createBackup')}</h2>
          <div className="card">
            <label className="input-label" htmlFor="backup-pass">
              {t('backup.backupPassword')}
            </label>
            <input
              id="backup-pass"
              className={`input ${error === 'Passphrase must be at least 8 characters' ? 'input-error' : ''}`}
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setError(null);
              }}
              placeholder="Min 8 characters"
              minLength={8}
              aria-label={t('backup.backupPassword')}
            />

            <label
              className="input-label"
              htmlFor="backup-pass-confirm"
              style={{ marginTop: 'var(--space-3)' }}
            >
              Confirm passphrase
            </label>
            <input
              id="backup-pass-confirm"
              className={`input ${error === 'Passphrases do not match' ? 'input-error' : ''}`}
              type="password"
              value={confirmPassphrase}
              onChange={(e) => {
                setConfirmPassphrase(e.target.value);
                setError(null);
              }}
              placeholder="Re-enter passphrase"
              minLength={8}
              aria-label="Confirm passphrase"
            />

            {error && step !== 'restoring' && <div className="input-error-text">{error}</div>}

            {/* Progress */}
            {step === 'creating' && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: 'var(--accent-primary)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {t('attachments.encryptionProgress')} {progress}%
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="badge badge-success" style={{ marginTop: 'var(--space-3)' }}>
                ✅ {t('backup.backupCreated')}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-3)', width: '100%' }}
              onClick={handleCreateBackup}
              disabled={step === 'creating' || !passphrase || !confirmPassphrase}
            >
              {step === 'creating' ? t('app.loading') : t('backup.createBackup')}
            </button>
          </div>
        </div>

        {/* Restore Backup */}
        <div className="settings-section">
          <h2 className="settings-section-title">{t('backup.restoreBackup')}</h2>
          <div className="card">
            <label className="input-label" htmlFor="restore-file">
              Backup file
            </label>
            <input
              id="restore-file"
              ref={fileInputRef}
              className="input"
              type="file"
              accept=".crowbackup,.json,.bin"
              onChange={handleFileSelect}
              aria-label="Select backup file"
              style={{ padding: 'var(--space-1) var(--space-2)' }}
            />

            <label
              className="input-label"
              htmlFor="restore-pass"
              style={{ marginTop: 'var(--space-3)' }}
            >
              {t('backup.backupPassword')}
            </label>
            <input
              id="restore-pass"
              className={`input ${error === 'Enter the backup passphrase' ? 'input-error' : ''}`}
              type="password"
              value={restorePassphrase}
              onChange={(e) => {
                setRestorePassphrase(e.target.value);
                setError(null);
              }}
              placeholder="Enter backup passphrase"
              aria-label={t('backup.backupPassword')}
            />

            {error && step === 'restoring' && <div className="input-error-text">{error}</div>}

            {/* Progress */}
            {step === 'restoring' && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: 'var(--info)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {t('attachments.downloadProgress')} {progress}%
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="badge badge-success" style={{ marginTop: 'var(--space-3)' }}>
                ✅ {t('backup.backupRestored')}
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ marginTop: 'var(--space-3)', width: '100%' }}
              onClick={handleRestoreBackup}
              disabled={step === 'restoring' || !restorePassphrase}
            >
              {step === 'restoring' ? t('app.loading') : t('backup.restoreBackup')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
