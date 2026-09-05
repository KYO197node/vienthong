import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      { source: '/mcp', destination: '/api/mcp' },
      { source: '/mcp/', destination: '/api/mcp/' },
    ]
  },
  async redirects() {
    return [
      { source: '/san-pham/goi-mi-td49-3m', destination: '/shop', permanent: true },
      { source: '/san-pham/goi-mi-d30g', destination: '/shop', permanent: true },
      { source: '/san-pham/combo-thoai-data-max100', destination: '/shop', permanent: true },
      { source: '/san-pham/goi-internet-ftth-30mbps', destination: '/danh-muc/internet-truyen-hinh', permanent: true },
      { source: '/san-pham/goi-internet-ftth-50mbps', destination: '/danh-muc/internet-truyen-hinh', permanent: true },
      { source: '/danh-muc/internet-cap-quang', destination: '/danh-muc/internet-truyen-hinh', permanent: true },
      { source: '/danh-muc/sim-goi-cuoc', destination: '/danh-muc/di-dong', permanent: true },
      { source: '/danh-muc/camera-an-ninh', destination: '/danh-muc/internet-camera', permanent: true },
      { source: '/danh-muc/tv-box', destination: '/danh-muc/truyen-hinh-mytv', permanent: true },
      { source: '/danh-muc/dich-vu-cntt', destination: '/danh-muc/dich-vu-so', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://challenges.cloudflare.com",
              "frame-src https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
