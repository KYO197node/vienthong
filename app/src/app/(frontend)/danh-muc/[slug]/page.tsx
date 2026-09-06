import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import DigishopCard from '@/components/DigishopCard'
import { getPayloadClient } from '@/lib/payload'
import {
  getSettings,
  getCategoryIdsWithChildren,
  getCategories,
  getCategorySections,
  parentIdOf,
  variantForCategory,
  type CategoryLike,
} from '@/lib/queries'
import { absoluteUrl } from '@/lib/utils'
import { groupByBase } from '@/lib/variants'

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

  const allCats = (await getCategories()) as unknown as CategoryLike[]
  const children = allCats.filter((c) => parentIdOf(c) === cat.id)
  const parentId = parentIdOf(cat as unknown as CategoryLike)
  const parent = parentId ? allCats.find((c) => c.id === parentId) : null
  const isParent = children.length > 0

  const settings = await getSettings().catch(() => null)
  const hotline = settings?.hotline ?? ''

  // Trang cha kieu Digishop: moi muc con 4 san pham, khong phan trang tron.
  // Trang la giu query cu + phan trang.
  const sections = isParent ? (await getCategorySections(cat.slug as string, 4)).sections : []
  const flatSectionProducts = sections.flatMap((s) => s.products)

  let products: Awaited<ReturnType<typeof payload.find>>['docs'] = []
  let totalPages = 1
  let hasPrevPage = false
  let hasNextPage = false
  if (!isParent) {
    const ids = await getCategoryIdsWithChildren(cat.id as number)
    const res = await payload.find({
      collection: 'products',
      where: { category: { in: ids } },
      limit: PER_PAGE,
      page,
      // Goi noi bat (featured) dung dau tiep theo la thu tu khai bao.
      sort: ['-featured', 'order'],
      depth: 1,
    })
    products = res.docs
    totalPages = res.totalPages
    hasPrevPage = res.hasPrevPage
    hasNextPage = res.hasNextPage
  }

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: cat.name,
      itemListElement: (isParent ? flatSectionProducts.slice(0, 20) : products).map((p, i) => ({
        '@type': 'ListItem',
        position: (isParent ? 0 : page - 1) * 0 + i + 1,
        url: absoluteUrl(`/san-pham/${(p as { slug: string }).slug}`),
        name: (p as { title: string }).title,
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

        {/* Trang cha: anchor #slug kieu Digishop de nhay toi tung section. */}
        {isParent && sections.length > 0 && (
          <nav className="vt-subcats" aria-label={`Danh mục con của ${cat.name}`}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.slug}`}>
                {s.name}
              </a>
            ))}
          </nav>
        )}
        {!isParent && children.length > 0 && (
          <nav className="vt-subcats" aria-label={`Danh mục con của ${cat.name}`}>
            {children.map((c) => (
              <Link key={c.id} href={`/danh-muc/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        {isParent ? (
          sections.length > 0 ? (
            <div className="digi-sections">
              {sections.map((s) => {
                const groups = groupByBase(s.products as any)
                const variant = variantForCategory(cat.slug as string)
                return (
                  <section key={s.id} id={s.slug} className="digi-section" aria-labelledby={`digi-${s.slug}`}>
                    <div className="digi-section-head">
                      <h2 id={`digi-${s.slug}`}>{s.name}</h2>
                      <Link className="digi-see-all" href={`/danh-muc/${s.slug}`}>
                        Xem tất cả →
                      </Link>
                    </div>
                    <div className="digi-grid">
                      {groups.map((g) => {
                        const main = g.products[0]
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
            </div>
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
          )
        ) : products.length > 0 ? (
          <>
            {(() => {
              const groups = groupByBase(products as any)
              const groupCount = groups.length
              const variantCount = products.length - groupCount
              return (
                <>
                  {variantCount > 0 && (
                    <p className="pack-count" style={{marginBottom: '12px', color: 'var(--vt-muted)', fontSize: '13px'}}>
                      Hiển thị {groupCount} gói (gộp từ {products.length} biến thể) — các gói cùng tên đã được gộp
                    </p>
                  )}
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px'}}>
                    {groups.map((g) => {
                      const main = g.products[0]
                      return (
                        <DigishopCard
                          key={main.id}
                          product={{ ...main, title: g.base, price: g.minPrice } as any}
                          hotline={hotline}
                          variant={variantForCategory(parent?.slug ?? cat.slug as string)}
                        />
                      )
                    })}
                  </div>
                </>
              )
            })()}
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
