import { useMemo } from 'react';
import { t } from '@i18n';

interface VerifyDialogProps {
  safetyNumber: string;
  onVerify: () => void;
  onSkip: () => void;
  peerName?: string;
}

function formatSafetyNumber(num: string): string {
  // Group into 5-digit chunks for readability (60 digits → 12 groups)
  const digits = num.replace(/\D/g, '').padEnd(60, '0').slice(0, 60);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 5) {
    groups.push(digits.slice(i, i + 5));
  }
  // Display as 2 rows of 6 groups
  return groups.join(' ');
}

export default function VerifyDialog({
  safetyNumber,
  onVerify,
  onSkip,
  peerName,
}: VerifyDialogProps) {
  const formatted = useMemo(() => formatSafetyNumber(safetyNumber), [safetyNumber]);

  // Split into two rows for readability
  const groups = formatted.split(' ');
  const row1 = groups.slice(0, 6).join('  ');
  const row2 = groups.slice(6, 12).join('  ');

  return (
    <div className="modal-overlay" role="dialog" aria-label={t('contacts.verifyContact')}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{t('security.verifySecurity')}</h2>
        </div>

        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {peerName
            ? `Verify ${peerName} by comparing the safety number below with what they see on their device.`
            : 'Compare the safety number below with your contact out-of-band to verify their identity.'}
        </p>

        {/* Safety number display */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {t('security.safetyNumber')}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              letterSpacing: '0.05em',
              color: 'var(--text-primary)',
              lineHeight: 'var(--leading-relaxed)',
              userSelect: 'all',
            }}
          >
            {row1}
            <br />
            {row2}
          </div>
        </div>

        {/* QR Code placeholder */}
        <div
          style={{
            width: 160,
            height: 160,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>QR Code</span>
        </div>

        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Scan the QR code on your contact&apos;s device, or read the number aloud.
        </p>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onSkip} aria-label={t('app.skip')}>
            {t('app.skip')}
          </button>
          <button
            className="btn btn-primary"
            onClick={onVerify}
            aria-label={t('contacts.verifyContact')}
          >
            {t('contacts.verifyContact')}
          </button>
        </div>
      </div>
    </div>
  );
}
