import type { Metadata } from 'next'
import Link from 'next/link'
import HeroSlider from '@/components/HeroSlider'
import DigishopCard from '@/components/DigishopCard'
import JsonLd from '@/components/JsonLd'
import { getSettings, getCategoryTree, getProductsByCategory, getLatestPosts, variantForCategory } from '@/lib/queries'
import { absoluteUrl, formatPrice, mediaSrc } from '@/lib/utils'
import { groupByBase } from '@/lib/variants'
import Image from 'next/image'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  title: 'Internet Cáp Quang Nga Sơn — Lắp Đặt FTTH Vinaphone Trong 24h | Viễn Thông Nga Sơn',
  description:
    'Lắp mạng Internet cáp quang FTTH Vinaphone tại Nga Sơn, Thanh Hóa — gói Home 300Mbps chỉ 180K/tháng. SIM 4G/5G VinaPhone, camera an ninh, MyTV, Wifi Mesh. Khảo sát miễn phí, lắp nhanh trong 24 giờ, bảo hành tận nhà.',
  keywords: [
    'internet nga sơn', 'lắp mạng nga sơn', 'internet cáp quang thanh hóa', 'ftth vinaphone nga sơn',
    'lắp wifi nga sơn', 'sim 4g 5g vinaphone', 'gói cước vinaphone', 'camera an ninh nga sơn',
    'mytv vinaphone', 'wifi mesh', 'fiber vnn', 'truyền hình tv box', 'viễn thông nga sơn',
    'lắp internet thanh hóa', 'internet giá rẻ nga sơn',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Viễn Thông Nga Sơn',
    title: 'Viễn Thông Nga Sơn — Internet FTTH, SIM VinaPhone, Camera tại Nga Sơn, Thanh Hóa',
    description: 'Lắp đặt Internet cáp quang trong 24 giờ tại Nga Sơn, Thanh Hóa. Gói Home 300Mbps từ 180K/tháng.',
  },
}

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

const WHY_US = [
  { icon: '⚡', title: 'Lắp nhanh trong 24 giờ', desc: 'Khảo sát miễn phí tại nhà, thi công trọn gói ngay trong ngày.' },
  { icon: '🏷️', title: 'Giá chính hãng VNPT', desc: 'Bảng giá Home/HomeTV/Home Cam chuẩn chính sách mới nhất, có VAT.' },
  { icon: '🛠️', title: 'Bảo hành tận nhà', desc: 'Hỗ trợ kỹ thuật 24/7, xử lý sự cố trong vòng 24 giờ làm việc.' },
  { icon: '📍', title: 'Phủ sóng toàn Nga Sơn', desc: 'Phục vụ tất cả các xã, thị trấn thuộc huyện Nga Sơn, Thanh Hóa.' },
]

const CATEGORY_ICONS: Record<string, string> = {
  'di-dong': '📱',
  'internet-truyen-hinh': '📶',
  'dich-vu-cntt': '💻',
  'dich-vu-so': '📦',
  'internet-cap-quang': '📶',
  'sim-goi-cuoc': '📱',
  'camera-an-ninh': '📷',
  'tv-box': '📺',
  'sim-so': '🔢',
  'goi-cuoc-4g': '📶',
  'combo-thoai-data': '💬',
  'internet-wifi-mesh': '🌐',
  'truyen-hinh-mytv': '📺',
}

