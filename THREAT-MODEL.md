# Crow Threat Model

> **Version:** 3.0.0 · **Last updated:** 2026-10-01

This document analyses the assets Crow protects, the trust boundaries it
operates within, the threat actors it considers, and the residual risks that
remain after all mitigations. It is intended to be read alongside
[SECURITY.md](./SECURITY.md) and [PRIVACY.md](./PRIVACY.md).

---

## 1. Assets

| Asset | Where stored | Sensitivity |
|---|---|---|
| **Identity private key** | Encrypted vault (IndexedDB), wrapped by keyslot keys | Critical — full impersonation and message decryption |
| **Message plaintext** | Encrypted vault (IndexedDB) | High — private conversations |
| **Contact list** | Encrypted vault (IndexedDB), index keys blinded | Medium — reveals social graph |
| **Message metadata** | Relay servers (encrypted envelope, some metadata visible) | Medium — sender/recipient keys, timestamps, sizes |
| **Vault data key** | Encrypted under each keyslot; never stored plaintext on disk | Critical — unlocks all vault data |
| **Biometric / device key** | Browser WebCrypto key store | High — unlocks vault without passphrase |

---

## 2. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Browser sandbox                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ IndexedDB    │  │ WebCrypto    │  │ Service Worker   │   │
│  │ (vault,      │  │ (key wrap,  │  │ (PWA, offline    │   │
│  │  encrypted)  │  │  biometric)  │  │  cache, NO vault │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │              │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐   │
│  │  Crow application code (JS, loaded from origin)        │   │
│  └──────────────────────────┬────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTPS
               ┌──────────────┼───────────────┐
               │              │               │
         ┌─────┴─────┐ ┌─────┴─────┐ ┌───────┴───────┐
         │ Relay     │ │ TURN      │ │ WebRTC peer   │
         │ servers   │ │ servers   │ │ (contact)     │
         └───────────┘ └───────────┘ └───────────────┘
```

### Boundary descriptions

| Boundary | Crossing | Protection |
|---|---|---|
| **Browser ↔ Relay** | Gift-wrapped events (kind 1059/14/7) over WebSocket | NIP-59 E2EE; envelope metadata visible |
| **Browser ↔ TURN** | DTLS-SRTP encrypted media | DTLS fingerprint authenticated via NIP-59 SDP |
| **Browser ↔ WebRTC peer** | DTLS-SRTP media + data channel | Double-encrypted: DTLS + application-layer |
| **IndexedDB ↔ Application** | Database reads/writes | Data key encrypted per record; index keys blinded |
| **Service Worker ↔ Vault** | None | Service worker has **no** vault access; it only caches static assets |
| **WebCrypto ↔ Application** | Key wrap/unwrap operations | Non-extractable keys for biometric/device keyslots |

---

## 3. Threat Actors

### 3.1 Passive network observer

A party that can observe network traffic (ISP, Wi-Fi operator, nation-state
passive intercept) but cannot break TLS or compromise endpoints.

| Can see | Cannot see |
|---|---|
| TLS-encrypted connections to relays | Message content, sender identity |
| Which relay domains the user connects to | — |
| Timing and volume of WebSocket frames | — |
| DNS queries for relay domains | — |

### 3.2 Malicious relay operator

A party that operates one or more Nostr relays the user sends messages to.

| Can see | Cannot see |
|---|---|
| Recipient public keys (in gift-wrap `p` tags) | Message plaintext |
| Hour-fuzzed timestamps | True send time (±1 hour) |
| Encrypted payload size | Content type, structure |
| Which ephemeral keys publish to their relay | Real sender identity (sealed sender) |
| Frequency of a user's reads/writes | Message content, full social graph |
| Relay connection IP addresses | — |

### 3.3 Device thief

A party that gains physical access to the user's device while it is locked or
powered off.

| Can see | Cannot see |
|---|---|
| Encrypted IndexedDB blobs | Plaintext messages, identity key |
| Browser vendor/keychain metadata | Vault data key (wrapped) |
| — | Anything without unlocking a keyslot |

**Mitigations:** keyslot-derived encryption, biometric/PIN gating, auto-lock on
inactivity.

**Risk if browser data is exfiltrated:** offline brute-force against PIN
keyslot is feasible; passphrase and biometric keyslots resist better.

### 3.4 Compromised browser extension

A malicious or compromised browser extension that runs in the same origin
context as Crow.

| Can do | Cannot do |
|---|---|
| Read all memory (keys, plaintext) after vault unlock | Access keys before unlock |
| Access IndexedDB directly | Bypass keyslot derivation |
| Modify application code in memory | Break E2EE for messages in transit |
| Exfiltrate data to external server | — |

> **This is a significant risk.** Browser extensions share the same JavaScript
> execution context. If a user installs a malicious extension, all in-memory
> secrets are accessible after the vault is unlocked. Crow cannot defend against
> this within the browser threat model.

### 3.5 State-level adversary

A well-resourced adversary (nation-state intelligence) with capabilities
including: passive network interception, active relay operation, zero-day
exploits, legal compulsion of service providers.

| Can do | Mitigated? |
|---|---|
| Observe relay traffic en masse | Partially — sealed sender hides sender, but timing analysis may correlate |
| Operate relays and harvest metadata | Yes for content; **no** for metadata (see §5) |
| Compromise browser or OS | **No mitigation** within browser threat model |
| Compel TURN/relay operators | Sees encrypted media + IPs only |
| Perform timing/correlation attacks on gift wraps | Partially — hour-fuzzing and ephemeral keys raise the cost |

---

## 4. Threats per Actor (Summary)

| Threat | Passive network | Malicious relay | Device thief | Browser extension | State-level |
|---|:---:|:---:|:---:|:---:|:---:|
| Read message plaintext | ✗ | ✗ | ✗* | ✓† | ✓‡ |
| Identify sender | ✗ | ✗ (sealed sender) | ✓ (if unlocked) | ✓ | ✓ |
| Learn social graph | ✗ | Partial | ✓ (if unlocked) | ✓ | Partial |
| Decrypt past 1:1 messages | ✗ | ✗ | ✗* | ✓† | ✓‡ |
| Decrypt past MLS messages | ✗ | ✗ | ✗* | Future only§ | Future only§ |
| Modify messages in transit | ✗ | ✗ (signatures) | — | ✓ | ✓‡ |
| IP address of user | Partial | ✓ | ✓ | ✓ | ✓ |

\* Only if keyslot is brute-forced (PIN) or the vault was unlocked at time of theft.
† Only after vault is unlocked in the same session.
‡ Via OS or browser compromise; not via cryptographic attack.
§ MLS provides forward secrecy: compromise at epoch *n* does not reveal epochs < *n*.

---

## 5. Mitigations

| Threat | Mitigation | Mechanism |
|---|---|---|
| Message content exposure | E2EE | NIP-59 gift wraps + NIP-44 v2 AEAD |
| Sender identification | Sealed sender | Ephemeral key gift wrap; relay sees only recipient |
| Social graph from vault | Blinded index keys | HKDF-derived index keys; database structure does not reveal contacts |
| Timestamp correlation | Hour-fuzzing | All published timestamps truncated to the hour |
| Relay account requirements | No accounts | Crow never signs in to relays; no email, no phone |
| Metadata harvesting | No analytics | Zero telemetry, zero tracking, zero server-side logs by Crow |
| Key exfiltration from vault | Multiple keyslots | Data key wrapped per keyslot; non-extractable WebCrypto keys for biometric/device |
| Device theft | Auto-lock + keyslots | Vault re-locks after inactivity; biometric/PIN gating |
| Group forward secrecy | MLS (RFC 9420) | Key ratcheting per epoch; automatic key refresh every 14 days |

---

## 6. Residual Risks

These are risks that Crow's architecture **cannot fully eliminate** within the
browser threat model.

### 6.1 Metadata leakage to relays

Relays see recipient public keys, hour-fuzzed timestamps, and payload sizes.
Over time, a relay operator can build a partial social graph and infer
communication patterns. This is an inherent limitation of the Nostr relay model;
mitigations (sealed sender, hour-fuzzing) reduce but do not eliminate it.

The table below lists what a relay currently observes for a gift-wrapped 1:1
message and which code mitigations apply. "FS" means the item changes once a
conversation has been upgraded to MLS forward secrecy.

| Relay-visible item | Mitigation in code | Notes |
|---|---|---|
| Recipient public key (kind 1059 `p` tag) | Ephemeral gift-wrap key; recipient inbox key is public by design | No way to hide the recipient of a delivery |
| Sender public key | Sealed sender: kind 1059 is signed by a one-time key | NIP-59 hides the real sender from relays |
| Timestamp | Fuzzed up to 2 days backward (`giftwrap.ts`) | Hides exact send time |
| Payload size | NIP-44 power-of-two-ish padding; no extra bucket padding yet | Reveals approximate content length |
| Call media path | `callRelayOnly` forces WebRTC through TURN | Direct calls expose both IPs |
| 1:1 conversation forward secrecy | MLS upgrade via `startMls1To1` | Upgraded chats use epoch-ratcheted MLS keys |

### 6.2 IP exposure on direct WebRTC connections

When the user enables "Use direct connections when possible" (Settings →
Privacy), both parties learn each other's IP address. If the connection falls
back to a TURN server, the TURN server also sees both IPs.

### 6.3 No forward secrecy for one-to-one conversations

1:1 messages use static Diffie-Hellman via NIP-44. If either party's identity
key is compromised, **all past and future messages** in that conversation can be
decrypted. MLS groups are the forward-secret alternative, but they are limited
to group conversations.

### 6.4 PIN brute-force attack

If an attacker copies the raw IndexedDB files from the browser profile, they can
attempt offline brute-force against the PIN keyslot. A 4–6 digit PIN has
limited entropy (10⁴–10⁶ possibilities). The scrypt KDF (N = 2¹⁶, r = 8, p = 1)
raises the cost per guess, but a determined attacker with GPU resources can
still exhaust a short PIN in practical time.

**Recommendation:** Use a passphrase or biometric keyslot. A strong passphrase
makes offline brute-force infeasible.

### 6.5 Service worker has no vault access

The service worker (PWA offline support) cannot access the encrypted vault. It
can only cache static assets. This means:

- No push notifications while the app is closed.
- No background message fetching or processing.

This is by design (it limits the attack surface) but is also a functional
limitation.

### 6.6 Browser extension compromise

As noted in §3.4, a malicious browser extension sharing the same origin can
read all in-memory secrets after vault unlock. There is no mitigation within
the browser's security model. Users who require protection against this threat
should use a dedicated browser profile with no extensions.

### 6.7 Device/OS compromise

If the device operating system is compromised (malware, root exploit), all
secrets in memory and on disk are accessible. Crow cannot defend against this;
defense is the operating system's responsibility.

---

## §3.1 IndexedDB Forward-Secrecy Constraints

Crow stores decrypted messages in IndexedDB so they can be displayed without
re-decrypting on every read. IndexedDB is a persistent store with no built-in
forward-secrecy mechanism:

- **Deleted records may persist** in IndexedDB's internal journal or in browser
  backups until the database is compacted or the browser evicts the data.
- **No guaranteed secure erase.** The browser does not provide a way to
  cryptographically erase data from disk. When a message is deleted from the
  vault, the application overwrites the record, but the underlying storage may
  retain remnant data until the page is reclaimed by the filesystem.
- **MLS key ratcheting protects future messages** but does not erase past
  ciphertext already stored in IndexedDB. Forward secrecy at the protocol level
  (MLS) prevents a later key compromise from decrypting old protocol messages,
  but if the vault was already unlocked and the plaintext stored, the plaintext
  remains in IndexedDB until explicitly deleted and the browser reclaims the
  space.
- **Mitigation in practice:** Users can set message retention policies
  (Settings → Privacy → "Keep message history") to have relays drop messages
  after a chosen period, and can delete local messages or the entire vault at
  any time. However, cryptographic erasure of individual records from the
  underlying storage medium is not possible within the browser sandbox.

This constraint is noted in source code comments in `core/vault/db.ts` and is an
inherent limitation of all browser-based encrypted storage.

---

## 7. References

- [SECURITY.md](./SECURITY.md) — cryptographic primitives and security model
- [PRIVACY.md](./PRIVACY.md) — data handling and privacy practices
- [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md)
- [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [RFC 9420](https://www.rfc-editor.org/rfc/rfc9420) — MLS Protocol
