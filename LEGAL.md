# Crow Legal Overview

> **Version:** 3.0.0 · **Last updated:** 2026-10-01

This document provides a summary of the legal framework applicable to the Crow
messenger application. It is **not** legal advice. For specific questions, consult
a qualified attorney in the relevant jurisdiction.

---

## 1. Summary of Legal Documents

| Document | Location | Purpose |
|---|---|---|
| Terms of Service | `/legal/terms` | Terms governing use of the Crow application |
| Privacy Policy | `/legal/privacy` | Data handling and privacy practices (also see [PRIVACY.md](./PRIVACY.md)) |
| Acceptable Use Policy | `/legal/acceptable-use` | Permitted and prohibited uses |
| Export Control Notice | `/legal/export` | Cryptographic export considerations |

---

## 2. Source Code License

Crow's application source code is licensed under:

### GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)

```
SPDX-License-Identifier: AGPL-3.0-or-later
```

**Key implications:**

- You may use, study, modify, and redistribute the source code.
- If you run a modified version as a network service (e.g., a web app accessible
  to others), you **must** make the complete modified source code available to
  those users under the same license.
- Copyleft applies: derivative works must also be licensed under AGPL-3.0-or-later.
- There is **no** warranty; the software is provided "as is."

The full license text is available at:
<https://www.gnu.org/licenses/agpl-3.0.en.html>

---

## 3. Crow Name and Visual Identity

The **Crow name**, **logo**, and **visual identity** are **NOT** licensed under
AGPL-3.0-or-later. They are the intellectual property of the Crow project and
may not be used without explicit written permission.

Specifically:

- You **may not** use the Crow name or logo to endorse or promote products
  without permission.
- You **may not** use the Crow branding in a way that implies official
  affiliation or endorsement.
- Modified versions of the software should **not** use the Crow name or logo
  unless expressly authorised.

For branding and trademark enquiries:
**crow@w8n.pw**

---

## 4. Third-Party Dependencies

Crow includes third-party open-source libraries. Each library retains its own
license. A complete list of dependencies, their versions, and license details is
available in [THIRD-PARTY-NOTICES](./THIRD-PARTY-NOTICES).

Key license types among dependencies:

| License | Examples |
|---|---|
| MIT | Next.js, React, @noble/curves, @noble/ciphers, @noble/hashes, nostr-tools, zustand |
| Apache-2.0 | (If applicable — see THIRD-PARTY-NOTICES) |
| ISC | lucide-react |
| AGPL-3.0 | @ducanh2912/next-pwa |

---

## 5. Legal Entity

**[OPEN QUESTION]**

No legal entity has been established for the Crow project at this time. All
development is conducted by individual contributors. The implications of this
include:

- There is no corporate shield for liability; individual contributors may bear
  personal legal exposure.
- The project cannot enter into contracts, hold trademarks, or open bank
  accounts in its own name.
- Jurisdiction and governing law are tied to individual contributors' locations.

*Status: The establishment of a legal entity (e.g., a non-profit foundation or
LLC) is under consideration. This section will be updated when resolved.*

---

## 6. Governing Law

**[OPEN QUESTION]**

No governing law or jurisdiction has been determined for disputes related to the
Crow project. This decision depends on:

- Whether and where a legal entity is established.
- The jurisdictions of primary contributors and users.
- Applicable consumer protection and mandatory law considerations.

*Status: To be determined upon establishment of a legal entity or as otherwise
required. This section will be updated when resolved.*

---

## 7. Export Control Considerations

Crow uses standard, publicly available cryptographic primitives:

- **secp256k1** (elliptic curve signatures)
- **XChaCha20-Poly1305** (authenticated encryption)
- **scrypt** (key derivation)
- **AES-256-GCM** (vault encryption)
- **X25519** (MLS key exchange)
- **SHA-256** (hashing)

These are widely deployed, publicly documented algorithms implemented in
open-source JavaScript libraries. They are not proprietary or classified.

**However:**

- Some jurisdictions restrict the export, import, or use of encryption
  technology. Examples include but are not limited to: certain countries subject
  to US export controls (EAR), EU dual-use regulations, and national
  encryption restrictions in countries such as China, Russia, Iran, and others.
- Providing encryption software to users in embargoed or sanctioned countries
  may violate export control laws (e.g., US EAR Parts 744 and 746).
- The AGPL-3.0-or-later license does not override applicable export control laws.

**Users and distributors are responsible for complying with all applicable
export, import, and encryption laws in their jurisdiction.** The Crow project
makes no representation regarding the legal status of the software in any
particular jurisdiction.

*[OPEN QUESTION: Whether a formal export control classification (ECCN) or
self-classification notice should be published.]*

---

## 8. Disclaimer of Warranty

```
CROW IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 9. Contact

| Enquiry type | Contact |
|---|---|
| General legal | crow@w8n.pw |
| Trademark / branding | crow@w8n.pw |
| Vulnerability reporting | crow@w8n.pw (see [SECURITY.md](./SECURITY.md)) |
| Privacy | crow@w8n.pw (see [PRIVACY.md](./PRIVACY.md)) |

---

## References

- [SECURITY.md](./SECURITY.md) — security architecture
- [PRIVACY.md](./PRIVACY.md) — privacy practices
- [THREAT-MODEL.md](./THREAT-MODEL.md) — threat model
- [THIRD-PARTY-NOTICES](./THIRD-PARTY-NOTICES) — dependency licenses
- [AGPL-3.0 full text](https://www.gnu.org/licenses/agpl-3.0.en.html)
