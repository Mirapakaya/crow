import React, { useState, useCallback } from 'react';
import { t } from '@i18n';
import type { DeviceRef } from '@core/models';

interface DeviceManagementProps {
  onBack?: () => void;
}

// Placeholder — real data from vault repo
const PLACEHOLDER_DEVICES: DeviceRef[] = [];
const CURRENT_DEVICE_ID = 'device-current';

const DeviceItem = React.memo(function DeviceItem({
  device,
  isCurrent,
  onRevoke,
}: {
  device: DeviceRef;
  isCurrent: boolean;
  onRevoke: (deviceId: string) => void;
}) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const lastActive = new Date(device.lastActiveAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fingerprint = device.pubKey.slice(0, 8) + '…' + device.pubKey.slice(-8);

  return (
    <div
      className="chat-list-item"
      style={{
        borderColor: isCurrent ? 'var(--accent-primary)' : undefined,
        borderWidth: isCurrent ? 1 : 0,
        borderStyle: 'solid',
      }}
    >
      <div className="avatar" style={{ width: 36, height: 36, fontSize: 'var(--text-sm)' }}>
        {isCurrent ? '📱' : '💻'}
      </div>
      <div className="chat-list-item-content">
        <div className="chat-list-item-name">
          {device.name || 'Unnamed device'}
          {isCurrent && (
            <span className="badge badge-info" style={{ marginLeft: 4, fontSize: 10 }}>
              This device
            </span>
          )}
          {device.verified && (
            <span className="shield-verified" style={{ fontSize: 12, marginLeft: 4 }}>
              ✓
            </span>
          )}
        </div>
        <div className="chat-list-item-preview">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{fingerprint}</span>
          {' · '}
          <span>{lastActive}</span>
        </div>
      </div>
      {!isCurrent && (
        <div style={{ flexShrink: 0 }}>
          {confirmRevoke ? (
            <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onRevoke(device.deviceId)}
                aria-label={`Confirm revoke ${device.name}`}
              >
                {t('app.confirm')}
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setConfirmRevoke(false)}
                aria-label="Cancel revoke"
              >
                {t('app.cancel')}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm btn-ghost"
              style={{ color: 'var(--error)' }}
              onClick={() => setConfirmRevoke(true)}
              aria-label={`Revoke ${device.name}`}
            >
              {t('errors.deviceRevoked').replace('revoked', 'Revoke')}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default function DeviceManagement({ onBack }: DeviceManagementProps) {
  const [showAddDevice, setShowAddDevice] = useState(false);

  const handleRevoke = useCallback((_deviceId: string) => {
    // TODO: Call messengerEngine.revokeDevice(deviceId)
  }, []);

  const currentDevice: DeviceRef | null =
    PLACEHOLDER_DEVICES.find((d) => d.deviceId === CURRENT_DEVICE_ID) || null;
  const otherDevices = PLACEHOLDER_DEVICES.filter((d) => d.deviceId !== CURRENT_DEVICE_ID);

  return (
    <div className="screen">
      <div className="header">
        {onBack && (
          <button className="btn btn-icon btn-ghost" onClick={onBack} aria-label={t('app.back')}>
            ←
          </button>
        )}
        <h1 className="header-title">{t('settings.devices')}</h1>
      </div>

      <div className="screen-scroll">
        {/* Current Device */}
        <div className="settings-section">
          <h2 className="settings-section-title">Current Device</h2>
          {currentDevice ? (
            <DeviceItem device={currentDevice} isCurrent onRevoke={handleRevoke} />
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div className="empty-state-text">This device has not been registered yet.</div>
            </div>
          )}
        </div>

        {/* Other Devices */}
        <div className="settings-section">
          <h2 className="settings-section-title">Other Devices ({otherDevices.length})</h2>
          {otherDevices.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div className="empty-state-text">No other linked devices.</div>
            </div>
          ) : (
            otherDevices.map((device) => (
              <DeviceItem
                key={device.deviceId}
                device={device}
                isCurrent={false}
                onRevoke={handleRevoke}
              />
            ))
          )}
        </div>

        {/* Add Device */}
        <div className="settings-section">
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => setShowAddDevice(!showAddDevice)}
            aria-label="Add device"
          >
            ➕ Add Device
          </button>

          {showAddDevice && (
            <div className="card" style={{ marginTop: 'var(--space-3)' }}>
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Pair a New Device
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  lineHeight: 'var(--leading-relaxed)',
                }}
              >
                To link a new device, open Crow on that device and scan the pairing QR code
                displayed here, or enter the pairing code manually.
              </p>
              <div
                style={{
                  width: 200,
                  height: 200,
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 'var(--space-4) auto',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  QR Code Placeholder
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Pairing code: <span style={{ fontFamily: 'var(--font-mono)' }}>—</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
