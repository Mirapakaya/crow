import { useState } from 'react';
import { t } from '@i18n';
import { useAppStore } from '@app/Store';
import type { ConnectionStatus } from '@app/Store';

function getMessage(status: ConnectionStatus): string {
  switch (status) {
    case 'offline':
      return "You're offline. Messages will be sent when reconnected.";
    case 'degraded':
      return 'Connection degraded. Some messages may be delayed.';
    case 'connecting':
      return 'Connecting…';
    default:
      return '';
  }
}

function getIcon(status: ConnectionStatus): string {
  switch (status) {
    case 'offline':
      return '🚫';
    case 'degraded':
      return '⚠️';
    case 'connecting':
      return '🔄';
    default:
      return '';
  }
}

export default function ConnectionBanner() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const [dismissed, setDismissed] = useState(false);

  // Only show for non-connected states
  if (connectionStatus === 'connected' || dismissed) return null;

  const message = getMessage(connectionStatus);
  const icon = getIcon(connectionStatus);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        backgroundColor:
          connectionStatus === 'offline' ? 'var(--error-subtle)' : 'var(--warning-subtle)',
        borderBottom: `1px solid ${connectionStatus === 'offline' ? 'var(--error)' : 'var(--warning)'}`,
        zIndex: 'var(--z-sticky)',
        flexShrink: 0,
      }}
      role="alert"
      aria-live="polite"
    >
      <span style={{ flexShrink: 0, fontSize: 14 }}>{icon}</span>
      <span
        style={{
          flex: 1,
          fontSize: 'var(--text-xs)',
          color: connectionStatus === 'offline' ? 'var(--error)' : 'var(--warning)',
        }}
      >
        {message}
      </span>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setDismissed(true)}
        aria-label={t('app.close')}
        style={{ flexShrink: 0, padding: 'var(--space-1)' }}
      >
        ✕
      </button>
    </div>
  );
}
