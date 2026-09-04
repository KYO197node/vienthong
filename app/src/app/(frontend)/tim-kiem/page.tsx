import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { getSettings } from '@/lib/queries'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  robots: { index: false },
}

type Props = { searchParams: Promise<{ q?: string }> }

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = (q ?? '').trim()

  let results: { id: number | string; title: string; slug: string; shortDescription?: string | null; price: number }[] = []

  if (query) {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: {
        or: [{ title: { like: query } }, { shortDescription: { like: query } }],
      },
      limit: 20,
      depth: 0,
    })
    results = docs.map((d) => ({
      id: d.id,
      title: d.title,
      slug: d.slug,
      shortDescription: d.shortDescription,
      price: d.price,
    }))
  }

  const settings = await getSettings().catch(() => null)
  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')

  return (
    <div className="vt-container">
      <nav className="vt-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Tìm kiếm</span>
      </nav>

      <article className="vt-page">
        <h1>Kết quả tìm kiếm{query ? `: “${query}”` : ''}</h1>

        <form className="vt-searchpage" action="/tim-kiem" role="search">
          <label className="sr-only" htmlFor="q">
            Từ khóa tìm kiếm
          </label>
          <input id="q" type="search" name="q" defaultValue={query} placeholder="Tìm gói internet, camera, sim..." />
          <button type="submit">Tìm</button>
        </form>

        {query && (
          <p className="vt-searchpage__count" role="status" aria-live="polite">
            {results.length > 0 ? `Tìm thấy ${results.length} sản phẩm.` : 'Không có sản phẩm nào khớp.'}
          </p>
        )}

        {query && results.length === 0 && (
          <div className="vt-empty">
            <p>
              <strong>Không tìm thấy sản phẩm phù hợp.</strong>
            </p>
            <p>
              Thử từ khóa ngắn hơn, xem <Link href="/shop">toàn bộ sản phẩm</Link>
              {tel && (
                <>
                  {' '}hoặc gọi <a href={`tel:${tel}`}>{hotline}</a> để được tư vấn
                </>
              )}
              .
            </p>
          </div>
        )}

        {results.length > 0 && (
          <ul className="vt-results">
            {results.map((r) => (
              <li key={r.id}>
                <Link href={`/san-pham/${r.slug}`}>{r.title}</Link>
                <span className="vt-results__price">{formatPrice(r.price)}</span>
                {r.shortDescription && <p>{r.shortDescription}</p>}
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
