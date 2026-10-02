# Audit Baseline

> Crow security claims vs. actual code as of 2026-10-02.

This document maps claims made in README.md, SECURITY.md, THREAT-MODEL.md, and PRIVACY.md to the current implementation, listing mismatches that must be fixed.

## 1. Fuzz / timestamp claims

**Claim (SECURITY.md §4.1, THREAT-MODEL §3.2, §5):** One-to-one timestamps are "hour-fuzzed" / "truncated to the hour".

**Code:** `src/core/crypto/giftwrap.ts`

```ts
const FUZZ_WINDOW_SEC = 2 * 24 * 60 * 60
```

**Finding:** The wrap/seal timestamp is randomized backwards by up to **48 hours**, not one hour. This is not a security bug, but the docs are wrong.

**Required fix:** Update SECURITY.md, THREAT-MODEL.md, and PRIVACY.md to say "up to 2 days" and explain why (NIP-59 allows backward fuzzing; the actual window is in the code).

---

## 2. NIP-44 primitive

**Claim (SECURITY.md §2, table):** "NIP-44 v2 (XChaCha20-Poly1305 internally)" and "ChaCha20 / XChaCha20-Poly1305" for conversation encryption.

**Spec:** NIP-44 v2 uses secp256k1 ECDH → HKDF-SHA256 → **ChaCha20 + HMAC-SHA256** (encrypt-then-MAC), **not** XChaCha20-Poly1305.

**Finding:** The documentation misidentifies the AEAD. The code uses `nostr-tools/nip44` which implements the correct NIP-44 v2 construction.

**Required fix:** Correct all doc references to "ChaCha20 + HMAC-SHA256 (NIP-44 v2)". Remove any mention of Poly1305 in the NIP-44 context.

---

## 3. CSP `style-src 'unsafe-inline'`

**Claim:** SECURITY.md says "strict Content Security Policy" and the project targets a strict CSP.

**Code:** `next.config.ts`

```ts
"style-src 'self' 'unsafe-inline'"
```

**Finding:** `unsafe-inline` is present. This weakens the CSP and may allow injected styles from malicious extensions or markup.

**Required fix (P2/P7):** Remove `unsafe-inline`. Move all styles to external CSS. If Radix/shadcn inject inline styles, use CSSOM or replace the primitive.

---

## 4. Inline theme script

**Code:** `src/app/layout.tsx`

```tsx
<script dangerouslySetInnerHTML={{ __html: themeScript }} />
```

with CSP:

```ts
"script-src 'self'"
```

**Finding:** This inline script will be blocked by the CSP in a production static export unless a hash is computed and added. It is also a CSP violation because no `'unsafe-inline'` is present for scripts.

**Required fix (P2/P7):** Move the theme bootstrap to an external script (allowed by `script-src 'self'`) and/or compute and emit a CSP hash.

---

## 5. `connect-src` is too broad

**Code:** `next.config.ts`

```ts
"connect-src wss: https:"
```

**Claim:** Only user-configured relays and TURN/STUN servers should be contacted.

**Finding:** The CSP allows connections to any `wss://` or `https://` origin. This does not enforce the egress boundary.

**Required fix (P7):** Tighten to `connect-src 'self' wss:;` or, better, generate the CSP per build with the user's configured relay list. At minimum document that the host-level header should restrict this further.

---

## 6. Fonts from next/font/google (Inter)

**Code:** `src/app/layout.tsx`

```ts
import { Inter, Vazirmatn } from 'next/font/google'
```

**Spec:** Self-hosted Geist Sans + Geist Mono, keep Vazirmatn for Persian, no CDN requests.

**Finding:** `next/font/google` downloads fonts at build time from Google and self-hosts them in the build output, so there is no runtime CDN request. However, the project should still switch to Geist to match the spec and avoid depending on Google at build time.

**Required fix (P2):** Replace Inter with self-hosted Geist Sans/Mono.

---

## 7. Stack mismatch with master spec default

**Claim (MASTER-SPEC.md §1):** Default stack is Vite + React 19 + TS strict.

**Actual:** Next.js 15 App Router static export + React 19 + TS strict + shadcn/ui + Tailwind CSS.

**Finding:** The migration to Next.js has already been done. Reverting to Vite would be a large rewrite and is not justified. The stack decision is to keep Next.js static export and harden it.

**Required fix:** Record the stack decision in PROGRESS.md and DECISIONS.md.

---

## 8. No `docs/` directory existed

**Finding:** Documentation was at repository root. The spec expects a `docs/` directory.

**Required fix:** Move or mirror docs into `docs/` as work progresses (AUDIT-BASELINE.md, PROTOCOL.md, DECISIONS.md, DEPLOY.md, PENTEST-REPORT.md).

---

## 9. `.npmrc` missing `ignore-scripts=true`

**Finding:** No `.npmrc` existed. The spec requires `ignore-scripts=true` to prevent postinstall scripts.

**Required fix (P0):** Add `.npmrc` with `ignore-scripts=true` and `engine-strict=true`.

---

## 10. CI does not run `typecheck`

**Code:** `.github/workflows/ci.yml`

```yaml
- run: npm install --legacy-peer-deps
- run: npm run lint
- run: npm run test
- run: npm run build
```

**Finding:** TypeScript check is skipped. Also uses `npm install --legacy-peer-deps` instead of `npm ci`.

**Required fix (P0):** Update CI to `npm ci`, add `npm run typecheck`, and run on `feature/*` branches too.

---

## 11. Static export ignores Next.js `headers()`

**Code:** `next.config.ts`

```ts
async headers() { ... }
```

with `output: 'export'`.

**Finding:** Next.js build warning: "rewrites, redirects, and headers are not applied when exporting your application, detected (headers)." The CSP and security headers configured in `next.config.ts` are dropped during static export.

**Required fix (P7/P8):** Move the CSP and security headers into a `<meta http-equiv>` tag in `src/app/layout.tsx` and/or generate per-host header files (`vercel.json`, `_headers`, etc.) via `scripts/gen-headers.mjs`.
