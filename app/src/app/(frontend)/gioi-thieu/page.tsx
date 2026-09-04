import type { Metadata } from 'next'
import { getPage } from '@/lib/queries'
import { RichText } from '@payloadcms/richtext-lexical/react'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

// Route tinh khong co [slug] — phai truyen thang slug, neu doc tu params
// thi slug luon la undefined va trang render ra trong tron (chi co header/footer).
const SLUG = 'gioi-thieu'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  if (!page) return { title: 'Giới thiệu' }
  return {
    title: page.title,
    description: page.excerpt || undefined,
    alternates: { canonical: `/${page.slug}` },
  }
}

export default async function AboutPage() {
  const page = await getPage(SLUG)
  if (!page) {
    return (
      <div className="vt-container">
        <article className="vt-page">
          <h1>Giới thiệu</h1>
          <p>Nội dung đang được cập nhật.</p>
        </article>
      </div>
    )
  }

  return (
    <div className="vt-container">
      <article className="vt-page">
        <h1>{page.title}</h1>
        <div className="vt-content">{page.content && <RichText data={page.content} />}</div>
      </article>
    </div>
  )
}
