import type { Metadata, Viewport } from 'next'
import { Inter, Vazirmatn } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    icon: 'crow.svg',
    shortcut: 'crow.svg',
    apple: 'icons/icon.svg',
  },
  manifest: 'manifest.json',
  other: {
    'theme-color': '#09090b',
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

const themeScript = `
(function () {
  try {
    const stored = JSON.parse(localStorage.getItem('crow:display') || '{}')
    const theme = stored.theme || 'system'
    const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
    document.documentElement.classList.add(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
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
      className={cn(inter.variable, vazirmatn.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
