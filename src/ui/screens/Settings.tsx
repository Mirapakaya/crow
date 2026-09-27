import { useState } from 'react';
import { useAppStore } from '@app/Store';

export default function Settings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const setVaultState = useAppStore((s) => s.setVaultState);

  const handleLock = () => {
    setVaultState('locked');
  };

  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">Settings</h1>
      </div>

      <div className="screen-scroll">
        {/* Appearance */}
        <div className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-item">
            <div>
              <div className="settings-item-label">Theme</div>
              <div className="settings-item-description">
                Light, dark, or follow system preference
              </div>
            </div>
            <select
              className="input"
              style={{ width: 'auto', minWidth: 120 }}
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              aria-label="Theme"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="settings-item">
            <div>
              <div className="settings-item-label">Language</div>
              <div className="settings-item-description">Choose your preferred language</div>
            </div>
            <select
              className="input"
              style={{ width: 'auto', minWidth: 120 }}
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
              <option value="ar">العربية</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="ru">Русский</option>
              <option value="pt">Português</option>
              <option value="ur">اردو</option>
              <option value="bn">বাংলা</option>
              <option value="tr">Türkçe</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </div>
        </div>

        {/* Privacy */}
        <div className="settings-section">
          <h2 className="settings-section-title">Privacy</h2>
          <ToggleSetting
            label="Read Receipts"
            description="Let contacts know when you've read their messages"
            defaultChecked={true}
          />
          <ToggleSetting
            label="Typing Indicators"
            description="Show when you're typing a message"
            defaultChecked={true}
          />
          <ToggleSetting
            label="Link Previews"
            description="Generate previews for links in messages"
            defaultChecked={false}
          />
          <ToggleSetting
            label="Media Auto-Download"
            description="Automatically download media in messages"
            defaultChecked={false}
          />
        </div>

        {/* Security */}
        <div className="settings-section">
          <h2 className="settings-section-title">Security</h2>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            🔐 Security & Verification
          </button>
          <div style={{ height: 'var(--space-2)' }} />
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            📱 Device Management
          </button>
          <div style={{ height: 'var(--space-2)' }} />
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            🗄️ Relay Configuration
          </button>
          <div style={{ height: 'var(--space-2)' }} />
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            💾 Encrypted Backup
          </button>
        </div>

        {/* Account */}
        <div className="settings-section">
          <h2 className="settings-section-title">Account</h2>
          <button
            className="btn btn-danger btn-ghost"
            onClick={handleLock}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            🔒 Lock Vault
          </button>
        </div>

        {/* About */}
        <div className="settings-section">
          <h2 className="settings-section-title">About</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Crow v0.1.0</p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Privacy-first, end-to-end encrypted web messenger
          </p>
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
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="settings-item">
      <div>
        <div className="settings-item-label">{label}</div>
        <div className="settings-item-description">{description}</div>
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
