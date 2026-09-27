# Crow

**Privacy-first, end-to-end encrypted web messenger**

Crow is a web application designed for private, secure communication. All messages are end-to-end encrypted — the server never sees plaintext. Built for browsers, deployed to Vercel, working offline as a PWA.

## Features

- 🔒 **End-to-end encryption** — NIP-44 v2 (ChaCha20 + HMAC-SHA256) with secp256k1 ECDH
- 🏴 **No phone or email** — Cryptographic identity, locally generated
- 💬 **1:1 and group chat** — Direct messages + MLS-based secure groups
- 📞 **Voice & video calls** — WebRTC with encrypted signaling
- 📎 **Encrypted attachments** — Files encrypted before upload, chunked transfer
- 🌐 **Multi-relay transport** — Nostr relay pool with scoring and health monitoring
- 🔐 **Encrypted local vault** — IndexedDB with LUKS-style keyslots
- 🌍 **30+ languages** — Full i18n with RTL support
- 📱 **PWA** — Installable, works offline
- 🌙 **Dark / Light / System** — Complete theme system
- ♿ **Accessible** — Keyboard navigation, screen reader support, WCAG 2.2 AA target

## Architecture

```
Browser (Crow PWA)
  → E2EE protocol (NIP-44 / Gift Wrap)
  → Encrypted envelope
  → Transport adapter
  → Nostr relay / WebRTC peer
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

## Security

- All messages encrypted before leaving the browser
- Private identity keys never sent to any server
- Relay sees only ciphertext, pubkeys, and timestamps
- Encrypted local storage with scrypt-derived keys
- Replay protection, safety number verification, key rotation support

See [SECURITY.md](docs/SECURITY.md) for the full threat model and cryptographic details.

**Crow has not been independently audited.**

## What Crow Does NOT Claim

- ❌ "100% anonymous" — Relays see your IP and public keys
- ❌ "Unhackable" — No software is unhackable
- ❌ "Military-grade encryption" — Marketing language, not technical
- ❌ "Quantum proof" — PQ architecture is designed but not yet implemented
- ❌ Guaranteed remote deletion — "Delete for everyone" is a request, not a guarantee
- ❌ Tor transport in standard browsers — Architecture supports it; browser limitations documented

## Supported Browsers

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 90+ | ✅ Full |
| Safari 15+ | ✅ Most features (MediaRecorder partial) |
| Edge 90+ | ✅ Full |

## Tech Stack

- **TypeScript** — Type-safe throughout
- **React 18** — UI framework
- **Vite** — Build tool
- **@noble/curves** — secp256k1 cryptographic operations
- **@noble/ciphers** — ChaCha20, XChaCha20-Poly1305
- **@noble/hashes** — SHA-256, HMAC, scrypt, HKDF
- **Dexie** — IndexedDB wrapper for encrypted vault
- **Zustand** — State management
- **Vite PWA** — Service worker and offline support

## Development

```bash
npm install
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run typecheck    # Type checking
npm run lint         # ESLint
npm run format       # Prettier
```

## Deployment (Vercel)

1. Push to `main` branch
2. Vercel auto-builds from `package.json`
3. Security headers configured in `vercel.json`
4. No server-side processing of plaintext

## Self-Hosting

The production build is static HTML/JS/CSS. Deploy to:
- Vercel
- Cloudflare Pages
- Any static hosting
- Your own web server

Cryptographic functionality has zero platform dependencies.

## Internationalization

Supported languages: English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, Arabic, Persian, Turkish, Indonesian, Malay, Vietnamese, Thai, Chinese (Simplified/Traditional), Japanese, Korean, Spanish, Portuguese, French, German, Italian, Dutch, Polish, Ukrainian, Russian

RTL support: Arabic, Urdu, Persian

## Identity Model

Crow does not require phone numbers, email addresses, or passwords for identity.

- Identity is a locally generated secp256k1 key pair
- Private key stored encrypted in local vault
- Recovery via BIP-39 mnemonic
- Multi-device support with per-device keys
- Contact verification via safety numbers (60-digit grouped SHA-256)

## Limitations

- Forward secrecy in 1:1 is limited (static shared secret; ephemeral gift-wrap keys provide some protection)
- Metadata (pubkeys, timestamps, message sizes) is visible to relays
- Compromised browser = compromised session
- Stolen unlocked device exposes all local data
- Post-quantum cryptography not yet implemented (architecture ready)
- WebRTC reveals IP address during calls (TURN mitigates)
- "Delete for everyone" is a request, not guaranteed
- No independent security audit

## License

MIT

---

*Build for privacy. Trust the device.*
