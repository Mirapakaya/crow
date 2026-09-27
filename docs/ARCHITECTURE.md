# Crow Architecture

## Overview

Crow is a privacy-first, end-to-end encrypted web messenger built for browsers. It runs as a PWA with no server-side plaintext processing.

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   UI     │  │   i18n   │  │   Media          │  │
│  │ React    │  │ Locales  │  │ Voice/Image/File │  │
│  └────┬─────┘  └──────────┘  └────────┬─────────┘  │
│       │                               │             │
│  ┌────▼───────────────────────────────▼─────────┐   │
│  │                 Engine                        │   │
│  │  Messenger · InboxSync · BlobTransfer · Calls │   │
│  └────┬──────────────────────────────┬──────────┘   │
│       │                              │              │
│  ┌────▼──────────┐  ┌───────────────▼──────────┐   │
│  │    Protocol   │  │       Transport          │   │
│  │  NIP-44 · MLS │  │  RelayPool · WebRTC     │   │
│  └────┬──────────┘  └───────────────┬──────────┘   │
│       │                              │              │
│  ┌────▼──────────────────────────────▼──────────┐   │
│  │               Cryptography                    │   │
│  │  secp256k1 · XChaCha20 · scrypt · HKDF      │   │
│  │  Gift Wrap · Safety Numbers · Replay Guard   │   │
│  └────┬─────────────────────────────────────────┘   │
│       │                                             │
│  ┌────▼─────────────────────────────────────────┐   │
│  │                Identity                       │   │
│  │  Key Generation · Mnemonic · Devices · Invite │   │
│  └────┬─────────────────────────────────────────┘   │
│       │                                             │
│  ┌────▼─────────────────────────────────────────┐   │
│  │              Encrypted Vault                  │   │
│  │  IndexedDB · LUKS-style Keyslots · Dexie     │   │
│  │  VaultRepo · Export/Import · Key Hierarchy   │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket / WebRTC
              ┌────────▼────────┐
              │  Nostr Relays   │
              │  (Ciphertext    │
              │   transport     │
              │   only)         │
              └─────────────────┘
