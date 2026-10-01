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
}

export default withPWA({
  dest: 'public',
  register: true,
  disable: isDev,
})(nextConfig)
