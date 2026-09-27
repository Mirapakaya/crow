# Crow Threat Model

## Adversary Classes

| Adversary | Capabilities | Motivation |
|-----------|-------------|------------|
| Malicious relay operator | Read/modify/drop relay traffic | Surveillance, censorship |
| Compromised Vercel/hosting | Serve modified JS, read deployment config | Mass surveillance |
| Network observer | Monitor IP, timing, metadata | Traffic analysis |
| Malicious contact | Decrypt messages addressed to them | Social engineering |
| Compromised contact device | All contact's decryption keys | Targeted surveillance |
| Stolen unlocked device | Full access to decrypted vault | Physical theft |
| Stolen locked device | Encrypted IndexedDB, keyslot data | Offline brute force |
| Malicious browser extension | DOM access, content script injection | Data theft |
| State-level adversary | Network monitoring, legal compulsion, zero-day exploits | Mass surveillance |
| Quantum computer (future) | Break ECDH (secp256k1) | Retroactive decryption |

## Detailed Threat Analysis

### T1: Malicious Relay

**Scenario**: A relay operator modifies, logs, or withholds messages.

| Aspect | Status |
|--------|--------|
| Read message content | **PROTECTED** — Relay receives only ciphertext |
| Identify participants | **NOT PROTECTED** — Pubkeys visible in gift wrap tags |
| Modify messages | **PROTECTED** — Event signatures verify integrity |
| Drop messages | **NOT PROTECTED** — Multi-relay mitigates but cannot prevent |
| Replay messages | **PROTECTED** — ReplayGuard rejects duplicates |
| Insert fake messages | **PROTECTED** — Signatures require sender's private key |

### T2: Compromised Hosting (Vercel)

**Scenario**: Vercel is compromised or compelled to serve modified JavaScript.

| Aspect | Status |
|--------|--------|
| Inject key-logging code | **NOT PROTECTED** — Browser executes served JS |
| Read plaintext | **NOT PROTECTED** — If JS modified, can access decrypted data |
| Read private keys | **NOT PROTECTED** — Modified JS can export keys from memory |
| Access local vault | **PARTIALLY PROTECTED** — Vault encrypted at rest; but modified JS can exfiltrate on unlock |
| Mitigation | Subresource Integrity (SRI), code signing, reproducible builds (future) |

### T3: Network Observer

**Scenario**: An adversary monitors network traffic between the browser and relays.

| Aspect | Status |
|--------|--------|
| Read message content | **PROTECTED** — All connections are WSS (TLS) |
| See participant pubkeys | **PARTIALLY PROTECTED** — TLS hides from passive observer; relay sees after TLS termination |
| See IP addresses | **NOT PROTECTED** — IP visible to relay and network |
| See message timing | **NOT PROTECTED** — Timestamps visible |
| See message sizes | **NOT PROTECTED** — Ciphertext sizes observable |
| See connection patterns | **NOT PROTECTED** — WebSocket connections visible |

### T4: Malicious Contact

**Scenario**: A contact you're messaging with is malicious.

| Aspect | Status |
|--------|--------|
| Read their own messages | **NOT PROTECTED** — By design, recipients can decrypt |
| Read other people's messages | **PROTECTED** — Cannot decrypt 1:1 messages not addressed to them |
| Forward decrypted content | **NOT PROTECTED** — Screenshots, copy/paste |
| Impersonate to others | **PARTIALLY PROTECTED** — Safety number verification detects key substitution |

### T5: Compromised Contact Device

**Scenario**: An adversary has full access to your contact's device.

| Aspect | Status |
|--------|--------|
| Decrypt all messages to that contact | **NOT PROTECTED** |
| Send messages as that contact | **NOT PROTECTED** |
| Know your public key | **NOT PROTECTED** (public information) |
| Decrypt YOUR messages to OTHER contacts | **PROTECTED** — Separate keys per conversation |

### T6: Stolen Unlocked Device

**Scenario**: Your phone/laptop is stolen while Crow is unlocked.

| Aspect | Status |
|--------|--------|
| Read all messages | **NOT PROTECTED** — Vault is decrypted in memory |
| Send messages as you | **NOT PROTECTED** — Session is active |
| Export private keys | **NOT PROTECTED** — Keys in memory |
| Mitigation | Lock vault when idle; reduce timeout; biometric re-auth |

### T7: Stolen Locked Device

**Scenario**: Your device is stolen after vault is locked.

| Aspect | Status |
|--------|--------|
| Read messages from IndexedDB | **PARTIALLY PROTECTED** — Encrypted; weak passphrase vulnerable to brute force |
| Brute force passphrase | **PARTIALLY PROTECTED** — scrypt slows attack; weak passphrases vulnerable |
| Brute force PIN | **PARTIALLY PROTECTED** — Higher scrypt params; 4-6 digit PIN has limited entropy |
| Read blind indexes | **NOT PROTECTED** — HMAC indexes reveal record existence |

