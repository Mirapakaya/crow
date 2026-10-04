# CROW FIX PASS — PROGRESS

Branch: S1011H (all fix-pass commits merged here)
Resume rule: read QWEN.md, continue from the first open phase below.

## State

- [x] F0 Truth baseline — merged into S1011H
- [x] F1 Deploy anywhere + base path — merged into S1011H
- [x] F2 CSP and leakage — partial (postbuild hashing, QR blob, stricter CSP, Trusted Types policy)
- [x] F3 Crypto truth — partial (removed premature Hybrid PQ badge/claims; identity worker scaffold)
- [x] F4 Metadata — partial (giftwrap plaintext padding, no NUL wire padding)
- [x] F5 Calls and relay-input fixes — partial (no built-in STUN, fingerprint before setRemoteDescription, future-dated offer rejection)
- [x] F6 Extension and leak defense — partial (bootstrap tamper guard + Trusted Types)
- [ ] F7 UI rebuild — not started
- [x] F8 Tests — partial (giftwrap, csp, withBase, identityWorker tests)
- [x] F9 Pen-test and release — partial (PENTEST-REPORT.md skeleton)

## Notes

All changes are pushed to the single `S1011H` branch on GitHub, per user request.
Remaining open work: identity worker full integration (C4), legacy migration (H4), full Geist UI rebuild (F7), and complete test/pen-test coverage.
