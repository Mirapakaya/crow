# CROW FIX PASS — PROGRESS

Branch: S1011H (all fix-pass commits merged here)
Resume rule: read QWEN.md, continue from the first open phase below.

## State

- [x] F0 Truth baseline — merged into S1011H
- [x] F1 Deploy anywhere + base path — merged into S1011H
- [x] F2 CSP and leakage — partial (postbuild hashing, QR blob, stricter CSP)
- [x] F3 Crypto truth — partial (removed premature Hybrid PQ badge/claims)
- [x] F4 Metadata — partial (giftwrap plaintext padding, no NUL wire padding)
- [x] F5 Calls and relay-input fixes — partial (no built-in STUN, fingerprint before setRemoteDescription, future-dated offer rejection)
- [x] F6 Extension and leak defense — partial (bootstrap tamper guard + Trusted Types)
- [ ] F7 UI rebuild — not started
- [ ] F8 Tests — partial (giftwrap test updated)
- [ ] F9 Pen-test and release — not started

## Notes

All changes are pushed to the single `S1011H` branch on GitHub, per user request.
Remaining F7-F9 work is large and will continue in follow-up commits on S1011H.
