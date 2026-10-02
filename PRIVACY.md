# Crow Privacy Documentation

> **Version:** 3.0.0 · **Last updated:** 2026-10-01

Crow is a static web page. There is no Crow server, no account database, and no
analytics. Here is precisely what goes out over the network, and what each party
can see.

---

## 1. Data Minimisation

Crow collects the absolute minimum required to function:

| Category | Crow's approach |
|---|---|
| **Accounts** | None. No sign-up, no email, no phone number. |
| **Server database** | None. Crow operates no servers. |
| **Analytics** | None. Zero telemetry, zero tracking pixels, zero third-party analytics. |
| **Crash reporting** | None. No Sentry, no Firebase, no automatic error reports. |
| **Advertising** | None. |
| **Device fingerprinting** | None. |

Your identity is a locally generated cryptographic key pair. No personal
information is required or requested to start using Crow.

---

## 2. Local Data

All data is stored in the user's browser. Crow never sends it anywhere unless
the user explicitly initiates an action (sending a message, making a call, etc.).

### 2.1 Encrypted vault (IndexedDB)

| Data | Encrypted? | Notes |
|---|---|---|
| Identity private key | Yes | Wrapped by keyslot keys; never stored plaintext |
| Contact keys and names | Yes | Index keys are HKDF-blinded; database structure does not reveal contacts |
| Message plaintext | Yes | Per-record encryption under vault data key |
| Message metadata (timestamps, status) | Yes | Stored inside encrypted records |
| Group memberships | Yes | Part of the encrypted vault |
| Sticker packs | Yes | Stored in encrypted vault records |

The vault is unlocked only when the user authenticates via one of their
configured keyslots (biometric, PIN, passphrase, recovery phrase, or device
unlock). It re-locks automatically after a period of inactivity.

### 2.2 Unencrypted local storage (localStorage)

| Data | Why unencrypted? |
|---|---|
| Display preferences (theme, language) | Not sensitive; needed before vault unlock |
| Notification permission state | Browser API state |
| Last-used relay list hints | Non-sensitive routing hints |

These preferences contain no personal, identifying, or message data.

---

## 3. Network Data

### 3.1 Messages to relays

When you send a message, Crow publishes a **gift-wrapped event** to your
relays. The structure is:

```
Gift wrap (kind 1059)
├── recipient public key     ← visible to relay
├── hour-fuzzed timestamp    ← visible to relay (±1 hour)
├── payload size             ← visible to relay
└── NIP-44 encrypted body
    ├── Seal (signed by sender)
    │   └── NIP-44 encrypted rumor
    │       └── plaintext message  ← NEVER visible to relay
    └── (sender identity revealed only to recipient)
```

### 3.2 What relays see

Relays are public servers that hold encrypted messages until you fetch them.
They **cannot** read message content. They **can** observe:

| Visible to relay | Not visible to relay |
|---|---|
| Recipient public key | Message plaintext |
| Hour-fuzzed timestamp | True send time (±1 hour) |
| Encrypted payload size | Message type, structure, attachments |
| Ephemeral publishing key | Real sender identity (sealed sender) |
| Read/write frequency patterns | Contact names, message content |
| WebSocket connection IP | — |

> **Note:** You choose which relays to use. Different relay operators have
> different retention and logging policies. Crow does not control relay behaviour.

### 3.3 What TURN servers see

When a direct WebRTC connection cannot be established, calls may be relayed
through a TURN server:

| Visible to TURN server | Not visible to TURN server |
|---|---|
| IP addresses of both parties | Audio/video content (DTLS-SRTP encrypted) |
| Connection duration and byte count | Call metadata beyond transport |

### 3.4 What WebRTC peers see

When you accept a direct connection, the other party learns your IP address.
This is inherent to all peer-to-peer connections. You can disable direct
connections in Settings → Privacy.

---

## 4. What We Never See

**We operate no servers.** There is no Crow backend, no Crow database, no Crow
logging infrastructure. We have no ability to:

- Read your messages
- See who you talk to
- Track your usage patterns
- Access your vault
- Reset your passphrase or recovery phrase
- Identify you or your contacts

We cannot comply with data requests because we hold no data. There is no server
to subpoena, no database to query, no logs to analyse.

---

## 5. Data Retention

