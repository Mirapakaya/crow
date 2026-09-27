import { useState } from 'react';

interface RelayEntry {
  url: string;
  state: 'connected' | 'disconnected' | 'connecting';
  latency: number;
  score: number;
}

const DEFAULT_RELAYS: RelayEntry[] = [
  { url: 'wss://relay.damus.io', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://nos.lol', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://relay.nostr.band', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://nostr.wine', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://relay.snort.social', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://nostr-pub.wellorder.net', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://relay.current.fyi', state: 'disconnected', latency: 0, score: 50 },
  { url: 'wss://eden.nostr.land', state: 'disconnected', latency: 0, score: 50 },
];

export default function RelaySettings() {
  const [relays, setRelays] = useState<RelayEntry[]>(DEFAULT_RELAYS);
  const [newRelayUrl, setNewRelayUrl] = useState('');

  const handleAdd = () => {
    const url = newRelayUrl.trim();
    if (!url.startsWith('wss://')) return;
    if (relays.some((r) => r.url === url)) return;
    setRelays([...relays, { url, state: 'disconnected', latency: 0, score: 50 }]);
    setNewRelayUrl('');
  };

  const handleRemove = (url: string) => {
    setRelays(relays.filter((r) => r.url !== url));
  };

  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">Relay Configuration</h1>
      </div>

      <div className="screen-scroll">
        <div className="settings-section">
          <h2 className="settings-section-title">Add Relay</h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              className="input"
              type="url"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              placeholder="wss://relay.example.com"
              aria-label="New relay URL"
            />
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={!newRelayUrl.startsWith('wss://')}
            >
              Add
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Active Relays ({relays.length})</h2>
          {relays.map((relay) => (
            <div
              key={relay.url}
              className="settings-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className={`connection-dot ${relay.state}`} />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {relay.url}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleRemove(relay.url)}
                  aria-label={`Remove ${relay.url}`}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-4)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                <span>Score: {relay.score}/100</span>
                <span>Latency: {relay.latency > 0 ? `${relay.latency}ms` : '—'}</span>
                <span>{relay.state}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
