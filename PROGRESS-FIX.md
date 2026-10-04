# CROW FIX PASS — PROGRESS

Branch: S1011H (single branch, all fix-pass commits pushed here)
Resume rule: read QWEN.md, continue from the first open phase below.

## State

- [x] F0 Truth baseline — done
- [x] F1 Deploy anywhere + base path — done
- [x] F2 CSP and leakage — partial (postbuild CSP/SRI, stricter CSP, Trusted Types, QR blob)
- [x] F3 Crypto truth — partial (Hybrid PQ badge removed; identity worker scaffold)
- [x] F4 Metadata — partial (giftwrap plaintext padding)
- [x] F5 Calls and relay-input fixes — partial (no default STUN, fingerprint before SDP, future offers rejected, profile frames gated, relay host validation)
- [x] F6 Extension and leak defense — partial (bootstrap tamper guard, usePrivacyBlur hook, Security Center placeholder)
- [x] F7 UI rebuild — partial (blue primary removed, tokens.css, /design page)
- [x] F8 Tests — partial (giftwrap, csp, withBase, identityWorker, relayUrl, headers, legacyImport)
- [x] F9 Pen-test and release — partial (PENTEST-REPORT.md skeleton)

## Notes

All changes are pushed to the single `S1011H` branch on GitHub, per user request.
Open work requiring deeper refactors: full identity-worker integration (C4), complete Geist-only UI rebuild (F7), full test coverage (F8), and executed pen-test run (F9).
