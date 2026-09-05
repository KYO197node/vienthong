'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice, isPriceOnRequest, mediaSrc } from '@/lib/utils'

type Pack = {
  id: number
  title: string
  slug: string
  price: number
  unit?: string | null
  billingCycle?: string | null
  shortDescription?: string | null
  featured?: boolean | null
  image?: { url?: string | null; alt?: string | null; width?: number | null; height?: number | null } | number | null
}

const CYCLE_LABELS: Record<string, string> = {
  daily: '24h',
  weekly: '7 ngày',
  monthly: '30 ngày',
  '1m': '1 tháng',
  '3m': '3 tháng',
  '6m': '6 tháng',
  '12m': '12 tháng',
  other: '',
}

export default function PackGrid({ packs, hotline }: { packs: Pack[]; hotline: string }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured')

  const visible = useMemo(() => {
    let list = [...packs]
    // Goi noi bat luon dung dau khi khong sap xep gia.
    if (sort === 'featured') list.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((p) => (p.title + ' ' + (p.shortDescription ?? '')).toLowerCase().includes(q))
    // San pham "Lien he" (gia 0) luon xuong cuoi khi sap xep theo gia,
    // neu khong chung se dung dau danh sach gia thap -> cao va gay nham lan.
    if (sort === 'price-asc') {
      list.sort((a, b) => {
        if (isPriceOnRequest(a.price) !== isPriceOnRequest(b.price)) return isPriceOnRequest(a.price) ? 1 : -1
        return a.price - b.price
      })
    }
    if (sort === 'price-desc') {
      list.sort((a, b) => {
        if (isPriceOnRequest(a.price) !== isPriceOnRequest(b.price)) return isPriceOnRequest(a.price) ? 1 : -1
        return b.price - a.price
      })
    }
    return list
  }, [packs, query, sort])

  const tel = hotline.replace(/[^0-9]/g, '')

  return (
    <div>
      <div className="pack-filter">
        <label className="pack-filter__field">
          <span className="sr-only">Tìm kiếm gói</span>
          <input
            className="pack-filter__input"
            type="search"
            placeholder="Nhập tên gói cước hoặc từ khóa cần tìm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="pack-filter__sort">
          Sắp xếp theo:{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="featured">Nổi bật</option>
            <option value="price-asc">Giá thấp → cao</option>
            <option value="price-desc">Giá cao → thấp</option>
          </select>
        </label>
      </div>

      <p className="pack-count" role="status" aria-live="polite">
        {query.trim()
          ? `Tìm thấy ${visible.length} gói cho “${query.trim()}”`
          : `${visible.length} gói dịch vụ`}
      </p>

      {visible.length === 0 ? (
        <p className="pack-empty">
          Không tìm thấy gói phù hợp. Vui lòng gọi hotline <a href={`tel:${tel}`}>{hotline}</a> để được tư vấn!
        </p>
      ) : (
        <ul className="pack-grid">
          {visible.map((p) => {
            const media = typeof p.image === 'object' && p.image !== null ? p.image : null
            const img = mediaSrc(media?.url)
            const onRequest = isPriceOnRequest(p.price)
            const cycle = p.billingCycle ? (CYCLE_LABELS[p.billingCycle] ?? p.billingCycle) : null
            return (
              <li className="pack-card" key={p.id}>
                <Link className="pack-card__media" href={`/san-pham/${p.slug}`} tabIndex={-1} aria-hidden="true">
                  {img ? (
                    <Image
                      src={img}
                      alt={media?.alt || p.title}
                      width={media?.width || 800}
                      height={media?.height || 600}
                      className="pack-card__img"
                      sizes="(max-width: 420px) 100vw, (max-width: 760px) 50vw, 30vw"
                    />
                  ) : (
                    <span className="pack-card__img pack-card__img--empty" aria-hidden="true">
                      📡
                    </span>
                  )}
                  {p.featured ? <span className="pack-card__hot">HOT</span> : null}
                </Link>

                <Link className="pack-card__title" href={`/san-pham/${p.slug}`}>
                  <span>{p.title}</span>
                </Link>

                <div className={'pack-card__price' + (onRequest ? ' pack-card__price--request' : '')}>
                  {formatPrice(p.price)}
                  {!onRequest && p.unit ? <small className="pack-card__unit">{p.unit}</small> : null}
                  {cycle ? <span className="pack-card__cycle-badge">{cycle}</span> : null}
                </div>

                <div className="pack-card__actions">
                  <Link className="pack-card__btn pack-card__btn--ghost" href={`/san-pham/${p.slug}`}>
                    CHI TIẾT
                  </Link>
                  <a className="pack-card__btn" href={`tel:${tel}`}>
                    {onRequest ? 'Gọi tư vấn' : 'ĐĂNG KÝ NGAY'}
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
