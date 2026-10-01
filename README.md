# Crow

A private, end-to-end-encrypted messenger that runs entirely in the browser. No accounts, no phone numbers, no server we control — your identity is a key on your device and your messages are encrypted before they leave it.

## Architecture

```
                    CROW WEB APP
                         │
                  Next.js / React
                         │
                 Crow UI / shadcn
                         │
             Application Service Layer
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       Storage         Crypto        Messaging
          │              │              │
       IndexedDB     E2EE sessions   Protocol
       (encrypted)      │              │
                         └──────┬───────┘
                                │
                            Transport
                                │
                    ┌───────────┴───────────┐
                    │                       │
                 Relays                  WebRTC
               (Nostr NIP-17)         (P2P calls)
```

### Core Systems

- **Identity**: Locally generated secp256k1 key pairs, BIP-39 mnemonic recovery
- **E2EE**: NIP-17/NIP-59 gift-wrap protocol, sealed-sender envelopes, ChaCha20-Poly1305
- **Forward secrecy**: MLS (RFC 9420) for group conversations with key ratcheting
- **Vault**: LUKS-style keyslots — passphrase, PIN, pattern, biometric, or recovery phrase unlock
- **Storage**: IndexedDB via Dexie, all rows encrypted under vault key, blinded index keys
- **Transport**: Nostr relay pool (WebSocket) for encrypted message delivery, WebRTC for calls
- **PWA**: Static export, installable, offline shell via service worker

### Cryptographic Primitives

| Purpose | Implementation |
|---|---|
| Key agreement | secp256k1 ECDH (via @noble/curves) |
| Symmetric encryption | XChaCha20-Poly1305 (via @noble/ciphers) |
| Key derivation | scrypt, HKDF-SHA-512 (via @noble/hashes) |
| Hashing | SHA-256, SHA-512 (via @noble/hashes) |
| Group key management | MLS / ts-mls (RFC 9420) |
| Post-quantum (Stage 2) | ML-KEM-768 + ML-DSA-65 (via @noble/post-quantum) |

## Tech Stack

- **Framework**: Next.js 15 (App Router, static export)
- **UI**: React 19, shadcn/ui, Radix primitives, Tailwind CSS
- **Language**: TypeScript (strict mode)
- **Fonts**: Geist Sans, Geist Mono
- **State**: Zustand
- **Database**: Dexie (IndexedDB)
- **Relay**: nostr-tools (NIP-17/59 gift-wrap protocol)
- **Testing**: Vitest

## Development

```bash
npm install --legacy-peer-deps
npm run dev
```

## Build & Verify

```bash
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run test        # Vitest
npm run build       # Production build (static export to dist/)
npm run verify      # All checks combined
```

## Deployment

Crow is a static web application compatible with any standard hosting platform. See [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific instructions.

**Quick start (Vercel):** Connect the GitHub repo, set framework to Next.js, and deploy.

## Security

All messages are end-to-end encrypted. No plaintext leaves the device. Private keys never leave the browser. See [SECURITY.md](./SECURITY.md) and [THREAT-MODEL.md](./THREAT-MODEL.md) for details.

## Privacy

No accounts. No analytics. No telemetry. No tracking. The only data that leaves your device is encrypted envelopes addressed to your contacts, delivered through relays that cannot read them. See [PRIVACY.md](./PRIVACY.md) for a full breakdown.

## Internationalization

Crow supports 30+ languages including English, Persian, and Indic scripts, with full RTL support. Language and theme preferences are cached outside the encrypted vault so they apply before unlock.

## Legal

- [Terms of Service](https://crow.w8n.pw/legal/terms/)
- [Privacy Policy](https://crow.w8n.pw/legal/privacy/)
- [Acceptable Use Policy](https://crow.w8n.pw/legal/acceptable-use/)
- [Cookie Policy](https://crow.w8n.pw/legal/cookies/)
- [Open Source Licenses](https://crow.w8n.pw/legal/licenses/)
- [Security Disclosure](https://crow.w8n.pw/legal/security/)

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE) for details. The Crow name and visual identity are not licensed under AGPL.
