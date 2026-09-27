# Crow Protocol Specification

## Overview

Crow uses the Nostr protocol ecosystem for message transport and builds E2EE messaging on top of NIP-44 v2, NIP-59 (gift wrap), and NIP-17 (private direct messages).

## Protocol Stack

```
┌──────────────────────────────────┐
│  Application Layer               │
│  Chat, Groups, Calls, Files      │
├──────────────────────────────────┤
│  Crow Message Layer              │
│  NIP-17 Private DMs              │
│  NIP-44 v2 Encryption            │
│  NIP-59 Gift Wrap                │
├──────────────────────────────────┤
│  Nostr Transport Layer           │
│  Event format, Kinds, Signatures │
│  Relay Protocol (WebSocket)      │
├──────────────────────────────────┤
│  Network Layer                   │
│  WebSocket (WSS) / WebRTC        │
└──────────────────────────────────┘
```

## Identity

Each Crow user has a Nostr identity key pair:

- **Algorithm**: secp256k1 (same as Bitcoin/Nostr)
- **Public key**: 32 bytes, hex-encoded (64 chars) — this is the user's Nostr npub
- **Private key**: 32 bytes, hex-encoded — stored encrypted in local vault

Identity does NOT require:
- Phone number
- Email address
- Server account
- Central registration

### Key Generation

```
1. Generate 32 cryptographically random bytes → private key
2. Compute secp256k1 public key → 32-byte x-only public key
3. Derive npub (bech32 encoding) for display
4. Store private key encrypted in vault
```

### Recovery

Recovery uses BIP-39 mnemonic:
- 12 or 24 words
- Mnemonic → PBKDF2-SHA512 → seed
- Seed used to regenerate identity key

### Multi-Device

Each device generates its own key pair and links to the identity:
- Device key signed by identity key
- Device list maintained in Nostr kind 0 (metadata) or custom kind
- Revoked devices cannot receive future messages after key rotation

## Encryption

### 1:1 Message Encryption (NIP-44 v2)

```
Sender                                    Recipient
  │                                          │
  │  1. ECDH(myPrivKey, theirPubKey)         │
  │     → sharedSecret (32 bytes)            │
  │                                          │
  │  2. KDF(sharedSecret)                    │
  │     → conversationKey (32 bytes)         │
  │                                          │
  │  3. NIP-44 v2 Encrypt:                   │
  │     - Generate random nonce              │
  │     - ChaCha20(plaintext, conversationKey, nonce)
  │     - HMAC-SHA256(ciphertext)            │
  │     → sealed message                     │
  │                                          │
  │  4. Gift Wrap (NIP-59):                  │
  │     - Generate ephemeral key pair        │
  │     - ECDH(ephemeralPriv, theirPubKey)   │
  │     - XChaCha20-Poly1305(sealed, ephKey) │
  │     → gift-wrapped event                 │
  │                                          │
  │  ──publish to relay──>                   │
  │                                          │
  │                     5. Un Gift Wrap:      │
  │                        - Detect ephemeral key
  │                        - ECDH(myPrivKey, ephPub)
  │                        - XChaCha20-Poly1305 decrypt
  │                        → sealed message  │
  │                                          │
  │                     6. NIP-44 v2 Decrypt: │
  │                        - ECDH(myPrivKey, senderPub)
  │                        → conversationKey │
  │                        - Verify HMAC     │
  │                        - ChaCha20 decrypt│
  │                        → plaintext       │
```

### Conversation Key Derivation

```
sharedSecret = secp256k1ECDH(privateKey, publicKey)
conversationKey = HKDF-SHA256(sharedSecret, "nostr-44-v2", 32)
```

### Gift Wrap (NIP-59)

Gift wrap provides:
- **Sealed sender**: Recipient knows who sent the message (sender pubkey in inner event)
- **Ephemeral outer**: Relay sees only an ephemeral key, not the sender's identity
- **Forward secrecy**: Each message uses a new ephemeral key pair

## Nostr Event Kinds

