import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '3.0.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_SOURCE_URL: 'https://github.com/Mirapakaya/crow',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "media-src 'self' blob:",
              "connect-src wss: https:",
              "font-src 'self'",
              "manifest-src 'self'",
              "worker-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'none'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  disable: isDev,
})(nextConfig)
