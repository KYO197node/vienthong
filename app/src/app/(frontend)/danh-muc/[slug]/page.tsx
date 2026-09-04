import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import PackGrid from '@/components/PackGrid'
import { getPayloadClient } from '@/lib/payload'
import { getSettings, getCategoryIdsWithChildren, getCategories, parentIdOf, type CategoryLike } from '@/lib/queries'
import { absoluteUrl } from '@/lib/utils'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'categories', where: { slug: { equals: slug } }, limit: 1 })
  const cat = docs[0]
  if (!cat) return { title: 'Không tìm thấy danh mục' }
  return {
    title: `${cat.name} tại Nga Sơn, Thanh Hóa — Giá tốt, lắp nhanh | Viễn Thông Nga Sơn`,
    description:
      cat.description ||
      `Các sản phẩm, dịch vụ ${cat.name} tại Nga Sơn, Thanh Hóa — lắp đặt trọn gói, giá tốt.`,
    alternates: { canonical: `/danh-muc/${cat.slug}` },
    openGraph: { title: cat.name, description: cat.description || undefined },
  }
}

// 12 san pham/trang — giong /shop. Truoc day limit 100 mot trang: danh muc
// di-dong co 235 goi nen mot lan render 100 the + 100 bien the next/image.
const PER_PAGE = 24

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const payload = await getPayloadClient()
  const { docs: cats } = await payload.find({ collection: 'categories', where: { slug: { equals: slug } }, limit: 1 })
  const cat = cats[0]
  if (!cat) notFound()

  // Gom san pham cua chinh danh muc + tat ca danh muc con. San pham chi duoc gan
  // vao danh muc la, nen neu chi query dung id cua danh muc cha thi trang se trong.
  const ids = await getCategoryIdsWithChildren(cat.id as number)
  const { docs: products, totalPages, hasPrevPage, hasNextPage } = await payload.find({
    collection: 'products',
    where: { category: { in: ids } },
    limit: PER_PAGE,
    page,
    // Goi noi bat (featured) dung dau tiep theo la thu tu khai bao.
    sort: ['-featured', 'order'],
    depth: 1,
  })

  const allCats = (await getCategories()) as unknown as CategoryLike[]
  const children = allCats.filter((c) => parentIdOf(c) === cat.id)
  const parentId = parentIdOf(cat as unknown as CategoryLike)
  const parent = parentId ? allCats.find((c) => c.id === parentId) : null

  const settings = await getSettings().catch(() => null)
  const hotline = settings?.hotline ?? ''

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: cat.name,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: (page - 1) * PER_PAGE + i + 1,
        url: absoluteUrl(`/san-pham/${p.slug}`),
        name: p.title,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
        ...(parent
          ? [{ '@type': 'ListItem', position: 2, name: parent.name, item: absoluteUrl(`/danh-muc/${parent.slug}`) }]
          : []),
        { '@type': 'ListItem', position: parent ? 3 : 2, name: cat.name, item: absoluteUrl(`/danh-muc/${cat.slug}`) },
      ],
    },
  ]

  return (
    <div className="vt-container">
      <JsonLd data={jsonLd} />

      <nav className="vt-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        {parent && (
          <>
            <Link href={`/danh-muc/${parent.slug}`}>{parent.name}</Link>
            <span aria-hidden="true"> / </span>
          </>
        )}
        <span aria-current="page">{cat.name}</span>
      </nav>

      <section className="vt-section">
        <div className="vt-cat-head">
          <h1>{cat.name}</h1>
          <p className="vt-cat-desc">
            {cat.description || 'Giá chính hãng, lắp đặt tận nhà tại Nga Sơn, Thanh Hóa.'}
          </p>
        </div>

        {/* Danh muc con: dieu huong sau hon thay vi de nguoi dung mac ket. */}
        {children.length > 0 && (
          <nav className="vt-subcats" aria-label={`Danh mục con của ${cat.name}`}>
            {children.map((c) => (
              <Link key={c.id} href={`/danh-muc/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        {products.length > 0 ? (
          <>
            <PackGrid packs={products} hotline={hotline} />
            {totalPages > 1 && (
              <nav className="vt-pagination" aria-label="Phân trang">
                {hasPrevPage && (
                  <Link className="page-numbers" href={`/danh-muc/${cat.slug}?page=${page - 1}`} rel="prev">
                    ← Trước
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
                  p === page ? (
                    <span className="page-numbers current" key={p} aria-current="page">
                      {p}
                    </span>
                  ) : (
                    <Link className="page-numbers" href={`/danh-muc/${cat.slug}?page=${p}`} key={p}>
                      {p}
                    </Link>
                  ),
                )}
                {hasNextPage && (
                  <Link className="page-numbers" href={`/danh-muc/${cat.slug}?page=${page + 1}`} rel="next">
                    Sau →
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="vt-empty">
            <p>
              <strong>Chưa có sản phẩm trong danh mục này.</strong>
            </p>
            <p>
              Vui lòng xem <Link href="/shop">toàn bộ sản phẩm</Link>
              {hotline && (
                <>
                  {' '}hoặc gọi hotline <a href={`tel:${hotline.replace(/[^0-9]/g, '')}`}>{hotline}</a> để được tư vấn
                </>
              )}
              .
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
