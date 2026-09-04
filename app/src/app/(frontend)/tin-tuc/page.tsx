import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { getPayloadClient } from '@/lib/payload'
import { getSettings } from '@/lib/queries'
import { absoluteUrl, mediaSrc } from '@/lib/utils'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tin tức & Khuyến mãi',
  description:
    'Tin tức, khuyến mãi và hướng dẫn từ Viễn Thông Nga Sơn — Internet cáp quang, SIM, Camera, MyTV tại Nga Sơn, Thanh Hóa.',
  alternates: { canonical: '/tin-tuc' },
}

function fmtDate(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function NewsPage() {
  const payload = await getPayloadClient()
  const [{ docs: posts }, settings] = await Promise.all([
    payload.find({ collection: 'posts', limit: 24, sort: '-publishedAt', depth: 1 }),
    getSettings().catch(() => null),
  ])

  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')

  return (
    <div className="vt-container">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Tin tức Viễn Thông Nga Sơn',
          url: absoluteUrl('/tin-tuc'),
        }}
      />

      <nav className="vt-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Tin tức</span>
      </nav>

      <section className="vt-section">
        <div className="vt-cat-head">
          <h1>Tin tức &amp; Khuyến mãi</h1>
          <p className="vt-cat-desc">Cập nhật gói cước mới, ưu đãi lắp đặt và mẹo sử dụng dịch vụ.</p>
        </div>

        {posts.length > 0 ? (
          <ul className="news-packgrid">
            {posts.map((p) => {
              const media = p.image && typeof p.image === 'object' ? p.image : null
              const img = mediaSrc(media?.url)
              return (
                <li className="news-card" key={p.id}>
                  <Link href={`/tin-tuc/${p.slug}`} className="news-card__thumb" tabIndex={-1} aria-hidden="true">
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
                    <time dateTime={p.publishedAt ?? undefined}>{fmtDate(p.publishedAt)}</time>
                    <h2>
                      <Link href={`/tin-tuc/${p.slug}`}>{p.title}</Link>
                    </h2>
                    {p.excerpt && <p>{p.excerpt}</p>}
                    <span className="news-card__more" aria-hidden="true">
                      Xem chi tiết ›
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="vt-empty">
            <p>
              <strong>Chưa có bài viết nào.</strong>
            </p>
            <p>Quay lại sau để xem khuyến mãi mới nhất bạn nhé.</p>
          </div>
        )}
      </section>

      <section className="vt-section vt-panel">
        <h2>Bạn muốn lắp Internet / SIM / Camera?</h2>
        <p>
          {tel && (
            <>
              Gọi ngay{' '}
              <a className="vt-panel__tel" href={`tel:${tel}`}>
                {hotline}
              </a>{' '}
              hoặc{' '}
            </>
          )}
          <Link href="/dang-ky">đăng ký online</Link> — khảo sát miễn phí tại Nga Sơn!
        </p>
      </section>
    </div>
  )
}
