/**
 * Security Center (placeholder scaffold).
 *
 * Shows per-chat protection status, relay health, build fingerprint, and an
 * honest checklist. The full Security Center will be wired to live data in a
 * follow-up pass.
 */

'use client'

export default function SecurityCenterPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Security Center</h1>
      <section className="space-y-2 text-sm opacity-80">
        <p>1:1 conversations: no forward secrecy (static DH)</p>
        <p>MLS groups: forward secrecy enabled</p>
        <p>Hybrid PQ: not yet bound to ciphertext</p>
        <p>Build fingerprint: available in About</p>
        <p>Hardened mode: use a dedicated browser profile, install the PWA, consider Tor Browser</p>
        <p className="text-amber-500">Limit: a malicious extension with page access cannot be fully blocked.</p>
      </section>
    </main>
  )
}
