import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import '@/styles/globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FloatingButtons from '@/components/FloatingButtons'
import { getSettings } from '@/lib/queries'

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--vt-font',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vienthongngason.com'),
  title: {
    default: 'Viễn Thông Nga Sơn — Internet, SIM, Camera, TV Box tại Nga Sơn, Thanh Hóa',
    template: '%s | Viễn Thông Nga Sơn',
  },
  description:
    'Lắp đặt Internet cáp quang, SIM 4G/5G, Camera an ninh, TV Box trọn gói tại Nga Sơn, Thanh Hóa. Khảo sát miễn phí, lắp đặt trong 24 giờ, bảo hành tận nhà.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Viễn Thông Nga Sơn',
  },
  robots: { index: true, follow: true },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <FloatingButtons
          hotline={settings?.hotline ?? ''}
          zalo={settings?.zalo ?? ''}
          messenger={settings?.messenger ?? ''}
        />
      </body>
    </html>
  )
}
