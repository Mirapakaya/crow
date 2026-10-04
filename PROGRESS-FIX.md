# CROW FIX PASS — PROGRESS

Started: 2026-10-04
Branch: crow-fix-pass
Resume rule: read QWEN.md, then jump to the first phase below that is not "DONE".

## State

- [x] F0 Truth baseline — IN PROGRESS / WAITING FOR CI
- [ ] F1 Deploy anywhere + base path
- [ ] F2 CSP and leakage
- [ ] F3 Crypto truth
- [ ] F4 Metadata
- [ ] F5 Calls and relay-input fixes
- [ ] F6 Extension and leak defense in code
- [ ] F7 UI rebuild
- [ ] F8 Tests
- [ ] F9 Pen-test and release

## F0 Truth baseline

Status: IN PROGRESS — code and docs updated; local `npm ci` timed out on Termux (storage/CPU);
CI is the verification gate (per QWEN.md rule 8).

### Done

- Generated `package-lock.json` (`npm install --package-lock-only`).
- Removed `package-lock.json` from `.gitignore`.
- Added `.npmrc` with `ignore-scripts=true` and `engine-strict=true`.
- Fixed real peer-dependency conflict: pinned `@noble/post-quantum` to `0.5.2` to satisfy `ts-mls@1.6.4` peerOptional requirement.
- Fixed three npm-12 lockfile entries that were missing a `version` for nested `es-abstract` packages.
- Updated CI workflows to use `npm ci` and trigger on `main` (was `S1011H`).
- Reset all false `GATE PASSED` lines in `PROGRESS.md` to `REOPENED — claims reset during F0 fix pass`.
- Updated `README.md`:
  - Added "Crow has not been independently audited" banner.
  - Removed the "Hybrid key exchange" row from the cryptographic primitives table.
  - Added an honest note about the premature "Hybrid PQ" label.
  - Changed `npm install --legacy-peer-deps` to `npm ci`.
- Updated `SECURITY.md`:
  - Added "not independently audited" statement.
  - Fixed NIP-44 primitive to ChaCha20 + HMAC-SHA256.
  - Changed "hour-fuzzed" to "fuzzed up to 2 days backward".
  - Added honest limitations: identity secret on main thread, CSP not yet strict, padding broken.
- Created `docs/AUDIT-FIX.md` mapping every verified finding (C1-C4, H1-H6, M1-M7, U1-U5) to status and phase owner.

### Evidence

```text
$ npm install --package-lock-only --no-ignore-scripts
up to date, audited 691 packages in 1m
13 vulnerabilities (4 moderate, 9 high)

$ npm ci
[timed out after 600s on Termux; no output before timeout]
```

### Blockers / Notes

- Local `npm ci` and `npm install` both time out on this Termux device before producing output (10 min limit). The node_modules directory is left in a partially-rewritten state.
- Verification will be performed by CI on `main` after this commit. CI runs `npm ci`, typecheck, lint, test, generate:icons, and build.
- The `ignore-scripts=true` setting intentionally skips postinstall scripts; if `sharp` or `next-pwa` native binaries are missing in a fresh CI checkout, the CI build will surface it and we will address it in F1/F2.

### Files changed

- `.npmrc` (new/updated)
- `.gitignore`
- `.github/workflows/ci.yml`
- `.github/workflows/pages.yml`
- `package.json`
- `package-lock.json`
- `README.md`
- `SECURITY.md`
- `PROGRESS.md`
- `docs/AUDIT-FIX.md` (new)
- `QWEN.md` (new)
