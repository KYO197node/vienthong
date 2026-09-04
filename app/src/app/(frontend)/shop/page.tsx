import type { Metadata } from 'next'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import JsonLd from '@/components/JsonLd'
import { getPayloadClient } from '@/lib/payload'
import { getCategoryTree, getSettings } from '@/lib/queries'
import { absoluteUrl } from '@/lib/utils'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

const PER_PAGE = 24

export const metadata: Metadata = {
  title: 'Sản phẩm — Dịch vụ',
  description:
    'Toàn bộ sản phẩm, dịch vụ của Viễn Thông Nga Sơn: Internet cáp quang, SIM & gói cước, camera an ninh, TV Box. Lắp đặt trọn gói tại Nga Sơn, Thanh Hóa.',
  alternates: { canonical: '/shop' },
}

type Props = { searchParams: Promise<{ page?: string }> }

export default async function ShopPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const payload = await getPayloadClient()
  const [tree, settings, result] = await Promise.all([
    getCategoryTree(),
    getSettings().catch(() => null),
    // Phan trang o phia server: truoc day tra ve 100 san pham mot lan,
    // trang /shop dai 74 the va tai toan bo anh cung luc.
    payload.find({ collection: 'products', limit: PER_PAGE, page, sort: ['-featured', 'order'], depth: 1 }),
  ])

  const { docs: products, totalPages, totalDocs, hasPrevPage, hasNextPage } = result
  const hotline = settings?.hotline ?? ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sản phẩm — Dịch vụ Viễn Thông Nga Sơn',
    url: absoluteUrl('/shop'),
  }

  const pageHref = (p: number) => (p <= 1 ? '/shop' : `/shop?page=${p}`)

  return (
    <div className="vt-container">
      <JsonLd data={jsonLd} />

      <nav className="vt-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Sản phẩm</span>
      </nav>

      <section className="vt-section">
        <div className="vt-cat-head">
          <h1>Tất cả sản phẩm &amp; dịch vụ</h1>
          <p className="vt-cat-desc">
            {totalDocs} sản phẩm — trang {page}/{Math.max(1, totalPages)}
          </p>
        </div>

        {/* Danh muc nhom theo cap thay vi 16 link phang khong thu tu. */}
        {tree.length > 0 && (
          <nav className="vt-catnav" aria-label="Danh mục sản phẩm">
            {tree.map((root) => (
              <div className="vt-catnav__group" key={root.id}>
                <Link className="vt-catnav__root" href={`/danh-muc/${root.slug}`}>
                  {root.name}
                </Link>
                {root.children.length > 0 && (
                  <ul className="vt-catnav__children">
                    {root.children.map((c) => (
                      <li key={c.id}>
                        <Link href={`/danh-muc/${c.slug}`}>{c.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        )}

        {products.length > 0 ? (
          <>
            <ul className="pack-grid products-packgrid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} hotline={hotline} />
              ))}
            </ul>

            {totalPages > 1 && (
              <nav className="vt-pagination" aria-label="Phân trang">
                {hasPrevPage && (
                  <Link className="page-numbers" href={pageHref(page - 1)} rel="prev">
                    ← Trước
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
                  p === page ? (
                    <span className="page-numbers current" key={p} aria-current="page">
                      {p}
                    </span>
                  ) : (
                    <Link className="page-numbers" href={pageHref(p)} key={p}>
                      {p}
                    </Link>
                  ),
                )}
                {hasNextPage && (
                  <Link className="page-numbers" href={pageHref(page + 1)} rel="next">
                    Sau →
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="vt-empty">
            <p>
              <strong>Chưa có sản phẩm.</strong>
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
