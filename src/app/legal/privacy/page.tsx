import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Crow',
  description: 'Privacy Policy for the Crow messenger — what data is collected, stored, and transmitted.',
}

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 1 October 2026
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: 1 October 2026
      </p>

      <p>
        This Privacy Policy describes what data the Crow messenger (&quot;Crow&quot;, &quot;the Service&quot;) collects,
        stores, and transmits. Crow is a static web application that runs entirely in your browser. No
        server operated by us processes or stores your plaintext messages, private keys, or decrypted
        data. Crow is provided by [OWNER NAME] (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> The legal entity has not been determined. Replace [OWNER NAME]
        before publishing.
      </p>

      <h2>1. Data We Collect</h2>
      <p>
        Crow does not collect personal information. We do not require or collect accounts, email
        addresses, phone numbers, or any identifying information. We do not use analytics, telemetry,
        crash reporting, or advertising identifiers of any kind.
      </p>

      <h2>2. Data Stored on Your Device</h2>
      <p>
        All application data resides on your device. This includes:
      </p>
      <ul>
        <li>
          <strong>Encrypted vault (IndexedDB):</strong> Your private keys, contacts, and messages are
          stored in an encrypted vault within your browser&apos;s IndexedDB storage. This data is encrypted
          with keys derived from your recovery phrase. We do not have access to this data.
        </li>
        <li>
          <strong>Display preferences (localStorage):</strong> Language and theme preferences are stored
          in localStorage under the <code>crow:display</code> key. This is non-sensitive configuration
          data.
        </li>
        <li>
          <strong>Debug flag (localStorage):</strong> A boolean debug-logging flag is stored in
          localStorage under the <code>crow:debug</code> key.
        </li>
      </ul>
      <p>
        You can clear all locally stored data at any time through your browser settings or by using
        Crow&apos;s built-in data management features.
      </p>

      <h2>3. Data That Leaves Your Device</h2>
      <p>
        The following data is transmitted from your device when you use Crow:
      </p>
      <ul>
        <li>
          <strong>Encrypted messages to relays:</strong> Messages are encrypted end-to-end before
          leaving your device. Relay servers receive only encrypted envelopes — they cannot read
          message content.
        </li>
        <li>
          <strong>WebRTC signaling data:</strong> To establish direct connections for calls and file
          transfers, signaling data (including your public key and connection details) is transmitted
          through relays.
        </li>
        <li>
          <strong>Optional TURN server traffic:</strong> If a direct WebRTC connection cannot be
          established, encrypted media may be relayed through TURN servers. TURN servers see encrypted
          traffic but cannot decrypt it.
        </li>
      </ul>

      <h2>4. What Each Party Can See</h2>
      <ul>
        <li>
          <strong>Relay servers</strong> see encrypted message envelopes and associated metadata:
          sender public key, recipient public keys, timestamps, and message size. They cannot read
          message content.
        </li>
        <li>
          <strong>TURN servers</strong> see encrypted media traffic (audio, video, files) and
          connection metadata (IP addresses, bandwidth). They cannot decrypt media content.
        </li>
        <li>
          <strong>Your browser and operating system</strong> have access to whatever they can
          normally access, including local storage contents, network traffic, and device hardware.
          This is outside our control.
        </li>
        <li>
          <strong>We (the Crow developers)</strong> do not operate relays or TURN servers and have no
          access to your messages, keys, or metadata in transit.
        </li>
      </ul>

      <h2>5. Third-Party Infrastructure Limitations</h2>
      <p>
        Crow relies on third-party infrastructure that we do not control:
      </p>
      <ul>
        <li>
          <strong>Relay servers</strong> are operated by independent parties. Each relay has its own
          privacy policy and data handling practices. We cannot guarantee how any relay handles the
          data it receives.
        </li>
        <li>
          <strong>TURN servers</strong> may be operated by third parties. Their privacy practices are
          their own.
        </li>
        <li>
          <strong>Hosting (if applicable)</strong> — if Crow is served from a web host, that host
          may log HTTP requests in accordance with its own policies.
        </li>
      </ul>
      <p>
        Because we do not operate this infrastructure, we cannot make compliance claims on its behalf
        (e.g., we cannot assert that relays comply with GDPR, CCPA, or any other regulation).
      </p>

      <h2>6. Data Retention</h2>
      <ul>
        <li>
          <strong>Messages on your device:</strong> Messages remain in your local encrypted vault
          until you delete them. We have no ability to delete or access them remotely.
        </li>
        <li>
          <strong>Messages on relays:</strong> Relay servers may retain encrypted envelopes for a
          limited time to support offline delivery. Retention periods vary by relay and are outside
          our control.
        </li>
        <li>
          <strong>Device storage:</strong> Clearing your browser data or using Crow&apos;s reset function
          permanently removes all local data. Ensure you have a backup of your recovery phrase before
          doing so.
        </li>
      </ul>

      <h2>7. Tracking, Cookies, and Advertising</h2>
      <ul>
        <li>Crow does not use tracking cookies or tracking pixels.</li>
        <li>Crow does not engage in cross-device or cross-site tracking.</li>
        <li>Crow does not serve advertisements.</li>
        <li>Crow does not use fingerprinting techniques.</li>
        <li>
          Your browser may enforce storage mechanisms (such as cookies for same-origin storage access)
          that are outside Crow&apos;s control. See our{' '}
          <a href="/legal/cookies/">Cookie Policy</a> for details.
        </li>
      </ul>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        Crow does not knowingly collect information from children. Because Crow does not collect
        personal information at all, age verification is not applicable. However, children should
        only use Crow under appropriate supervision given the nature of encrypted communication.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be indicated by
        updating the &quot;Last updated&quot; date. Continued use of Crow after changes constitutes acceptance
        of the revised policy.
      </p>

      <h2>10. Contact</h2>
      <p>
        For questions about this Privacy Policy, contact:{' '}
        <a href="mailto:[CONTACT EMAIL]">[CONTACT EMAIL]</a>
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> Contact information has not been set. Replace [CONTACT EMAIL]
        before publishing.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/legal/terms/">Terms of Service</a></li>
        <li><a href="/legal/cookies/">Cookie Policy</a></li>
        <li><a href="/legal/acceptable-use/">Acceptable Use Policy</a></li>
        <li><a href="/legal/security/">Security Disclosure</a></li>
      </ul>
    </article>
  )
}
