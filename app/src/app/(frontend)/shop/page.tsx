import type { Metadata } from 'next'
import Link from 'next/link'
import DigishopCard from '@/components/DigishopCard'
import JsonLd from '@/components/JsonLd'
import { getCategoryTree, getProductsByCategory, getSettings } from '@/lib/queries'
import { absoluteUrl } from '@/lib/utils'
import { groupByBase } from '@/lib/variants'
import { variantForCategory } from '@/lib/queries'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sản phẩm — Dịch vụ',
  description:
    'Toàn bộ sản phẩm, dịch vụ của Viễn Thông Nga Sơn: Internet cáp quang, SIM & gói cước, camera an ninh, TV Box. Lắp đặt trọn gói tại Nga Sơn, Thanh Hóa.',
  alternates: { canonical: '/shop' },
}

type Props = { searchParams: Promise<{ page?: string }> }

export default async function ShopPage({ searchParams }: Props) {
  await searchParams
  const [tree, settings] = await Promise.all([getCategoryTree(), getSettings().catch(() => null)])
  // Giong Digishop: /shop la muc luc 3 nhom chinh, moi nhom 4 goi noi bat.
  const previews = await Promise.all(tree.map(async (r) => ({ root: r, ...(await getProductsByCategory(r.slug, 4)) })))

  const hotline = settings?.hotline ?? ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sản phẩm — Dịch vụ Viễn Thông Nga Sơn',
    url: absoluteUrl('/shop'),
  }

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
          <p className="vt-cat-desc">3 nhóm chính: Di động / Internet - Truyền hình / Dịch vụ số.</p>
        </div>

        <div className="digi-sections">
          {previews.map(({ root, products }) => {
            if (products.length === 0) return null
            const groups = groupByBase(products as any)
            const variant = variantForCategory(root.slug as string)
            return (
              <section key={root.id} id={root.slug} className="digi-section" aria-labelledby={`digi-shop-${root.slug}`}>
                <div className="digi-section-head">
                  <h2 id={`digi-shop-${root.slug}`}>{root.name}</h2>
                  <Link className="digi-see-all" href={`/danh-muc/${root.slug}`}>
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
      </section>
    </div>
  )
}
