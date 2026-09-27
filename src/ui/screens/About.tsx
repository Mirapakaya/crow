import { t } from '@i18n';

export default function About() {
  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">{t('app.about')}</h1>
      </div>

      <div className="screen-scroll">
        {/* App Info */}
        <div
          className="settings-section"
          style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}
        >
          <div style={{ fontSize: 64, marginBottom: 'var(--space-3)' }}>🐦</div>
          <h1
            style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}
          >
            {t('app.name')}
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            {t('app.tagline')}
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              marginTop: 'var(--space-2)',
            }}
          >
            v0.1.0
          </p>
        </div>

        {/* Description */}
        <div className="settings-section">
          <div className="card">
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              Crow is a privacy-first, end-to-end encrypted web messenger built on the Nostr
              protocol. All messages use NIP-44 v2 (ChaCha20 + HMAC-SHA256) with secp256k1 ECDH key
              agreement and ephemeral gift-wrap keys for forward secrecy.
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="settings-section">
          <div
            className="card"
            style={{ borderColor: 'var(--warning)', backgroundColor: 'var(--warning-subtle)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--warning)', flexShrink: 0 }}>⚠️</span>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--warning)',
                    fontSize: 'var(--text-sm)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Not independently audited
                </div>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  This software has not undergone an independent security audit. Use at your own
                  risk for sensitive communications. We encourage community review of our
                  open-source code.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="settings-section">
          <h2 className="settings-section-title">Links</h2>
          <div className="settings-item">
            <div className="settings-item-label">GitHub Repository</div>
            <a
              href="https://github.com/Mirapakaya/crow"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              Mirapakaya/crow
            </a>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">Security Documentation</div>
            <a
              href="https://github.com/Mirapakaya/crow/security"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              Security policy
            </a>
          </div>
        </div>

        {/* License */}
        <div className="settings-section">
          <h2 className="settings-section-title">License</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>MIT License</p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Copyright © {new Date().getFullYear()} Mirapakaya. All rights reserved.
          </p>
        </div>

        {/* Build Info */}
        <div className="settings-section">
          <h2 className="settings-section-title">Build Info</h2>
          <div className="settings-item">
            <div className="settings-item-label">Version</div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              0.1.0
            </span>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">Protocol</div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Nostr (NIP-01, NIP-04, NIP-44, NIP-59)
            </span>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">Encryption</div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              ChaCha20 + HMAC-SHA256
            </span>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">Key Agreement</div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              secp256k1 ECDH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
