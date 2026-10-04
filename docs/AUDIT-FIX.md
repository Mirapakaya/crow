# Crow Audit Fix

> Honest status of every verified finding from the 2026-10-04 fix pass.

**Scope:** Crow Web Messenger v3.0.0 (`altercpre/crow`).

**Rules for this document:**
- A status is `OPEN` until a phase gate proves the fix with a passing command.
- A status is `DEFERRED` only when the user-approved decision log (docs/DECISIONS.md) says so.
- No finding may be marked fixed by documentation alone unless the fix is purely a documentation claim.

## Legend

| Status | Meaning |
|--------|---------|
| OPEN | Not yet fixed; evidence required in the phase gate. |
| PARTIAL | Some remediation started; not yet passing all required checks. |
| DEFERRED | Intentionally delayed with a recorded decision and plan. |
| CLOSED | Fix verified by the phase gate and the evidence is pasted in PROGRESS-FIX.md. |

## Critical

### C1 — "Hybrid PQ" is not real

**Finding:** `hybridKem.ts` derives a 32-byte seed from an X25519 + ML-KEM-768 handshake, but `MlsRuntime.createGroup` / `MarmotGroup.create` only use it as local creation `entropy`. The MLS key schedule and Welcome HPKE remain X25519-only. The responder never uses the seed. UI and `protection.hybridPQ` still claim hybrid PQ.

**Current claim in UI/docs:** README lists "Hybrid key exchange: X25519 + ML-KEM-768". `ChatView` shows a "Hybrid PQ" badge after an MLS upgrade.

**Fix plan (F3):** Bind the hybrid secret into MLS. Preferred: an MLS external PSK in the first commit (check ts-mls 1.6.4 PSK support). Fallback: an outer XChaCha20-Poly1305 layer on every MLS app message keyed by `HKDF(MLS exporter("crow-hybrid"), hybridSecret, epoch)`, with a hash-ratchet each epoch and weekly hybrid handshake re-run. Tests must prove wrong secret fails, both sides derive the same key, and ciphertext changes with the secret. Until then, set `hybridPQ: false` everywhere and remove the badge and README claim.

**Status:** OPEN (F3)

### C2 — Padding is broken

**Finding:** `giftwrap.ts` `padToBucket` pads the base64 NIP-44 ciphertext with `\0`. On the wire these become `\u0000` runs that relays strip, revealing the exact original length and making buckets imaginary.

**Fix plan (F4):** Pad the plaintext inside NIP-44 (wrapper `{r: rumor, p: padString}`) so the wire event length lands in buckets 1K/4K/16K/64K. Receive path accepts old and new formats. Delete the NUL padding on ciphertext.

**Status:** OPEN (F4)

### C3 — CSP is weak

**Finding:**
- `script-src 'self' 'unsafe-inline'`
- `style-src 'self' 'unsafe-inline'`
- `connect-src wss: https:` (any host)
- No `frame-ancestors` or `X-Frame-Options` in static export (Next `headers()` are dropped).
- No Trusted Types.
- Next static export inlines bootstrap scripts; a strict CSP needs build-time hashes.

**Fix plan (F2):** Generate per-build hashes for all inline scripts/styles. Tighten CSP to `default-src 'none'` plus specific sources. Add host headers (`_headers`, `vercel.json`, etc.) with `frame-ancestors 'none'`, `Referrer-Policy no-referrer`, COOP, CORP, HSTS, no-store/immutable cache. Add Trusted Types. Add a JS frame-guard for hosts without headers.

**Status:** OPEN (F2)

### C4 — Identity secretKey sits in the main-thread Zustand store

**Finding:** `store.ts` keeps the 32-byte Nostr `secretKey` in the main-thread Zustand store. Only the KDF runs in a Worker; the signing secret is exposed to any same-page script.

