import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import JsonLd from '@/components/JsonLd'
import { getPayloadClient } from '@/lib/payload'
import { absoluteUrl } from '@/lib/utils'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

async function getPost(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'posts', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  return docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Không tìm thấy bài viết' }
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: `/tin-tuc/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt || undefined,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      images: post.image && typeof post.image === 'object' && post.image.url ? [{ url: post.image.url }] : undefined,
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const img = post.image && typeof post.image === 'object' ? post.image.url : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    author: { '@type': 'Organization', name: 'Viễn Thông Nga Sơn' },
    image: img ? [absoluteUrl(img)] : undefined,
  }

  return (
    <div className="vt-container">
      <JsonLd data={jsonLd} />
      <nav className="vt-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/tin-tuc">Tin tức</Link> / <span>{post.title}</span>
      </nav>
      <article className="vt-page">
        <h1>{post.title}</h1>
        <time dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}>
          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('vi-VN') : ''}
        </time>
        {img && (
          <img src={img} alt={post.title} style={{ borderRadius: 8, margin: '14px 0', width: '100%', height: 'auto' }} />
        )}
        {post.excerpt && <p style={{ fontWeight: 600 }}>{post.excerpt}</p>}
        <div className="vt-content">{post.content && <RichText data={post.content} />}</div>
      </article>
    </div>
  )
}
