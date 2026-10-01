import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Crow',
  description: 'Terms of Service for the Crow messenger.',
}

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 1 October 2026
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: 1 October 2026
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By using Crow (&quot;the Service&quot;), you agree to these Terms of Service. If you do not agree, do not use
        the Service. Crow is provided by [OWNER NAME] (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> The legal entity and jurisdiction governing these terms have not been
        determined. Replace [OWNER NAME] and [JURISDICTION] with the appropriate information before
        publishing.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Crow is a static web application that provides end-to-end encrypted messaging. It runs entirely in
        your browser. No server operated by us processes, stores, or has access to your plaintext messages,
        private keys, or decrypted data. Messages are encrypted on your device before transmission and can
        only be decrypted by the intended recipients.
      </p>
      <p>
        Crow uses public relay servers to transport encrypted envelopes. We do not operate these relays.
        They are independent, public infrastructure and are not part of the Service we provide.
      </p>

      <h2>3. Your Account and Identity</h2>
      <p>
        Crow does not use accounts, phone numbers, or email addresses. Your identity consists of a
        cryptographic key pair generated and stored on your device. You are solely responsible for
        safeguarding your recovery phrase and any backup files. If you lose both, your identity and
        messages cannot be recovered by us or anyone else.
      </p>

      <h2>4. Your Responsibilities</h2>
      <p>You agree to:</p>
      <ul>
        <li>Keep your recovery phrase and backup files secure and private.</li>
        <li>Not use Crow to violate any applicable law.</li>
        <li>Not attempt to compromise the security, integrity, or availability of the Service or its relay infrastructure.</li>
        <li>Not misrepresent your identity to others for fraudulent or deceptive purposes.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>
        See our <a href="/legal/acceptable-use/">Acceptable Use Policy</a> for details on prohibited
        conduct.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        The Crow application source code is licensed under AGPL-3.0-or-later. The Crow name, logo, and
        visual identity are not covered by that license and may not be used without written permission.
      </p>
      <p>
        You retain all rights to content you create and transmit through Crow. We do not claim any
        license to your messages, files, or other data.
      </p>

      <h2>7. Third-Party Infrastructure</h2>
      <p>
        Crow depends on third-party relay servers, TURN servers (for calls), and the browser&apos;s own
        cryptographic and storage APIs. We do not control these services and are not responsible for
        their availability, performance, or policies. See our{' '}
        <a href="/legal/privacy/">Privacy Policy</a> for details on what each party can see.
      </p>

      <h2>8. No Warranty</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
        NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM,
        OUT OF, OR IN CONNECTION WITH THE SERVICE OR THE USE OR OTHER DEALINGS IN THE SERVICE.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by applicable law, we shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits, data, or
        privacy, arising out of or in connection with your use of the Service.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless the Service provider from any claims, damages, or
        expenses arising from your use of the Service in violation of these Terms or any applicable law.
      </p>

      <h2>11. Modifications</h2>
      <p>
        We may update these Terms from time to time. Material changes will be indicated by updating the
        &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance of the
        revised Terms.
      </p>

      <h2>12. Termination</h2>
      <p>
        Because Crow runs on your device and does not require a server account, we cannot terminate
        your access. However, we may discontinue the Service or stop publishing updates at any time.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms shall be governed by the laws of [JURISDICTION]. Any disputes shall be resolved in
        the courts of [JURISDICTION].
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> The governing jurisdiction has not been determined. Replace
        [JURISDICTION] before publishing.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these Terms, contact:{' '}
        <a href="mailto:[CONTACT EMAIL]">[CONTACT EMAIL]</a>
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> Contact information has not been set. Replace [CONTACT EMAIL]
        before publishing.
      </p>
    </article>
  )
}
