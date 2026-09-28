import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'
import '../styles/app.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

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
    icon: '/crow.svg',
    shortcut: '/crow.svg',
    apple: '/icons/icon.svg',
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#0e1116',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1116' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const themeScript = `
(function () {
  try {
    const stored = JSON.parse(localStorage.getItem('crow:display') || '{}')
    const theme = stored.theme || 'system'
    const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
    const dir = stored.locale === 'fa' ? 'rtl' : 'ltr'
    document.documentElement.classList.add(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.lang = stored.locale || 'en'
  } catch {}
})()
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={cn(geistSans.variable, geistMono.variable, vazirmatn.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