**Fix plan (F3):** Move the secret key into `identity.worker.ts`. Main thread holds a handle exposing only `sign`, `nip44.encrypt/decrypt`, and `unwrap`. Lock terminates the worker. Test: no 32-byte secret in store state; grep finds `secretKey` only in worker/vault modules.

**Status:** OPEN (F3)

## High

### H1 — Deploy files missing

**Finding:** PROGRESS.md claims Dockerfile, nginx.conf, .dockerignore were added. They do not exist. No Render/Fly/Railway/Netlify configs, no header generator.

**Fix plan (F1):** Create Dockerfile, nginx.conf, .dockerignore, vercel.json, public/_headers, render.yaml, fly.toml, railway.json, docker-compose.yml, docs/DEPLOY.md, scripts/gen-headers.mjs, scripts/check-headers.mjs. CI must build the Docker image.

**Status:** OPEN (F1)

### H2 — No package-lock.json / CI not reproducible

**Finding:** `package-lock.json` was gitignored. CI used `npm install --legacy-peer-deps`. No audit gate.

**Fix plan (F0):** Generate `package-lock.json`, remove from `.gitignore`, switch CI to `npm ci`, fix the `@noble/post-quantum` peer conflict. Add audit gate in CI or F9.

**Status:** CLOSED (F0 — lockfile generated, CI switched to `npm ci`, peer conflict fixed by aligning `@noble/post-quantum` to `0.5.2`).

### H3 — Base-path bugs and branch mismatch

**Finding:** `layout.tsx` loads `/theme.js` absolute. `manifest.json` has `start_url: "/"`, breaking under `CROW_BASE_PATH=/crow`. Workflows trigger only on `S1011H`.

**Fix plan (F1):** Add `withBase()` helper, load `theme.js` through it, recompute SRI at postbuild, make manifest paths relative, update workflows to `main`, test builds with/without base path.

**Status:** PARTIAL (F0 — workflows updated to `main`; remaining work in F1)

### H4 — Legacy migration deleted

**Finding:** `src/core/legacy/` and migration were deleted. Existing Textor/old-vault users lose data silently.

**Fix plan (F3):** Restore a tested legacy-data import path (Textor vault/localStorage) with fixtures.

**Status:** OPEN (F3)

### H5 — Test gaps / Argon2id timeouts / no coverage thresholds

**Finding:** Only 18 test files. No tests for vault/keyslots, blobCrypto, MLS/Marmot, messenger, relayPool, calls, invite parsing, CSP/headers. 3 Argon2id tests time out on weak devices. No coverage thresholds.

**Fix plan (F8):** Add tests for the missing areas. Inject tiny Argon2id params in tests. Add vitest coverage thresholds.

**Status:** OPEN (F8)

### H6 — Docs contradict code

**Finding:** README lists hybrid key exchange. SECURITY.md says 1:1 has no forward secrecy and lists only the classical MLS suite. PROGRESS.md claims P1-P9 passed, but many phases were skipped/partial (P2 skipped primitives/design page, P3 only added a filter and delete, P6 skipped inbox keys and cover traffic, P7 only added a meta CSP and SRI, P9 only ran npm audit).

**Fix plan (F0):** Update README/SECURITY/PROGRESS to match the current code and the findings in this document. Reset false "GATE PASSED" lines.

**Status:** CLOSED (F0 — docs updated in this pass; ongoing honesty enforced by each phase gate)

## Medium

### M1 — Publish jitter is too short

**Finding:** Relay pool uses 200 ms jitter, which provides little timing decorrelation.

**Fix plan (F4):** Random 0.5-5 s jitter, user setting Off/Low/High, independent per relay, publish to a random subset of at least 2 write relays.

**Status:** OPEN (F4)

### M2 — Missing tamper detection / privacy blur / auto-clear / hold-to-reveal / Security Center / Trusted Types

**Finding:** None of these defenses exist.

**Fix plan (F6):** Add `bootstrap.ts` tamper check, privacy blur, clipboard auto-clear, hold-to-reveal recovery phrase, Security Center screen, Trusted Types in CSP.

