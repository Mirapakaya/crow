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
- [x] F7 UI rebuild — in progress (single Geist token source; background agent working)
- [x] F8 Tests — in progress (Argon2id timeouts + missing coverage; background agent working)
- [x] F9 Pen-test and release — in progress (npm audit run, report updated; semgrep/osv-scanner/gitleaks to run in Codespace)

## Active work

- Identity handle integration: background agent refactoring `Messenger` to use `IdentityHandle` instead of raw `secretKey`.
- Geist UI rebuild: background agent rebuilding `tokens.css` and migrating UI to single token source.
- Test coverage: background agent adding missing tests and fixing Argon2id timeouts.
- PENTEST-REPORT.md updated with local `npm audit --omit=dev` result and tool instructions.

## Notes

All changes are pushed to the single `S1011H` branch on GitHub, per user request.
Open work requiring deeper refactors: full identity-worker integration (C4), complete Geist-only UI rebuild (F7), full test coverage (F8), and executed pen-test run (F9).
