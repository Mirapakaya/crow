# Crow

A private, end-to-end encrypted messenger that runs in the browser. No accounts,
no phone numbers, no server we control — your identity is a key on your device
and your messages are encrypted before they leave it.

**Crow has not been independently audited.**

## What Crow is

- **Static web app**: one HTML/JS bundle, served from anywhere, no backend.
- **No accounts**: identity is a locally generated secp256k1 key pair.
- **Encrypted by default**: every message is end-to-end encrypted.
- **No telemetry**: no analytics, no tracking, no phone-home.

## Core parts

- **Identity**: locally generated secp256k1 key pair, 12-word BIP-39 recovery.
- **1:1 messages**: NIP-17/NIP-59 gift-wrap protocol with sealed-sender envelopes.
- **Groups**: NIP-17 direct messages to every member, or forward-secret MLS groups.
- **Forward secrecy**: MLS (RFC 9420) groups with per-epoch key ratcheting.
- **Vault**: passphrase, PIN, biometric, or recovery phrase unlock via keyslots.
- **Storage**: IndexedDB through Dexie, encrypted per record, blinded index keys.
- **Calls**: WebRTC with DTLS-SRTP, signalling through NIP-59 gift wraps.
- **PWA**: static export, installable, offline shell via service worker.

## Cryptographic primitives

| Purpose | Implementation |
|---|---|
| Identity / signing | secp256k1 Schnorr (@noble/curves) |
| 1:1 key agreement | secp256k1 ECDH (@noble/curves) |
| Symmetric encryption | XChaCha20-Poly1305 and ChaCha20 + HMAC-SHA256 (@noble/ciphers) |
| Key derivation | scrypt, Argon2id, HKDF-SHA-256 (@noble/hashes) |
| Hashing | SHA-256, SHA-512 (@noble/hashes) |
| Group key management | MLS / ts-mls (RFC 9420) |

**Note on post-quantum claims:** A post-quantum hybrid handshake (X25519 +
ML-KEM-768) is used only as a secondary entropy source when creating an MLS
group; the MLS key schedule itself remains classical X25519-only. The "Hybrid
PQ" label in the app is premature and will be removed until the secret is bound
into the actual ciphertext. See [docs/AUDIT-FIX.md](./docs/AUDIT-FIX.md) C1 and
[docs/PROTOCOL.md](./docs/PROTOCOL.md) for the exact construction and limitations.

## Tech stack

- Next.js 15 App Router, static export
- React 19, shadcn/ui, Radix, Tailwind CSS
- TypeScript strict
- Geist Sans / Geist Mono
- Zustand, Dexie (IndexedDB), nostr-tools, ts-mls

## Development

```bash
npm ci
npm run dev
```

## Build and verify

```bash
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run test        # Vitest
npm run build       # Static export to dist/
npm run verify      # All of the above
```

## Deployment

Crow is a static site. See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel and
GitHub Pages instructions.

## Security and privacy

- [SECURITY.md](./SECURITY.md) — architecture and cryptography
- [THREAT-MODEL.md](./THREAT-MODEL.md) — adversaries and residual risks
- [PRIVACY.md](./PRIVACY.md) — what data leaves the device and when
- [LEGAL.md](./LEGAL.md) — licensing and legal overview

## Independent security audit

Crow has **not** been independently audited. The cryptography has not been
professionally reviewed. See [SECURITY.md](./SECURITY.md) for the architecture
and known limitations.

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE). The Crow name and visual
identity are not licensed under AGPL.