| Kind | Name | Purpose |
|------|------|---------|
| 0 | Metadata | User profile (display name, about, avatar) |
| 1 | Text | Public notes (not used by Crow) |
| 4 | Encrypted DM (legacy) | Deprecated, replaced by NIP-17 |
| 7 | Reaction | Message reactions |
| 14 | Private Direct Message | NIP-17 encrypted DM |
| 443 | File Metadata | Attachment metadata (NIP-94) |
| 1059 | Gift Wrap | NIP-59 sealed sender envelope |
| 10002 | Relay List | User's preferred relays |
| 24133 | Private Direct Message (newer) | NIP-17 DM variant |

## Group Messaging (MLS)

Crow's group messaging architecture follows MLS (Messaging Layer Security, RFC 9420):

- **Cipher Suite**: X25519 + AES-128-GCM + Ed25519 (MLS default)
- **Epoch-based**: Every membership change creates a new epoch
- **Key schedule**: Each epoch derives fresh encryption keys
- **Welcome messages**: New members receive encrypted group state
- **Commit messages**: Membership/key updates broadcast as commits
- **Forward secrecy**: Past epochs' keys cannot derive future keys
- **Post-compromise security**: Key update after compromise limits exposure

### Group Lifecycle

```
Create Group:
  1. Creator initializes MLS group
  2. Generates KeyPackage
  3. Creates epoch 0 with creator as sole member

Add Member:
  1. Inviter creates Add proposal
  2. Inviter commits proposal
  3. New epoch created
  4. Welcome message sent to new member (encrypted)
  5. New member processes Welcome, joins group

Remove Member:
  1. Admin creates Remove proposal
  2. Admin commits proposal
  3. New epoch created (removed member's keys invalid)
  4. Removed member cannot decrypt future messages

Key Update:
  1. Member creates Update proposal
  2. Member commits
  3. New epoch with fresh leaf key
  4. Provides post-compromise security
```

## Attachment Encryption

```
1. Validate file (type, size, filename)
2. For images: strip EXIF metadata, generate thumbnail
3. Generate random 256-bit attachment key
4. Split file into 64KB chunks
5. For each chunk:
   a. Generate unique 24-byte nonce
   b. XChaCha20-Poly1305(chunk, key, nonce)
   c. Compute SHA-256(encrypted_chunk) for integrity
6. Upload encrypted chunks to relay (as Nostr events)
7. Send attachment key + event IDs to recipient via encrypted message
8. Recipient downloads chunks, verifies integrity, decrypts
```

## Call Signaling

```
Caller                                    Callee
  │                                         │
  │  1. Create RTCPeerConnection            │
  │  2. CreateOffer() → SDP offer           │
  │  3. Gift-wrap offer, send via relay     │
  │                                         │
  │  ──encrypted signaling──>               │
  │                                         │
  │                    4. Un Gift Wrap       │
  │                    5. CreateAnswer()     │
  │                    6. Gift-wrap answer   │
  │                                         │
  │  <──encrypted signaling──               │
  │                                         │
  │  7. SetRemoteDescription(answer)        │
  │                                         │
  │  ←→ ICE candidates (encrypted) ←→      │
  │                                         │
  │  ←→ DTLS-SRTP media ←→                │
  │  (WebRTC built-in encryption)           │
```

## Sync Protocol

Crow uses a simplified sync protocol based on Nostr filters:

```
1. On connect, query relay for events since lastSyncTimestamp
2. Filter: { kinds: [14, 7, 1059], "#p": [myPubKey], since: lastSync }
3. Process received events:
   a. Verify signatures
   b. Decrypt messages
   c. Deduplicate by event ID
   d. Store in vault
4. Update lastSyncTimestamp
```

## Replay Protection

Every message includes a unique nonce. The ReplayGuard:
1. Computes SHA-256(messageId + nonce)
2. Checks against set of seen hashes
3. Rejects duplicates
4. Prunes entries older than 24 hours

## Key Rotation

When a user needs to rotate their identity key:
1. Generate new key pair
2. Sign transition with old key (BIP-340 Schnorr signature)
3. Publish transition event to relay
4. Contacts verify transition signature
5. New messages use new key
6. Old key is revoked

## Disappearing Messages

- Expiration timestamp set per-message or per-conversation
- Client-side enforcement: delete locally when expired
- Relay-level: optionally set event expiration (NIP-40)
- Honest limitation: recipient may have already copied/saved the message
- UI distinguishes: "delete locally" vs "request deletion remotely" vs "auto-expire"
