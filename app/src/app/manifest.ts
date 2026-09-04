import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Viễn Thông Nga Sơn',
    short_name: 'VT Nga Sơn',
    description: 'Internet cáp quang, SIM 4G/5G, Camera an ninh, TV Box tại Nga Sơn, Thanh Hóa',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d47a1',
    theme_color: '#1565c0',
    lang: 'vi',
    icons: [
      { src: '/api/media/file/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/api/media/file/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
