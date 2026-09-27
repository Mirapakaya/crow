import React from 'react';

export default function SecuritySettings() {
  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">Security & Verification</h1>
      </div>
      <div className="screen-scroll">
        <div className="settings-section">
          <h2 className="settings-section-title">Encryption</h2>
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <span style={{ color: 'var(--verified)', fontSize: 20 }}>🔒</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                End-to-End Encrypted
              </span>
            </div>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              All messages are encrypted using NIP-44 v2 (ChaCha20 + HMAC-SHA256) with secp256k1
              ECDH key agreement. Forward secrecy is provided by ephemeral gift-wrap keys.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Identity</h2>
          <div className="settings-item">
            <div>
              <div className="settings-item-label">Identity Key</div>
              <div
                className="settings-item-description"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
              >
                Not yet generated
              </div>
            </div>
          </div>
          <div className="settings-item">
            <div>
              <div className="settings-item-label">Safety Number</div>
              <div className="settings-item-description">
                Verify contact identity by comparing safety numbers
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Vault</h2>
          <ToggleSetting
            label="Biometric Unlock"
            description="Use fingerprint or face to unlock vault"
            defaultChecked={false}
          />
          <div className="settings-item">
            <div>
              <div className="settings-item-label">Change Passphrase</div>
            </div>
            <button className="btn btn-sm btn-secondary">Change</button>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Disappearing Messages</h2>
          <ToggleSetting
            label="Default for new conversations"
            description=""
            defaultChecked={false}
          />
          <div className="settings-item">
            <div>
              <div className="settings-item-label">Default Duration</div>
            </div>
            <select
              className="input"
              style={{ width: 'auto' }}
              aria-label="Default disappearing duration"
            >
              <option value="off">Off</option>
              <option value="30s">30 seconds</option>
              <option value="5m">5 minutes</option>
              <option value="1h">1 hour</option>
              <option value="1d">1 day</option>
              <option value="1w">1 week</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <div className="settings-item">
      <div>
        <div className="settings-item-label">{label}</div>
        {description && <div className="settings-item-description">{description}</div>}
      </div>
      <div
        className={`toggle${checked ? ' active' : ''}`}
        onClick={() => setChecked(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setChecked(!checked)}
      >
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}