| Data | Retention | Controller |
|---|---|---|
| **Vault (IndexedDB)** | Until you delete it or the browser evicts it | You. No server copy exists. |
| **Messages on relays** | Per relay's own retention policy | The relay operator. Crow requests expiry via NIP-01 `expiration` tags if you set a retention period, but not all relays honour it. |
| **Browser cache / service worker** | Until browser evicts or you clear site data | You and the browser. |
| **Backup files** | Until you delete them | You. Backups are encrypted files you download; we never see them. |

### Browser storage volatility

Browsers may clear website storage to reclaim disk space. Safari in particular
tends to evict IndexedDB after approximately 7 days without a site visit. There
is no server copy to restore from. Users should:

1. Keep their twelve-word recovery phrase on paper.
2. Export encrypted backups periodically (Settings → Data → Export backup).

---

## 6. Cross-Border Data

Relay servers may be operated in any jurisdiction worldwide. The user chooses
which relays to connect to, and relay locations are not verified or guaranteed
by Crow. Messages passing through a relay may be subject to the legal framework
of the jurisdiction in which that relay operates.

Because messages are end-to-end encrypted, the relay operator cannot read the
content regardless of jurisdiction. However, metadata (recipient keys, timestamps,
payload sizes) visible to the relay may be subject to local data-retention laws.

Crow itself does not route, store, or process any user data. No Crow-controlled
servers exist in any jurisdiction.

---

## 7. Children

Crow is not designed for, or directed at, children under the age of 13. We do
not knowingly collect personal information from children.

Because Crow requires no account, no email, and no personal information to use,
there is no mechanism to verify a user's age. This is a consequence of the
no-account architecture: age verification would require collecting identifying
information, which contradicts Crow's privacy model.

*[OPEN QUESTION: Whether additional notices or age-gates are required under
COPPA, the UK Age Appropriate Design Code, or similar frameworks given the
no-account architecture.]*

---

## 8. Regulatory Compliance Notes

Crow's architecture was designed for privacy by default. The following notes
identify how major privacy frameworks interact with Crow's design, and mark
open questions where legal determination has not yet been made.

### 8.1 GDPR (EU General Data Protection Regulation)

| Principle | Crow's position | Status |
|---|---|---|
| **Data controller** | Crow operates no servers and holds no user data. The user may be the controller of their own data. | *[OPEN QUESTION: Whether the Crow project is a controller or processor under GDPR given the no-server architecture.]* |
| **Lawful basis** | No personal data is collected by Crow. | *[OPEN QUESTION: Whether relay operators are independent controllers.]* |
| **Right to access / erasure** | Users can delete all data locally at any time. No server-side data exists for Crow to erase. | Satisfied by architecture. |
| **Data Protection Impact Assessment** | E2EE, no accounts, minimal data by design. | *[OPEN QUESTION: Whether a formal DPIA should be published.]* |
| **International transfers** | Users choose their relays; Crow does not transfer data. | *[OPEN QUESTION: Whether providing the application constitutes a transfer.]* |

### 8.2 CCPA (California Consumer Privacy Act)

| Right | Crow's position | Status |
|---|---|---|
| **Know / access** | No data is collected or held by Crow. | N/A by architecture. |
| **Delete** | Users delete all data locally. | Satisfied by architecture. |
| **Opt-out of sale** | No data is sold. No data is collected. | N/A. |
| **Non-discrimination** | No services are conditioned on data collection. | N/A. |

*[OPEN QUESTION: Whether Crow qualifies as a "business" under CCPA given that
no personal information is collected or sold.]*

### 8.3 DPDP (India Digital Personal Data Protection Act, 2023)

*[OPEN QUESTION: Crow's obligations under DPDP have not yet been determined.
The no-server, no-account architecture likely places Crow outside the scope of
a "data fiduciary," but this has not been formally assessed.]*

---

## 9. Changes to This Document

Significant changes to this privacy document will be noted here by date. Minor
clarifications may be made without notice.

| Date | Change |
|---|---|
| 2026-10-01 | Initial publication. |

---

## 10. Contact

For privacy-related questions:

- **Email:** crow@w8n.pw
- **GitHub:** <https://github.com/Mirapakaya/crow/issues>

We do not have a Data Protection Officer because we do not operate as a data
controller.

---

## References

- [SECURITY.md](./SECURITY.md) — security architecture and cryptographic details
- [THREAT-MODEL.md](./THREAT-MODEL.md) — adversary analysis and residual risks
- [LEGAL.md](./LEGAL.md) — legal overview and licensing
