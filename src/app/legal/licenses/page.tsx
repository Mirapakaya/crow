import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open Source Licenses — Crow',
  description: 'Open source license information for the Crow messenger and its dependencies.',
}

export default function LicensesPage() {
  return (
    <article>
      <h1>Open Source Licenses</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 1 October 2026
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: 1 October 2026
      </p>

      <h2>1. Crow License</h2>
      <p>
        The Crow messenger application is licensed under the{' '}
        <a
          href="https://www.gnu.org/licenses/agpl-3.0.en.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)
        </a>
        .
      </p>
      <p>
        Source code is available at:{' '}
        <a
          href="https://github.com/Mirapakaya/crow"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://github.com/Mirapakaya/crow
        </a>
      </p>

      <h2>2. Major Dependencies</h2>
      <p>
        Crow relies on the following open source libraries. We are grateful to their authors and
        communities.
      </p>

      <h3>MIT License</h3>
      <ul>
        <li><strong>Next.js</strong> — React framework for production (Vercel, Inc.)</li>
        <li><strong>React</strong> — UI library (Meta Platforms, Inc. and contributors)</li>
        <li><strong>@noble/curves</strong> — Elliptic curve cryptography (Paul Miller)</li>
        <li><strong>@noble/ciphers</strong> — Encryption algorithms (Paul Miller)</li>
        <li><strong>@noble/hashes</strong> — Hash functions (Paul Miller)</li>
        <li><strong>nostr-tools</strong> — Nostr protocol utilities (nbd)</li>
        <li><strong>zustand</strong> — State management (Poimandres)</li>
        <li><strong>shadcn/ui</strong> — UI component library (shadcn)</li>
        <li><strong>Radix UI</strong> — Accessible UI primitives (WorkOS, Inc.)</li>
        <li><strong>Tailwind CSS</strong> — Utility-first CSS framework (Tailwind Labs)</li>
        <li><strong>ts-mls</strong> — MLS protocol implementation</li>
        <li><strong>sonner</strong> — Toast notifications (Emil Kowalski)</li>
        <li><strong>class-variance-authority</strong> — Component variant utilities (Joe Bell)</li>
        <li><strong>clsx</strong> — Class name utility (Luke Edwards)</li>
        <li><strong>tailwind-merge</strong> — Tailwind class merging (Dany Lavoie)</li>
        <li><strong>qr</strong> — QR code generation</li>
      </ul>

      <h3>Apache License 2.0</h3>
      <ul>
        <li><strong>Dexie</strong> — IndexedDB wrapper (David Fahlander)</li>
      </ul>

      <h3>ISC License</h3>
      <ul>
        <li><strong>lucide-react</strong> — Icon library (Lucide Contributors)</li>
      </ul>

      <h2>3. Full Third-Party Notices</h2>
      <p>
        Complete license texts and third-party copyright notices are available in the{' '}
        <code>THIRD-PARTY-NOTICES</code> file included with the Crow source distribution.
      </p>

      <h2>4. Trademark Notice</h2>
      <p>
        The Crow name, logo, and visual identity are not covered by the AGPL-3.0-or-later license
        and may not be used without written permission. See our{' '}
        <a href="/legal/terms/">Terms of Service</a> for details.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/legal/terms/">Terms of Service</a></li>
        <li><a href="/legal/privacy/">Privacy Policy</a></li>
      </ul>
    </article>
  )
}
