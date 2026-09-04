import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import ProductCard from '@/components/ProductCard'
import JsonLd from '@/components/JsonLd'
import { getPayloadClient } from '@/lib/payload'
import { getSettings } from '@/lib/queries'
import { absoluteUrl, formatPrice, isPriceOnRequest, mediaSrc } from '@/lib/utils'

// Render dong: `next build` dung SQLite con production dung Postgres,
// nen khong the prerender HTML luc build. Du lieu duoc cache runtime
// qua unstable_cache trong lib/queries.ts.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

async function getProduct(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  return docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Không tìm thấy sản phẩm' }
  const metaImg = product.image && typeof product.image === 'object' ? product.image.url : null
  return {
    title: product.title,
    description: product.shortDescription,
    alternates: { canonical: `/san-pham/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.shortDescription,
      images: metaImg ? [{ url: metaImg }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const payload = await getPayloadClient()
  const catId = typeof product.category === 'object' ? product.category.id : product.category
  const cat = typeof product.category === 'object' ? product.category : null
  const [{ docs: related }, settings] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { category: { equals: catId }, slug: { not_equals: product.slug } },
      limit: 4,
      depth: 1,
    }),
    getSettings().catch(() => null),
  ])

  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')

  const media = product.image && typeof product.image === 'object' ? product.image : null
  const img = mediaSrc(media?.url)
  const onRequest = isPriceOnRequest(product.price)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription,
    image: media?.url ? [absoluteUrl(media.url)] : undefined,
    // Khong khai bao gia khi san pham chua niem yet — tranh bao gia 0d cho Google.
    offers: onRequest
      ? {
          '@type': 'Offer',
          priceCurrency: 'VND',
          availability: 'https://schema.org/InStock',
          url: absoluteUrl(`/san-pham/${product.slug}`),
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: product.price,
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: absoluteUrl(`/san-pham/${product.slug}`),
        },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.name, item: absoluteUrl(`/danh-muc/${cat.slug}`) }] : []),
      { '@type': 'ListItem', position: cat ? 3 : 2, name: product.title },
    ],
  }

  return (
    <div className="vt-container">
      <JsonLd data={[jsonLd, breadcrumbLd]} />

      <nav className="vt-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        {cat && (
          <>
            <Link href={`/danh-muc/${cat.slug}`}>{cat.name}</Link>
            <span aria-hidden="true"> / </span>
          </>
        )}
        <span aria-current="page">{product.title}</span>
      </nav>

      <article className="vt-page vt-product">
        <div className="vt-product__grid">
          {img && (
            <div className="vt-product__media">
              <Image
                src={img}
                alt={media?.alt || product.title}
                width={media?.width || 800}
                height={media?.height || 600}
                sizes="(max-width: 900px) 100vw, 45vw"
                priority
              />
            </div>
          )}

          <div className="vt-product__info">
            <h1>{product.title}</h1>

            <p className={'vt-product__price' + (onRequest ? ' vt-product__price--request' : '')}>
              {product.oldPrice ? <del>{formatPrice(product.oldPrice)}</del> : null}
              {formatPrice(product.price, product.unit)}
            </p>

            {product.shortDescription && <p className="vt-product__lead">{product.shortDescription}</p>}

            <div className="vt-product__actions">
              <Link className="vt-btn vt-btn--primary" href={`/dang-ky?s=${product.slug}`}>
                Đăng ký lắp ngay
              </Link>
              {tel && (
                <a className="vt-btn vt-btn--outline" href={`tel:${tel}`}>
                  Gọi tư vấn {hotline}
                </a>
              )}
            </div>
          </div>
        </div>

        {product.description && (
          <div className="vt-content">
            <h2>Chi tiết sản phẩm</h2>
            <RichText data={product.description} />
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="vt-section">
          <div className="vt-section-head">
            <h2>Sản phẩm liên quan</h2>
          </div>
          <ul className="pack-grid products-packgrid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} hotline={hotline} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
