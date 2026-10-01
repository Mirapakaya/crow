import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — Crow',
  description: 'Acceptable Use Policy for the Crow messenger — prohibited conduct and enforcement limitations.',
}

export default function AcceptableUsePage() {
  return (
    <article>
      <h1>Acceptable Use Policy</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 1 October 2026
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: 1 October 2026
      </p>

      <p>
        This Acceptable Use Policy describes conduct that is prohibited when using the Crow messenger
        (&quot;Crow&quot;, &quot;the Service&quot;). Crow is provided by [OWNER NAME] (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> The legal entity has not been determined. Replace [OWNER NAME]
        before publishing.
      </p>

      <h2>1. Prohibited Conduct</h2>
      <p>You must not use Crow to:</p>
      <ul>
        <li>
          <strong>Transmit illegal content:</strong> Content that violates applicable law, including
          child sexual abuse material, non-consensual intimate imagery, or content that facilitates
          serious crime.
        </li>
        <li>
          <strong>Harass or threaten:</strong> Target individuals with harassment, threats, stalking,
          or incitement to violence.
        </li>
        <li>
          <strong>Send spam:</strong> Send unsolicited bulk messages or use Crow for mass
          distribution of unwanted content.
        </li>
        <li>
          <strong>Distribute malicious files:</strong> Send files designed to harm recipients&apos;
          devices, including malware, ransomware, or exploits.
        </li>
        <li>
          <strong>Exploit relays:</strong> Abuse relay infrastructure through excessive bandwidth
          consumption, denial-of-service attacks, or unauthorized access attempts.
        </li>
        <li>
          <strong>Impersonate for fraud:</strong> Misrepresent your identity for fraudulent,
          deceptive, or financially harmful purposes. (Using a pseudonym for privacy is not
          impersonation.)
        </li>
      </ul>

      <h2>2. Enforcement Limitations</h2>
      <p>
        Crow is a decentralized, end-to-end encrypted messenger. We cannot read, filter, or block
        messages in transit. We do not operate the relay servers that transport encrypted envelopes.
        As a result:
      </p>
      <ul>
        <li>We cannot enforce this policy at the messaging layer.</li>
        <li>We cannot identify prohibited content within encrypted messages.</li>
        <li>We cannot remove content from individual devices remotely.</li>
        <li>We cannot block specific users from using third-party relays we do not control.</li>
      </ul>
      <p>
        The architectural reality of end-to-end encryption means that enforcement relies on social
        norms, user-level blocking, and — where we have control — access to infrastructure we operate.
      </p>

      <h2>3. No Monitoring</h2>
      <p>
        We do not monitor, scan, or analyze messages or other content transmitted through Crow. We
        are technically unable to do so because all messages are end-to-end encrypted and we do not
        hold the decryption keys. We do not and cannot perform content moderation.
      </p>

      <h2>4. Reporting</h2>
      <p>
        If you become aware of prohibited conduct through Crow, you may report it to:{' '}
        <a href="mailto:[CONTACT EMAIL]">[CONTACT EMAIL]</a>.
      </p>
      <p>
        Please include as much context as possible (public keys involved, timestamps, nature of the
        violation). Note that because we cannot read encrypted messages, we cannot verify most
        reports without the reporter providing evidence from their own device.
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> Contact information has not been set. Replace [CONTACT EMAIL]
        before publishing.
      </p>

      <h2>5. Consequences</h2>
      <p>
        If we determine that a user is violating this policy, we may take the following actions
        where technically possible:
      </p>
      <ul>
        <li>
          <strong>Blocking relay access we control:</strong> If we operate any relay infrastructure,
          we may block access to it by public keys associated with violations.
        </li>
        <li>
          <strong>Publishing advisories:</strong> We may publicly identify public keys associated
          with serious abuse.
        </li>
      </ul>
      <p>
        We cannot enforce this policy on third-party relay servers we do not operate, nor can we
        prevent a user from continuing to use Crow with different relays. End-to-end encryption
        means the only effective content control is at the edges — recipients can block senders
        within the app.
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Acceptable Use Policy from time to time. Material changes will be
        indicated by updating the &quot;Last updated&quot; date.
      </p>

      <h2>7. Contact</h2>
      <p>
        For questions about this policy, contact:{' '}
        <a href="mailto:[CONTACT EMAIL]">[CONTACT EMAIL]</a>
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/legal/terms/">Terms of Service</a></li>
        <li><a href="/legal/privacy/">Privacy Policy</a></li>
      </ul>
    </article>
  )
}
