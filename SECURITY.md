# Crow Security Documentation

> **Version:** 3.0.0 · **Last updated:** 2026-10-01

Crow is a private, end-to-end-encrypted messenger that runs entirely as a static
web app. There is no Crow server, no account database, and no analytics. This
document describes the security architecture, cryptographic primitives, and known
limitations. For a detailed analysis of adversaries and what each can see, see
[THREAT-MODEL.md](./THREAT-MODEL.md).

---

## 1. Security Model Overview

| Property | Implementation |
|---|---|
| **Server model** | None. Crow is a static site served by any web host. |
| **Account model** | None. Identity is a locally generated key pair; no sign-up. |
| **Data at rest** | Encrypted vault stored in the browser's IndexedDB. |
| **Data in transit** | End-to-end encrypted via NIP-59 gift wraps on relay servers. |
| **Identity** | secp256k1 Schnorr key pair (Nostr NIP-01). |
| **Key storage** | Vault with multiple keyslots (biometric, PIN, passphrase, recovery phrase, device unlock). |

The browser is the only trust boundary the user directly controls. Every secret
lives inside it, encrypted at rest, and every message leaving it is already
encrypted under the recipient's key.

---

## 2. Cryptographic Primitives

All primitives come from the `@noble` family—pure JavaScript, constant-time
where applicable, zero WASM, audited, and compatible with a strict Content
Security Policy.

| Primitive | Library | Purpose |
|---|---|---|
| **secp256k1 Schnorr** | `@noble/curves` | Identity key pairs, event signatures (NIP-01). |
| **ChaCha20 / XChaCha20-Poly1305** | `@noble/ciphers` | Symmetric encryption of attachments, vault records, and backup files. |
| **scrypt** | `@noble/hashes` | Key derivation from passphrase, PIN, and recovery phrase (N = 2¹⁶, r = 8, p = 1). |
| **HKDF-SHA-256** | `@noble/hashes` | Deriving sub-keys (record keys, recovery keyslots, MLS key schedule). |
| **SHA-256** | `@noble/hashes` | Hashing, blob identity, integrity checks. |
| **NIP-44 v2** | `nostr-tools` | Conversation-key-based AEAD for sealed-direct messages (XChaCha20-Poly1305 internally). |
| **MLS (RFC 9420)** | `ts-mls` | Forward-secret group key agreement (X25519 + HKDF-SHA-256 ciphersuite). |

### Key derivation chain

```
User secret (passphrase / PIN / biometric / recovery words)
  └─ scrypt / HKDF-SHA-256
      └─ keyslot key (AES-256-GCM in vault header)
          └─ data key (AES-256-GCM in vault meta table)
              └─ HKDF-SHA-256
                  ├─ record key  → decrypt vault records
                  └─ index key   → blind database lookups
```

---

## 3. Key Management

### 3.1 Vault keyslots

The vault is a Dexie (IndexedDB) database whose master data key is wrapped once
for each **keyslot** the user has enabled. A keyslot is one of:

| Type | Derivation | Guarded? |
|---|---|---|
| **Passphrase** | scrypt(normalized input, random salt) | Yes |
| **PIN** | scrypt(PIN, random salt) | Yes |
| **Biometric** | WebCrypto key unwrapped by platform authenticator | Yes |
| **Recovery phrase** | HKDF-SHA-256(BIP-39 normalized mnemonic, salt) | No |
| **Device** | WebCrypto non-extractable key stored in browser | No |

Guarded keyslots require explicit user action to open. Removing a keyslot
re-encrypts the data key without it. The vault schema bumps a generation
counter on every keyslot change so stale writes are rejected.

### 3.2 Recovery

The twelve-word BIP-39 recovery phrase is the root of identity. It can always
unlock the vault and is the only recovery path if all other keyslots are lost.
Anyone who obtains the phrase can read all messages—store it on paper, offline.

---

## 4. End-to-End Encryption

### 4.1 One-to-one messages (NIP-59 / sealed sender)

Crow implements **NIP-59 gift-wrap sealing**, which provides sealed-sender
metadata protection:

1. **Rumor** — the plaintext message, unsigned, with hour-fuzzed timestamp.
2. **Seal** — the rumor is JSON-serialised and encrypted with NIP-44 v2
   (XChaCha20-Poly1305) under a conversation key derived from the sender's and
   recipient's identity keys. The seal is signed by the sender.
3. **Gift wrap** — the seal is encrypted again with NIP-44 v2 from a
   single-use **ephemeral key** to the recipient. The wrap is signed by the
   ephemeral key and published to relays as kind 1059.

Result: relays see an encrypted envelope addressed to the recipient, but they
do **not** learn who sent it. The recipient unwraps two layers to recover the
plaintext and authenticate the sender.

### 4.2 Group messages (NIP-17)

