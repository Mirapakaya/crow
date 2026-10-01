import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security Disclosure — Crow',
  description: 'How to report security vulnerabilities in the Crow messenger and our responsible disclosure expectations.',
}

export default function SecurityPage() {
  return (
    <article>
      <h1>Security Disclosure</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 1 October 2026
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: 1 October 2026
      </p>

      <p>
        We take the security of the Crow messenger seriously. If you believe you have discovered a
        security vulnerability, we encourage you to report it responsibly so we can address it
        promptly.
      </p>

      <h2>1. Reporting a Vulnerability</h2>
      <p>
        To report a security vulnerability, send an email to:{' '}
        <a href="mailto:[SECURITY EMAIL]">[SECURITY EMAIL]</a>
      </p>
      <p>Please include the following information:</p>
      <ul>
        <li>A description of the vulnerability and its potential impact.</li>
        <li>Steps to reproduce the issue.</li>
        <li>The version of Crow affected (or the commit hash if building from source).</li>
        <li>Any proof-of-concept code or screenshots.</li>
        <li>Your preferred contact method for follow-up.</li>
      </ul>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> A dedicated security contact email has not been set. Replace
        [SECURITY EMAIL] before publishing.
      </p>

      <h2>2. PGP Key</h2>
      <p>
        If you wish to encrypt your report, you may use the following PGP key:
      </p>
      <p>
        <code>[PGP KEY FINGERPRINT OR LINK]</code>
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> A PGP key for security reports has not been generated or
        published. Replace [PGP KEY FINGERPRINT OR LINK] before publishing.
      </p>

      <h2>3. In Scope</h2>
      <p>We consider the following to be in scope for security reports:</p>
      <ul>
        <li>
          <strong>Crow application code:</strong> Vulnerabilities in the Crow web application,
          including the frontend, Service Worker, and build pipeline.
        </li>
        <li>
          <strong>Cryptographic implementation:</strong> Weaknesses in how Crow uses cryptographic
          primitives (key generation, encryption, signing, key exchange), or deviations from
          security best practices in the cryptographic layer.
        </li>
        <li>
          <strong>PWA security:</strong> Issues related to Service Worker security, offline
          caching, or Progressive Web App attack surface.
        </li>
        <li>
          <strong>Local storage security:</strong> Vulnerabilities that could lead to unauthorized
          access to the encrypted vault or private keys stored in IndexedDB.
        </li>
      </ul>

      <h2>4. Out of Scope</h2>
      <p>The following are out of scope for our security reporting:</p>
      <ul>
        <li>
          <strong>Third-party relay vulnerabilities:</strong> Relays are independent infrastructure
          not operated by us. Report relay vulnerabilities to their operators.
        </li>
        <li>
          <strong>Browser bugs:</strong> Vulnerabilities in the browser itself (Chrome, Firefox,
          Safari, etc.) should be reported to the browser vendor.
        </li>
        <li>
          <strong>Social engineering:</strong> Phishing, impersonation, or manipulation of users
          is outside the scope of technical vulnerability reporting.
        </li>
        <li>
          <strong>Denial of service against third-party infrastructure:</strong> Attacks against
          relays or TURN servers we do not operate.
        </li>
        <li>
          <strong>Theoretical issues without proof of exploitability:</strong> Reports that do not
          demonstrate a practical attack or concrete risk.
        </li>
      </ul>

      <h2>5. Responsible Disclosure Expectations</h2>
      <p>We ask that security researchers follow these principles:</p>
      <ul>
        <li>
          <strong>Give us reasonable time to fix:</strong> Please allow at least 90 days from your
          initial report before publicly disclosing the vulnerability. We will keep you informed
          of our progress.
        </li>
        <li>
          <strong>Do not exploit the vulnerability:</strong> Avoid accessing, modifying, or
          deleting other users&apos; data. Limit your investigation to what is necessary to demonstrate
          the issue.
        </li>
        <li>
          <strong>Do not access relay infrastructure:</strong> Do not test vulnerabilities against
          third-party relays. Use a local development environment or your own test relay.
        </li>
        <li>
          <strong>Coordinate disclosure:</strong> Work with us on the disclosure timeline and
          content so users have time to update before details become public.
        </li>
      </ul>
      <p>
        We commit to acknowledging your report within 5 business days and providing a substantive
        response within 30 days.
      </p>

      <h2>6. Bug Bounty</h2>
      <p>
        We do not currently operate a bug bounty program. We recognize and thank security
        researchers through our acknowledgments section below.
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> A bug bounty program may be considered in the future. This
        section should be updated if one is established.
      </p>

      <h2>7. Acknowledgments</h2>
      <p>
        We would like to thank the following security researchers for their responsible disclosure
        of vulnerabilities in Crow:
      </p>
      <p>
        <em>No reports have been received yet. This section will be updated as vulnerabilities are
        reported and resolved.</em>
      </p>

      <h2>8. Contact</h2>
      <p>
        For general (non-security) questions, contact:{' '}
        <a href="mailto:[CONTACT EMAIL]">[CONTACT EMAIL]</a>
      </p>
      <p>
        For security reports only, use:{' '}
        <a href="mailto:[SECURITY EMAIL]">[SECURITY EMAIL]</a>
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> Contact information has not been set. Replace [CONTACT EMAIL]
        and [SECURITY EMAIL] before publishing.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/legal/terms/">Terms of Service</a></li>
        <li><a href="/legal/privacy/">Privacy Policy</a></li>
        <li><a href="/legal/licenses/">Open Source Licenses</a></li>
      </ul>
    </article>
  )
}
