import type { Metadata, Viewport } from 'next'
import { Vazirmatn } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { cn } from '@/lib/utils'
import { CROW_CSP } from '@/core/util/csp'
import './globals.css'

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Crow',
  description: 'Private, end-to-end-encrypted messaging that runs entirely in your browser.',
  applicationName: 'Crow',
  referrer: 'no-referrer',
  icons: {
    icon: 'crow.svg',
    shortcut: 'crow.svg',
    apple: 'icons/icon.svg',
  },
  manifest: 'manifest.json',
  other: {
    'theme-color': '#0a0a0a',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={cn(GeistSans.variable, GeistMono.variable, vazirmatn.variable)} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CROW_CSP} />
        <script src="/theme.js" integrity="sha256-T6APF+Z4HSG3c0/+CrvEFHMPoRymk7sOSwS7QDDmerg=" crossOrigin="anonymous" />
      </head>
      <body className="h-dvh flex flex-col overflow-hidden bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  )
}
