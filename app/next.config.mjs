import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      { source: '/mcp', destination: '/api/mcp' },
      { source: '/mcp/', destination: '/api/mcp/' },
    ]
  },
}

export default withPayload(nextConfig)
