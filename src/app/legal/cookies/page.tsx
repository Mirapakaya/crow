import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy — Crow',
  description: 'Cookie and local storage policy for the Crow messenger — what is stored on your device and why.',
}

export default function CookiesPage() {
  return (
    <article>
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 1 October 2026
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: 1 October 2026
      </p>

      <p>
        This Cookie Policy describes how the Crow messenger (&quot;Crow&quot;, &quot;the Service&quot;) uses cookies
        and browser storage mechanisms. Crow is provided by [OWNER NAME] (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> The legal entity has not been determined. Replace [OWNER NAME]
        before publishing.
      </p>

      <h2>1. Tracking Cookies</h2>
      <p>
        Crow does not set tracking cookies. We do not use advertising cookies, analytics cookies,
        or any third-party tracking technologies.
      </p>

      <h2>2. localStorage</h2>
      <p>Crow uses localStorage to store non-sensitive preferences:</p>
      <ul>
        <li>
          <strong><code>crow:display</code>:</strong> Your language and theme preferences. This
          allows Crow to remember your display settings across sessions. This data is not
          transmitted anywhere.
        </li>
        <li>
          <strong><code>crow:debug</code>:</strong> A boolean flag that enables debug logging in
          the browser console. Defaults to off. This data is not transmitted anywhere.
        </li>
      </ul>
      <p>
        You can clear localStorage at any time through your browser settings. Doing so will reset
        your display preferences to defaults.
      </p>

      <h2>3. IndexedDB</h2>
      <p>
        Crow uses IndexedDB to store your encrypted vault data. This includes:
      </p>
      <ul>
        <li>Private cryptographic keys (encrypted)</li>
        <li>Contact information (encrypted)</li>
        <li>Message history (encrypted)</li>
        <li>Other application state (encrypted)</li>
      </ul>
      <p>
        All vault data is encrypted with keys derived from your recovery phrase. It cannot be read
        without that phrase. This data is stored locally and is not transmitted to any server.
      </p>

      <h2>4. Service Worker Cache</h2>
      <p>
        As a Progressive Web App (PWA), Crow installs a Service Worker that caches the application
        shell (HTML, JavaScript, CSS, and static assets). This enables offline use and faster
        loading. The cached content is the Crow application code itself, not user data.
      </p>
      <p>
        You can clear the Service Worker cache by unregistering the Service Worker through your
        browser&apos;s developer tools or by clearing site data.
      </p>

      <h2>5. Browser-Enforced Storage</h2>
      <p>
        Your browser may enforce certain storage mechanisms that are related to web storage but not
        cookies set by Crow:
      </p>
      <ul>
        <li>
          <strong>WebAuthn credentials:</strong> If you use Crow with hardware security keys, the
          browser manages WebAuthn credential storage. Crow does not control this.
        </li>
        <li>
          <strong>Notification permissions:</strong> If you grant Crow notification permissions,
          the browser stores this preference. Crow does not control this.
        </li>
      </ul>

      <h2>6. Third-Party Cookies</h2>
      <p>
        Crow itself does not set any third-party cookies. However:
      </p>
      <ul>
        <li>
          <strong>Relay servers</strong> operate on separate origins and may set their own cookies
          according to their own policies. We do not control relay cookies.
        </li>
        <li>
          <strong>TURN servers</strong> operate on separate origins and may set their own cookies
          according to their own policies. We do not control TURN cookies.
        </li>
      </ul>
      <p>
        Because relays and TURN servers operate on different origins from Crow, their cookies are
        isolated from Crow&apos;s storage context and cannot access Crow&apos;s local data.
      </p>

      <h2>7. Managing Storage</h2>
      <p>You can manage or clear Crow&apos;s stored data through:</p>
      <ul>
        <li>Crow&apos;s built-in data management and reset features.</li>
        <li>Your browser&apos;s site settings (clear site data for the Crow origin).</li>
        <li>Your browser&apos;s developer tools (Application tab for localStorage, IndexedDB, and Service Workers).</li>
      </ul>
      <p>
        Clearing local data will log you out and delete your messages and keys locally. Ensure you
        have your recovery phrase backed up before clearing data.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Material changes will be indicated by
        updating the &quot;Last updated&quot; date.
      </p>

      <h2>9. Contact</h2>
      <p>
        For questions about this Cookie Policy, contact:{' '}
        <a href="mailto:[CONTACT EMAIL]">[CONTACT EMAIL]</a>
      </p>
      <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Open question:</strong> Contact information has not been set. Replace [CONTACT EMAIL]
        before publishing.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/legal/privacy/">Privacy Policy</a></li>
        <li><a href="/legal/terms/">Terms of Service</a></li>
      </ul>
    </article>
  )
}