Under NIP-17, a group is defined as exactly the set of participants. The sender
produces one gift wrap per member, so each member's device receives a personal
encrypted copy. There is no group key for non-MLS groups; message-level
encryption is the same NIP-44 v2 as 1:1.

### 4.3 Forward-secret groups (MLS / RFC 9420)

Crow supports **forward-secret groups** using the Messaging Layer Security
protocol:

- **Ciphersuite:** DHKEM(X25519, HKDF-SHA-256) · HKDF-SHA-256 · AES-128-GCM
- **KeyPackages:** Published to relays (kind 443) so members can be added while
  offline. Can be withdrawn from settings.
- **Key ratcheting:** Every message advances the epoch. Compromising a member's
  key at epoch *n* does **not** reveal messages at epoch *n − 1* or earlier.
- **Key refresh:** Automatic every 14 days (7-day grace) to limit exposure
  from a live key compromise.
- **Max members:** Capped for performance; each member still receives a
  personal copy.

> **Note:** Forward secrecy applies **only** to MLS groups. One-to-one
> conversations use static Diffie-Hellman and do **not** provide forward
> secrecy. See §6 (Known Limitations) and [THREAT-MODEL.md](./THREAT-MODEL.md).

---

## 5. WebRTC Call Security

| Layer | Mechanism |
|---|---|
| **Signalling** | Offer/answer SDP carried inside NIP-59 gift wraps. The DTLS fingerprint in the SDP is authenticated by the sender's identity key—relay cannot substitute its own endpoint. |
| **Transport** | DTLS-SRTP. Audio and video are end-to-end encrypted between the two identity keys via the DTLS handshake. |
| **Fingerprint verification** | Crow verifies the remote DTLS fingerprint matches the one in the authenticated SDP. A mismatch aborts the call. |
| **Data channel** | DTLS-encrypted. Even if DTLS were compromised, every data-channel payload is additionally encrypted at the application layer, so the attacker still sees ciphertext. |
| **TURN servers** | Used when direct connectivity fails. See Known Limitations below. |

---

## 6. Known Limitations

| Limitation | Detail |
|---|---|
| **No push notifications** | Crow only rings while it is open in a browser tab. Delivering notifications to a closed app would require a server, which Crow does not operate. |
| **Relay metadata exposure** | Relays see the recipient's public key, the gift-wrap timestamp (hour-fuzzed), and the encrypted payload size. They do **not** see the sender or the plaintext. |
| **IP exposure on direct connections** | Direct WebRTC connections reveal the peer's IP address. The user can disable direct connections in Settings → Privacy. |
| **No forward secrecy for 1:1** | One-to-one conversations use static DH. Compromise of either party's identity key reveals all past and future messages in that conversation. MLS groups are the forward-secret alternative. |
| **Browser storage can be cleared** | Browsers may evict IndexedDB under storage pressure (especially Safari after ~7 days without visits). No server-side backup exists. |
| **No protection against device compromise** | If the device or browser is compromised, all secrets in memory are accessible. Crow's encryption only protects data at rest and in transit. |
| **TURN server IP visibility** | If a TURN server is used for call relay, it sees the IP addresses of both parties and encrypted media traffic. |
| **PIN brute force if vault exfiltrated** | If the raw IndexedDB files are copied off-device, an attacker can brute-force a PIN offline. Passphrase and biometric keyslots resist this better. |

---

## 7. Vulnerability Reporting

We take security vulnerabilities seriously. If you believe you have found a
security issue in Crow, please report it responsibly.

| | |
|---|---|
| **Email** | **security@[YOUR DOMAIN]** *[PLACEHOLDER — replace with actual address]* |
| **PGP key** | *[PLACEHOLDER — publish a public key and link it here]* |
| **Response time** | We aim to acknowledge within 48 hours and provide a fix timeline within 5 business days. |
| **Scope** | The Crow web application source code at <https://github.com/Mirapakaya/crow>. Out of scope: relay software you do not control, third-party browser extensions, operating-system-level compromises. |
| **Disclosure** | We ask for 90 days to address the issue before public disclosure, but will work with you on timing. |

**Please do not file security issues as public GitHub issues.**

---

## 8. References

- [THREAT-MODEL.md](./THREAT-MODEL.md) — detailed adversary analysis and residual risks
- [PRIVACY.md](./PRIVACY.md) — data handling and privacy practices
- [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) — version 2 encrypted direct message spec
- [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) — gift-wrap and seal spec
- [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) — private direct messages and groups
- [RFC 9420](https://www.rfc-editor.org/rfc/rfc9420) — The Messaging Layer Security (MLS) Protocol
- [@noble/curves](https://github.com/paulmillr/noble-curves) · [@noble/ciphers](https://github.com/paulmillr/noble-ciphers) · [@noble/hashes](https://github.com/paulmillr/noble-hashes)
