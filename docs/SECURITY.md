# Crow Security Documentation

## Cryptographic Architecture

### Encryption for 1:1 Messages

| Component | Primitive | Library |
|-----------|-----------|---------|
| Key Agreement | secp256k1 ECDH | @noble/curves |
| Message Encryption | NIP-44 v2 (ChaCha20 + HMAC-SHA256) | @noble/ciphers, @noble/hashes |
| Envelope Encryption | XChaCha20-Poly1305 | @noble/ciphers |
| Gift Wrap | Ephemeral ECDH + XChaCha20-Poly1305 | @noble/curves, @noble/ciphers |
| Key Derivation (passphrase) | scrypt (N=2^17, r=8, p=1) | @noble/hashes |
| Key Derivation (subkeys) | HKDF-SHA256 | @noble/hashes |
| Key Derivation (PIN) | scrypt (N=2^20, r=8, p=1) | @noble/hashes |
| Replay Protection | SHA-256 set | @noble/hashes |
| Safety Numbers | SHA-256 | @noble/hashes |
| Random Generation | crypto.getRandomValues | Web Crypto API |

### Encryption for Groups

| Component | Primitive | Status |
|-----------|-----------|--------|
| Group Protocol | MLS (RFC 9420) | Interface defined, implementation pending library selection |
| Cipher Suite | X25519 + AES-128-GCM | TBD |
| Epoch Management | MLS key schedule | TBD |

### Post-Quantum Readiness

Crow's architecture includes a capability layer for hybrid post-quantum cryptography:

- **Current**: Classical secp256k1 ECDH + XChaCha20-Poly1305
- **Planned**: Hybrid ML-KEM-768 + X25519 key agreement (when browser-compatible audited implementation is available)
- **Architecture**: Crypto primitives are isolated behind interfaces, enabling algorithm migration without application changes

Crow does NOT claim to be "quantum proof" or "quantum resistant" at this time. The architecture is designed so that post-quantum primitives can be added when mature, audited, browser-compatible implementations exist.

### Identity Model

- **No phone numbers, email, or passwords required**
- Identity is a locally generated secp256k1 key pair
- Private identity key never leaves the browser
- Recovery via BIP-39 mnemonic (stored encrypted in vault)
- Multi-device support via per-device keys with identity linkage
- Contact verification via safety numbers (60-digit grouped SHA-256)

### Local Vault Security

- All sensitive data encrypted in IndexedDB before storage
- LUKS-style keyslot system (up to 8 independent unlock methods)
- Master key derived from passphrase via scrypt
- Per-table subkeys derived via HKDF from master key
- Blind indexing via HMAC for searchable encrypted records
- Vault lock zeroizes master key from memory
- No plaintext records stored at rest

### Key Storage

- Private keys stored as encrypted records in IndexedDB
- Master key held in memory only when vault is unlocked
- WebAuthn can protect keyslot unlock (but does not provide message encryption)
- Non-exportable CryptoKey objects used where browser supports them
- Secure key wrapping via AES-256-GCM (Web Crypto API)

## Threat Model

| Threat | Protection | Status |
|--------|------------|--------|
| **Malicious relay** | Cannot decrypt messages; can only drop/delay ciphertext | PROTECTED |
| **Malicious server (Vercel)** | Never receives plaintext; serves static assets only | PROTECTED |
| **Compromised browser** | Full access to decrypted data in memory | NOT PROTECTED |
| **Malicious browser extension** | Same-origin policy mitigates; extension with content script access could read DOM | PARTIALLY PROTECTED |
| **Stolen unlocked device** | Vault is decrypted; all local data accessible | NOT PROTECTED |
| **Stolen locked local database** | Encrypted with scrypt-derived keys; brute-force feasible with weak passphrase | PARTIALLY PROTECTED |
| **Network observer** | Sees ciphertext and metadata; cannot decrypt | PARTIALLY PROTECTED (metadata visible) |
| **Relay operator** | Sees ciphertext, sender/recipient pubkeys, timestamps, sizes | PARTIALLY PROTECTED (metadata visible) |
| **Malicious participant** | Can decrypt messages addressed to them; cannot decrypt others' messages | PROTECTED (for non-participant messages) |
| **Compromised participant device** | All messages to that participant compromised | NOT PROTECTED |
| **Invite interception** | Invite contains only public key; authentication via safety number verification | PARTIALLY PROTECTED |
| **Key substitution (MITM)** | Detectable via safety number verification | PARTIALLY PROTECTED (requires user verification) |
| **Replay attacks** | ReplayGuard rejects duplicate message IDs | PROTECTED |
| **Rollback attacks** | Not applicable (no mutable chain) | PROTECTED |
| **Message deletion** | Local deletion supported; remote deletion is a request, not guaranteed | PARTIALLY PROTECTED |
| **Metadata exposure** | Relay sees pubkeys, timestamps, sizes; IP visible to relay | PARTIALLY PROTECTED |
| **WebRTC IP exposure** | Peer IP visible during calls; configurable TURN can mask | PARTIALLY PROTECTED |
| **Availability attacks** | No single point of failure; multi-relay architecture | PARTIALLY PROTECTED |
| **Denial of service** | Rate limiting; relay-level controls | PARTIALLY PROTECTED |
| **Spam/abuse** | Contact requests, block, mute, rate limits | PARTIALLY PROTECTED |

## What the Server Sees

The relay server sees:
- Encrypted message blobs (ciphertext)
- Sender public key (Nostr pubkey)
- Recipient public key (in gift wrap tags)
- Timestamps
- Message sizes
- Connection metadata (IP address, user agent)

The relay does NOT see:
- Message content
- Attachment content
- Contact names
- Group names or membership
- Safety numbers
- Read receipts or typing indicators (these are also encrypted)
- Private identity keys

## Limitations

1. **No forward secrecy in 1:1**: Current NIP-44 implementation uses a static shared secret. Forward secrecy comes from gift-wrap ephemeral keys, but the underlying conversation key is static. This is a known limitation of the Nostr NIP-44 protocol. Future versions may implement a ratcheting layer.

2. **Metadata visibility**: Relays see sender/recipient pubkeys and timestamps. This is inherent to the Nostr transport model. Tor/privacy transport support would mitigate this.

3. **Browser security boundaries**: A compromised browser or malicious extension with content script access can access decrypted data in memory and the DOM.

4. **Device theft (unlocked)**: If the device is unlocked with vault open, all data is accessible. The vault lock feature mitigates this by requiring re-authentication.

5. **Post-quantum**: Not yet implemented. Architecture supports future addition of ML-KEM hybrid key agreement.

6. **WebRTC IP exposure**: Direct peer connections reveal IP addresses. TURN servers can mask this at operator cost.

7. **No guaranteed remote deletion**: "Delete for everyone" sends a deletion request. The recipient or relay may not comply.

## Responsible Disclosure

If you discover a security vulnerability in Crow, please report it responsibly:

1. Do NOT publicly disclose the vulnerability before it has been fixed
2. Email: security@crow.app (or open a private security advisory on GitHub)
3. Include: description, reproduction steps, affected versions, potential impact
4. We will acknowledge within 48 hours and aim to resolve within 90 days

## No Independent Audit

Crow has NOT been independently audited. All cryptographic implementations use audited libraries (@noble/curves, @noble/ciphers, @noble/hashes), but the Crow application itself has not undergone third-party security review.

Do not trust Crow for life-critical communications without independent verification.
