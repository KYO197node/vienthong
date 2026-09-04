import Image from 'next/image'
import Link from 'next/link'
import { formatPrice, isPriceOnRequest, mediaSrc } from '@/lib/utils'

type MediaLike = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

type ProductLike = {
  id: string | number
  title: string
  slug: string
  price: number
  oldPrice?: number | null
  unit?: string | null
  billingCycle?: string | null
  shortDescription?: string | null
  featured?: boolean | null
  image?: MediaLike | number | null
}

/** Nhan hien cho tung gia tri billingCycle (rut gon de vao badge nho). */
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

export default function ProductCard({ product, hotline = '' }: { product: ProductLike; hotline?: string }) {
  const media = typeof product.image === 'object' && product.image !== null ? product.image : null
  const img = mediaSrc(media?.url)
  const tel = hotline.replace(/[^0-9]/g, '')
  const onRequest = isPriceOnRequest(product.price)
  const cycle = product.billingCycle ? (CYCLE_LABELS[product.billingCycle] ?? product.billingCycle) : null

  return (
    <li className="pack-card">
      {/* Anh co ty le co dinh -> khong nhay layout khi tai (tranh CLS).
          Ca anh va tieu deu la link vao trang chi tiet (bang gia chi can 1 nut). */}
      <Link className="pack-card__media" href={`/san-pham/${product.slug}`} tabIndex={-1} aria-hidden="true">
        {img ? (
          <Image
            src={img}
            alt={media?.alt || product.title}
            width={media?.width || 800}
            height={media?.height || 600}
            className="pack-card__img"
            sizes="(max-width: 420px) 100vw, (max-width: 760px) 50vw, 16vw"
          />
        ) : (
          <span className="pack-card__img pack-card__img--empty" aria-hidden="true">
            📡
          </span>
        )}
        {product.featured ? <span className="pack-card__hot">HOT</span> : null}
      </Link>

      <Link className="pack-card__title" href={`/san-pham/${product.slug}`}>
        <span>{product.title}</span>
      </Link>

      <div className={'pack-card__price' + (onRequest ? ' pack-card__price--request' : '')}>
        {formatPrice(product.price)}
        {!onRequest && product.unit ? <small className="pack-card__unit">{product.unit}</small> : null}
        {cycle ? <span className="pack-card__cycle-badge">{cycle}</span> : null}
      </div>

      {tel ? (
        <a className="pack-card__btn" href={`tel:${tel}`}>
          {onRequest ? 'Gọi tư vấn' : 'Đăng ký'}
        </a>
      ) : (
        <Link className="pack-card__btn" href={`/dang-ky?s=${product.slug}`}>
          Đăng ký
        </Link>
      )}
    </li>
  )
}