export default async function HomePage() {
  const [settings, tree, posts] = await Promise.all([getSettings(), getCategoryTree(), getLatestPosts(3)])

  // Doc danh muc goc tu DB thay vi hard-code slug. Truoc day trang chu tro den
  // 4 slug cu (internet-cap-quang, sim-goi-cuoc, camera-an-ninh, tv-box) — cac
  // slug nay da bi doi sang bo danh muc moi nen trang chu khong hien san pham nao.
  const sections = await Promise.all(
    tree.map(async (cat) => {
      const { products } = await getProductsByCategory(cat.slug, 8)
      return { slug: cat.slug, title: cat.name, children: cat.children, products }
    }),
  )
  const withProducts = sections.filter((s) => s.products.length > 0)

  const siteName = settings?.siteName ?? 'Viễn Thông Nga Sơn'
  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')

  // Logo doi tac (VNPT) dung lam hinh nen mo o banner. Chi hien khi da upload
  // trong /admin va bat tuy chon partnerWatermark.
  const partner = settings?.partnerLogo && typeof settings.partnerLogo === 'object' ? settings.partnerLogo : null
  const partnerSrc = mediaSrc(partner?.url)
  const watermark =
    settings?.partnerWatermark && partnerSrc
      ? {
          src: partnerSrc,
          width: partner?.width || 400,
          height: partner?.height || 160,
          alt: partner?.alt || 'VNPT',
        }
      : null

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': absoluteUrl('/#business'),
      name: siteName,
      slogan: settings?.slogan,
      description:
        'Lắp đặt Internet cáp quang FTTH Vinaphone, SIM 4G/5G, Camera an ninh, TV Box trọn gói tại Nga Sơn, Thanh Hóa.',
      url: absoluteUrl('/'),
      telephone: hotline,
      email: settings?.email,
      image: absoluteUrl('/api/media/file/hero-banner.png'),
      priceRange: '90000đ - 6500000đ',
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings?.address ?? 'Nga Sơn',
        addressLocality: 'Nga Sơn',
        addressRegion: 'Thanh Hóa',
        addressCountry: 'VN',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 20.0333, longitude: 106.1833 },
      areaServed: [
        { '@type': 'AdministrativeArea', name: 'Nga Sơn, Thanh Hóa' },
        { '@type': 'AdministrativeArea', name: 'Thanh Hóa' },
      ],
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens: '07:30', closes: '20:00' },
      ],
      contactPoint: hotline
        ? {
            '@type': 'ContactPoint',
            telephone: `+84${tel.replace(/^0/, '')}`,
            contactType: 'Customer Service',
            areaServed: 'VN',
            availableLanguage: ['Vietnamese'],
          }
        : undefined,
      sameAs: [settings?.messenger].filter(Boolean),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: absoluteUrl('/'),
      potentialAction: {
        '@type': 'SearchAction',
        target: absoluteUrl('/tim-kiem?q={search_term_string}'),
        'query-input': 'required name=search_term_string',
      },
    },
  ]

  return (
    <div className="vt-container">
      <JsonLd data={jsonLd} />

      {/* h1 duy nhat cua trang chu — truoc day trang khong co h1 nao, heading nhay tu h2. */}
      <h1 className="sr-only">
        {siteName} — Internet cáp quang, SIM 4G/5G, Camera an ninh, MyTV tại Nga Sơn, Thanh Hóa
      </h1>

      <HeroSlider slides={settings?.heroSlides ?? []} watermark={watermark} />

      {/* Loi vao nhanh theo danh muc goc, lay tu DB. */}
      {tree.length > 0 && (
        <section className="vt-section" aria-labelledby="dm-heading">
          <div className="vt-section-head">
            <h2 id="dm-heading">Dịch vụ chính</h2>
          </div>
          <ul className="vt-quicklinks">
            {tree.map((c) => (
              <li key={c.id}>
                <Link className="vt-quicklink" href={`/danh-muc/${c.slug}`}>
                  <span className="vt-quicklink-icon" aria-hidden="true">
                    {CATEGORY_ICONS[c.slug] ?? '📦'}
                  </span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.children.length > 0
                      ? c.children.slice(0, 3).map((x) => x.name).join(' · ')
                      : 'Xem chi tiết dịch vụ'}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {withProducts.map((s) => {
        const groups = groupByBase(s.products as any)
        return (
          <section className="vt-section" key={s.slug} aria-labelledby={`sec-${s.slug}`}>
            <div className="vt-section-head">
              <h2 id={`sec-${s.slug}`}>{s.title}</h2>
              <Link className="vt-more" href={`/danh-muc/${s.slug}`}>
                Xem tất cả →
              </Link>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px'}}>
              {groups.slice(0, 8).map((g) => {
                const main = g.products[0]
                const variant = variantForCategory(s.slug)
                return (
                  <DigishopCard
                    key={main.id}
                    product={{ ...main, title: g.base, price: g.minPrice } as any}
                    hotline={hotline}
                    variant={variant}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="vt-section" id="hot-deal" aria-labelledby="hotdeal-heading">
        <div className="vt-hotdeal">
          <div>
            <h2 id="hotdeal-heading">🔥 Hot deal tháng này</h2>
            <p>
              Home Internet 1 — Fiber <strong>300Mbps</strong> chỉ <strong>{formatPrice(180000)}/tháng</strong>. Lắp
              đặt trọn gói, khảo sát miễn phí!
            </p>
          </div>
          <Link className="vt-btn" href="/dang-ky">
            Đăng ký ngay
          </Link>
        </div>
      </section>

      <section className="vt-section" aria-labelledby="why-heading">
        <div className="vt-section-head">
          <h2 id="why-heading">Vì sao chọn {siteName}?</h2>
        </div>
        <ul className="vt-whyus">
          {WHY_US.map((w) => (
            <li className="vt-whyus-item" key={w.title}>
              <span className="vt-whyus-icon" aria-hidden="true">
                {w.icon}
              </span>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="vt-cta" id="khuyen-mai" aria-labelledby="cta-heading">
        <div>
          <h2 id="cta-heading">Đăng ký lắp đặt hôm nay — ưu đãi trong tháng!</h2>
          <p>
            Khảo sát miễn phí — báo giá trọn gói — hỗ trợ kỹ thuật trong 24 giờ.
            {hotline && (
              <>
                {' '}
                Hotline: <a href={`tel:${tel}`}>{hotline}</a>
              </>
            )}
          </p>
        </div>
        <Link className="vt-btn" href="/dang-ky">
          Đăng ký ngay
        </Link>
      </section>

      {posts.length > 0 && (
        <section className="vt-section" aria-labelledby="news-heading">
          <div className="vt-section-head">
            <h2 id="news-heading">Tin tức</h2>
            <Link className="vt-more" href="/tin-tuc">
              Xem tất cả →
            </Link>
          </div>
          <ul className="news-packgrid">
            {posts.map((p) => {
              const media = p.image && typeof p.image === 'object' ? p.image : null
              const img = mediaSrc(media?.url)
              return (
                <li className="news-card" key={p.id}>
                  <Link className="news-card__thumb" href={`/tin-tuc/${p.slug}`} tabIndex={-1} aria-hidden="true">
                    {img ? (
                      <Image
                        src={img}
                        alt={media?.alt || p.title}
                        width={media?.width || 800}
                        height={media?.height || 600}
                        sizes="(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 33vw"
                      />
                    ) : (
                      <span className="news-card__noimg" aria-hidden="true">
                        📰
                      </span>
                    )}
                  </Link>
                  <div className="news-card__body">
                    {p.publishedAt && (
                      <time dateTime={new Date(p.publishedAt).toISOString()}>
                        {new Date(p.publishedAt).toLocaleDateString('vi-VN')}
                      </time>
                    )}
                    <h3>
                      <Link href={`/tin-tuc/${p.slug}`}>{p.title}</Link>
                    </h3>
                    {p.excerpt && <p>{p.excerpt}</p>}
                    <span className="news-card__more" aria-hidden="true">
                      Đọc tiếp →
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