```

## Layer Responsibilities

### UI Layer (`src/ui/`, `src/components/`)
- React components for all screens
- Never implements cryptography directly
- Calls Engine and Store for all operations
- Full i18n integration via `t()` function
- Responsive layout (mobile + desktop)
- Dark/light/system themes

### Engine Layer (`src/core/engine/`)
- Orchestrates messaging operations
- Message send/receive/decrypt pipeline
- Inbox synchronization
- Blob (attachment) transfer management
- Connection status derivation
- Coordinates between Protocol, Transport, and Vault

### Protocol Layer (`src/core/crypto/`, `src/core/mls/`)
- NIP-44 v2 encryption/decryption (ChaCha20 + HMAC-SHA256)
- Gift wrap / sealed sender (XChaCha20-Poly1305)
- MLS group protocol interface (RFC 9420)
- Safety number computation
- Replay protection
- Key rotation

### Transport Layer (`src/core/transport/`)
- Multi-relay WebSocket pool (Nostr protocol)
- Relay scoring and health monitoring
- WebRTC direct P2P connections
- Negentropy sync protocol
- Configurable relay infrastructure
- Transport is abstracted — encryption layer does not depend on specific relay

### Cryptography Layer
- All primitives from audited `@noble/*` libraries
- secp256k1 ECDH for key agreement
- XChaCha20-Poly1305 for envelope encryption
- ChaCha20 + HMAC-SHA256 for NIP-44 v2
- scrypt for key derivation (passphrase, PIN)
- HKDF-SHA256 for subkey derivation
- SHA-256 for hashing and safety numbers
- No custom cryptography

### Identity Layer (`src/core/identity/`)
- Locally generated secp256k1 key pairs
- BIP-39 mnemonic for recovery
- Multi-device support with per-device keys
- Secure invite codec (Base64url, time-limited)
- Device fingerprinting

### Encrypted Vault (`src/core/vault/`)
- IndexedDB via Dexie
- LUKS-style keyslot system (up to 8 slots)
  - Passphrase, PIN, biometric, recovery slots
  - Each slot wraps the master key independently
- Per-table derived subkeys (HKDF)
- Blind indexing for searchable encrypted records (HMAC)
- Encrypted backup export/import
- Vault lock/unlock with zeroization

## Key Hierarchy

```
Master Key (256-bit, generated at setup)
├── Keyslot 0: Passphrase → scrypt → wraps master key
├── Keyslot 1: PIN → scrypt (higher params) → wraps master key
├── Keyslot 2: Biometric → WebAuthn → wraps master key
├── Keyslot 3: Recovery mnemonic → PBKDF2 → wraps master key
│
├── Table Key: HKDF(masterKey, "messages") → encrypts message records
├── Table Key: HKDF(masterKey, "contacts") → encrypts contact records
├── Table Key: HKDF(masterKey, "conversations") → encrypts conversation records
├── Table Key: HKDF(masterKey, "groups") → encrypts group state
├── Table Key: HKDF(masterKey, "attachments") → encrypts attachment metadata
│
└── Blind Index Key: HKDF(masterKey, "index") → HMAC for searchable IDs
```

## Data Flow

### Sending a Message

```
User types message
  → Engine.sendMessage(conversationId, plaintext)
    → Lookup recipient's public key from Vault
    → Crypto.getSharedSecret(myPrivKey, theirPubKey)
    → Crypto.nip44.encrypt(plaintext, conversationKey)
    → Crypto.giftWrap(ciphertext, theirPubKey, myPrivKey)
    → Transport.relayPool.publish(giftWrappedEvent)
    → Store in Vault (encrypted with table key)
```

### Receiving a Message

```
RelayPool receives Nostr event
  → Engine.receiveEvent(event)
    → Verify event signature
    → Crypto.unGiftWrap(sealedMessage, myPrivKey)
    → Crypto.nip44.decrypt(ciphertext, conversationKey)
    → ReplayGuard.check(messageId, nonce)
    → Store in Vault (encrypted with table key)
    → UI update via state management
```

### Sending an Attachment

```
User selects file
  → Security validation (type, size, filename)
  → Image: strip EXIF metadata, generate thumbnail
  → Crypto.blobCrypto.generateBlobKey()
  → Crypto.blobCrypto.encryptBlob(fileData, key) → chunks
  → Engine.blobTransfer.upload(encryptedChunks, relayPool)
  → Send key+eventId to recipient via encrypted message
```

## Relay Architecture

Crow uses Nostr relays for message transport. The relay layer is fully abstracted:

- **Blind transport**: Relays receive only ciphertext. They cannot decrypt messages.
- **Multi-relay**: Connect to multiple relays for redundancy and reliability
- **Scoring**: Relays are scored by success rate, latency, and uptime
- **Configurable**: Users can add/remove/test relays
- **Self-hostable**: Any Nostr-compatible relay works
- **No vendor lock-in**: Crow does not depend on any specific relay operator

## WebRTC Calling

```
Caller → encrypted signaling via Nostr relay
  → Offer (SDP) encrypted with gift wrap
  → ICE candidates exchanged via encrypted signaling
  → Peer connection established
  → Media streams encrypted via DTLS (built into WebRTC)
  → Optional TURN server for NAT traversal
```

## PWA / Offline

- Service Worker caches the app shell
- Encrypted vault works offline (IndexedDB)
- Draft messages stored locally and queued
- Synchronization resumes on reconnection
- Attachments resume on reconnection

## Browser Compatibility

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| IndexedDB | ✅ | ✅ | ✅ |
| Web Crypto | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ |
| WebRTC | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ |
| WebAuthn | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ⚠️ partial |
| File System Access | ✅ | ❌ | ❌ |

## What the Server Sees

The relay/server sees:
- Encrypted ciphertext blobs
- Sender public keys (Nostr pubkeys)
- Recipient public keys (in gift wrap tags)
- Message timestamps
- Message sizes

The relay/server does NOT see:
- Message plaintext
- Attachment content
- Contact names or display names
- Group names or membership details
- Safety numbers
- Identity private keys
