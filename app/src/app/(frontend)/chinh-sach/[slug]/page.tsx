import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPage } from '@/lib/queries'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

const POLICY_SLUGS = [
  'dieu-khoan-chung',
  'chinh-sach-bao-ve-thong-tin-khach-hang',
  'chinh-sach-thanh-toan',
  'chinh-sach-bao-hanh-doi-tra',
  'quy-trinh-lap-dat-va-khieu-nai',
  'tuyen-bo-mien-tru-trach-nhiem',
]

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!POLICY_SLUGS.includes(slug)) return { title: 'Không tìm thấy trang' }
  const page = await getPage(slug)
  if (!page) return { title: 'Chưa có nội dung' }
  return {
    title: page.title,
    description: page.excerpt || undefined,
    alternates: { canonical: `/chinh-sach/${slug}` },
  }
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params
  if (!POLICY_SLUGS.includes(slug)) notFound()
  const page = await getPage(slug)
  if (!page) {
    return (
      <div className="vt-container">
        <article className="vt-page" style={{ margin: '26px 0' }}>
          <h1>Nội dung đang cập nhật</h1>
          <p>Trang này đang được cập nhật nội dung. Vui lòng quay lại sau.</p>
        </article>
      </div>
    )
  }

  return (
    <div className="vt-container">
      <article className="vt-page" style={{ margin: '26px 0' }}>
        <h1>{page.title}</h1>
        <div className="vt-content">{page.content && <RichText data={page.content} />}</div>
      </article>
    </div>
  )
}