**Status:** OPEN (F6)

### M3 — Referrer-Policy and Permissions-Policy are weak

**Finding:** Referrer-Policy is `strict-origin-when-cross-origin` (want `no-referrer`). Permissions-Policy only allows, does not deny the rest.

**Fix plan (F2):** Set `Referrer-Policy: no-referrer`. Use `Permissions-Policy` deny-all except camera/mic/geolocation=(self).

**Status:** OPEN (F2)

### M4 — QrCode uses dangerouslySetInnerHTML; inline styles block CSP hardening

**Finding:** `QrCode` uses `dangerouslySetInnerHTML`. Components use inline `style={{}}` (e.g. `ChatList`), which blocks removing `style-src 'unsafe-inline'`.

**Fix plan (F2/F7):** Render QR as React nodes/canvas. Replace inline style props with Tailwind classes.

**Status:** OPEN (F2/F7)

### M5 — Vazirmatn from next/font/google needs network at build

**Finding:** `next/font/google` Vazirmatn fetches from Google at build, breaking offline/Termux builds.

**Fix plan (F2):** Self-host Vazirmatn (local woff2 or @fontsource).

**Status:** OPEN (F2)

### M6 — Calls flaws

**Finding:**
- Default STUN is Google + Cloudflare, leaking IP to third parties and violating the "zero third-party requests" rule.
- `callSession.receive` applies `setRemoteDescription` before the fingerprint check.
- Future-dated rumor timestamp passes the ring-window check.
- No per-peer offer rate limit.

**Fix plan (F5):** Remove built-in STUN. Check fingerprint before `setRemoteDescription`. Reject offers with `at` > 60 s in the future. Rate-limit offers per peer. Stop all tracks on end; improve permission-denied UX.

**Status:** OPEN (F5)

### M7 — Profile frames not gated on accepted; relay pre-warming from strangers

**Finding:** Profile frames are not gated on `accepted`. Their `relays` list is stored per contact and later pre-warmed, so a stranger can make the client connect to relays they choose. No ws:// or private-host rejection seen in `relayUrl.ts`.

**Fix plan (F5):** Gate profile frames on accepted contacts. Never pre-warm a frame-supplied relay until the user accepts. Reject ws:// (except localhost in dev), loopback, and private-range hosts; cap the list at 6.

**Status:** OPEN (F5)

## UI (static review)

### U1 — Two divergent design systems

**Finding:** ~3,200 lines of hand CSS (app.css, chat.css, theme.css) plus a Tailwind/shadcn bridge in globals.css with hard-coded HSL that diverges from theme.css.

**Fix plan (F7):** Delete invented ramps and the HSL bridge. Use one token source.

**Status:** OPEN (F7)

### U2 — Colors are invented, not Geist

**Finding:** Custom `--n-0..950`, `--n-dark-*`, inverted blue scale, etc.

**Fix plan (F7):** Rebuild `tokens.css` with Geist names and values.

**Status:** OPEN (F7)

### U3 — Mixed icon sets

**Finding:** lucide-react + custom `Icons.tsx` + calls/icons.tsx with different sizes/strokes.

**Fix plan (F7):** Unify on lucide-react; delete/reconcile duplicates.

**Status:** OPEN (F7)

### U4 — Telegram parity partial

**Finding:** Filters only All/Unread/Groups/Contacts; no archive, mute, folders, drawer menu, Saved Messages, or right info panel.

**Fix plan (F7):** Add Telegram-parity shell: folders, archive, mute, drawer, Saved Messages, right info panel.

**Status:** OPEN (F7)

### U5 — Ad-hoc inline margins / no design page / no screenshot tests

**Finding:** Inline margins and one-off CSS instead of tokens. No `/design` page or screenshot tests.

**Fix plan (F7):** Tokenize spacing, create `/design` page, add screenshot tests.

**Status:** OPEN (F7)