### T8: Malicious Browser Extension

**Scenario**: A browser extension with content script access injects into the Crow page.

| Aspect | Status |
|--------|--------|
| Read decrypted messages from DOM | **NOT PROTECTED** |
| Access JavaScript context | **NOT PROTECTED** — Same origin |
| Read IndexedDB | **PARTIALLY PROTECTED** — Encrypted records; but can access when vault is unlocked |
| Mitigation | Browser extension permissions; use separate browser profile |

### T9: Key Substitution / MITM

**Scenario**: An adversary intercepts an invite and substitutes their own key.

| Aspect | Status |
|--------|--------|
| Intercept invite | **PARTIALLY PROTECTED** — Invite contains only public key |
| Substitute key | **NOT PROTECTED** — Without out-of-band verification |
| Detect via safety number | **PROTECTED** — If users verify safety numbers |

### T10: Replay Attack

**Scenario**: An adversary resends a previously valid encrypted message.

| Aspect | Status |
|--------|--------|
| Exact replay | **PROTECTED** — ReplayGuard rejects duplicate message ID + nonce |
| Modified timestamp | **PROTECTED** — Event signature covers timestamp |

### T11: Forward Secrecy Compromise

**Scenario**: A long-term key is compromised. Can past messages be decrypted?

| Aspect | Status |
|--------|--------|
| Gift wrap ephemeral keys | **PROTECTED** — Each message uses unique ephemeral key |
| Conversation key (NIP-44) | **NOT PROTECTED** — Static shared secret; compromise reveals all messages |
| MLS groups | **PROTECTED** (when implemented) — Key evolution via epoch ratcheting |

### T12: Post-Compromise Security

**Scenario**: After a key compromise, can future messages be protected?

| Aspect | Status |
|--------|--------|
| 1:1 conversations | **NOT PROTECTED** — Static shared secret; new key pair required |
| MLS groups | **PROTECTED** (when implemented) — Key update creates new epoch |

### T13: Quantum Computer

**Scenario**: A future quantum computer breaks secp256k1 ECDH.

| Aspect | Status |
|--------|--------|
| Current ECDH keys | **NOT PROTECTED** — Classical ECDH is quantum-vulnerable |
| Retroactive decryption | **NOT PROTECTED** — If ciphertext is stored, future quantum computer can decrypt |
| Mitigation | Hybrid ML-KEM-768 + X25519 architecture planned |
| Honest claim | "Architecture supports post-quantum migration; not currently quantum-protected" |

### T14: WebRTC IP Exposure

| Aspect | Status |
|--------|--------|
| Direct peer IP | **NOT PROTECTED** — Visible during WebRTC calls |
| Via TURN server | **PARTIALLY PROTECTED** — Peer sees TURN server IP, not yours |
| Mitigation | Configure TURN; document IP implications in call UI |

### T15: Metadata Exposure

| What is exposed | To whom |
|----------------|---------|
| Sender public key | Relay, network observer (after TLS) |
| Recipient public key | Relay (in gift wrap tags) |
| Message timestamp | Relay |
| Message size | Relay, network observer |
| IP address | Relay, network observer |
| Connection pattern | Relay, network observer |
| Contact list | NOT exposed to relay (stored locally) |
| Group membership | NOT exposed to relay (encrypted) |
| Message content | NOT exposed to anyone without decryption key |

## Summary Matrix

| Threat | Protected | Partially | Not Protected |
|--------|-----------|-----------|---------------|
| Malicious relay reads messages | ✅ | | |
| Malicious relay drops messages | | | ❌ |
| Compromised hosting | | | ❌ |
| Network reads messages | ✅ | | |
| Network sees IP | | | ❌ |
| Network sees metadata | | ❌ | |
| Malicious contact reads own messages | | | ❌ (by design) |
| Malicious contact reads others' messages | ✅ | | |
| Compromised contact device | | | ❌ |
| Stolen unlocked device | | | ❌ |
| Stolen locked device | | ❌ | |
| Malicious browser extension | | ❌ | |
| Key substitution (MITM) | | ❌ | |
| Replay attacks | ✅ | | |
| Forward secrecy (1:1) | | ❌ | |
| Forward secrecy (MLS groups) | ✅ | | (when implemented) |
| Post-compromise security (1:1) | | | ❌ |
| Post-compromise security (MLS) | ✅ | | (when implemented) |
| Quantum attacks | | | ❌ |
| WebRTC IP leak | | ❌ | |
| Metadata exposure | | ❌ | |
