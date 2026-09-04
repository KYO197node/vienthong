import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { absoluteUrl } from '@/lib/utils'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = absoluteUrl('')
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/shop'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/dang-ky'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/tin-tuc'), changeFrequency: 'daily', priority: 0.7 },
    { url: absoluteUrl('/ho-tro'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/gioi-thieu'), changeFrequency: 'monthly', priority: 0.6 },
    ...[
      'dieu-khoan-chung',
      'chinh-sach-bao-ve-thong-tin-khach-hang',
      'chinh-sach-thanh-toan',
      'chinh-sach-bao-hanh-doi-tra',
      'quy-trinh-lap-dat-va-khieu-nai',
      'tuyen-bo-mien-tru-trach-nhiem',
    ].map((slug) => ({ url: absoluteUrl(`/chinh-sach/${slug}`), changeFrequency: 'yearly' as const, priority: 0.3 })),
  ]

  try {
    const payload = await getPayloadClient()
    const [categories, products, posts] = await Promise.all([
      payload.find({ collection: 'categories', limit: 50, depth: 0 }),
      payload.find({ collection: 'products', limit: 500, depth: 0, sort: '-updatedAt' }),
      payload.find({ collection: 'posts', limit: 500, depth: 0, sort: '-updatedAt' }),
    ])

    return [
      ...staticRoutes,
      ...categories.docs.map((c) => ({
        url: absoluteUrl(`/danh-muc/${c.slug}`),
        lastModified: (c as { updatedAt?: string }).updatedAt ?? undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...products.docs.map((p) => ({
        url: absoluteUrl(`/san-pham/${p.slug}`),
        lastModified: p.updatedAt ?? undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...posts.docs.map((p) => ({
        url: absoluteUrl(`/tin-tuc/${p.slug}`),
        lastModified: p.updatedAt ?? undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    ]
  } catch {
    return staticRoutes
  }
}
