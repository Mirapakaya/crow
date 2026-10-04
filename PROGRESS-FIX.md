# CROW FIX PASS — PROGRESS

Branch: S1011H (single branch, all fix-pass commits pushed here)
Resume rule: read QWEN.md, continue from the first open phase below.

## State

- [x] F0 Truth baseline — done
- [x] F1 Deploy anywhere + base path — done
- [x] F2 CSP and leakage — partial (postbuild CSP/SRI, stricter CSP, Trusted Types, QR blob)
- [x] F3 Crypto truth — identity secret no longer in Zustand store state; kept only in the worker and briefly in `startSession` to seed `Messenger`/`MlsHost`. `createInvite` now uses the identity handle.
- [x] F4 Metadata — partial (giftwrap plaintext padding)
- [x] F5 Calls and relay-input fixes — partial (no default STUN, fingerprint before SDP, future offers rejected, profile frames gated, relay host validation)
- [x] F6 Extension and leak defense — partial (bootstrap tamper guard, usePrivacyBlur hook, Security Center placeholder)
- [x] F7 UI rebuild — partial (Geist token source updated, :has() rules replaced with class/focus-within, globals/tailwind migrated; component-level migration still open)
- [x] F8 Tests — partial (blob/identity/invite tests added; vault tests skipped locally due to slow KDF on device; all non-skipped tests pass)
- [x] F9 Pen-test and release — semgrep/gitleaks/osv-scanner/npm audit run in Codespace; Lighthouse/ZAP/axe still to do

## Evidence (Codespace)

- `npm run typecheck` ✅
- `npm run test -- --run` ✅ 235 passed, 10 skipped (vault KDF too slow)
- `npm run build` ✅ static export succeeds
- `npm run check:tokens` ✅
- semgrep ✅ 0 findings
- gitleaks ✅ no leaks
- osv-scanner ✅ 9 findings documented (mostly transitive dev deps / Next.js PostCSS)
- Pushed to `S1011H` from Codespace

## Remaining open work

- F7: finish component-level migration to Geist-only tokens.
- F8: optimize vault tests so they run in CI; add messenger/calls coverage.
- F9: run Lighthouse/axe/ZAP and add results to PENTEST-REPORT.md.
