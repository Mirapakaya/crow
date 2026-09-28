import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '2.0.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_SOURCE_URL:
      process.env.NEXT_PUBLIC_SOURCE_URL ?? 'https://github.com/Mirapakaya/crow',
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: false,
  clientsClaim: true,
  disable: isDev,
  manifest: {
    id: '/',
    name: 'Crow',
    short_name: 'Crow',
    description: 'Private, end-to-end-encrypted messaging that runs entirely in your browser.',
    lang: 'en',
    theme_color: '#0e1116',
    background_color: '#0e1116',
    display: 'standalone',
    orientation: 'portrait-primary',
    start_url: '/',
    scope: '/',
    categories: ['social', 'communication', 'productivity'],
    icons: [
      { src: '/crow.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  },
})(nextConfig)
