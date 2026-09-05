import Image from 'next/image'
import Link from 'next/link'
import { formatPrice, isPriceOnRequest, mediaSrc } from '@/lib/utils'

type Props = {
  product: any
  hotline?: string
  variant?: 'pack-item' | 'box-internet'
}

export default function DigishopCard({ product, hotline = '', variant = 'pack-item' }: Props) {
  const media = typeof product.image === 'object' && product.image !== null ? product.image : null
  const img = mediaSrc(media?.url)
  const tel = hotline.replace(/[^0-9]/g, '')
  const onRequest = isPriceOnRequest(product.price)
  
  if (variant === 'box-internet') {
    return (
      <div className="digibox">
        <div className="digibox__border-top" />
        <div className="digibox__top">
          <Link href={`/san-pham/${product.slug}`}><h3>{product.title}</h3></Link>
        </div>
        <div className="digibox__body">
          <div className="digibox__content" dangerouslySetInnerHTML={{ __html: product.shortDescription || '' }} />
          <p className="digibox__from">Chỉ từ</p>
          <div className="digibox__price">
            <h4>{product.price.toLocaleString('vi-VN')}</h4>
            <span>đ/ 1 tháng</span>
          </div>
        </div>
        <div className="digibox__btns">
          <Link href={`/san-pham/${product.slug}`} className="digibox__btn-detail">Chi tiết</Link>
          <a href={`tel:${tel}`} className="digibox__btn-reg">Đăng ký</a>
        </div>
      </div>
    )
  }
  
  // pack-item for di-dong
  return (
    <div className="pack-item-digi">
      <div className="pack-item-digi__img">
        <Link href={`/san-pham/${product.slug}`}>
          {img ? (
            <Image src={img} alt={product.title} width={300} height={300} />
          ) : (
            <div style={{width:'100%',height:'180px',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center'}}>📱</div>
          )}
        </Link>
      </div>
      <div className="pack-item-digi__content">
        <Link href={`/san-pham/${product.slug}`}><h2 className="pack-item-digi__title">{product.title}</h2></Link>
        <div className="pack-item-digi__price">{!onRequest && <span className="pack-item-digi__current">{formatPrice(product.price)}</span>}</div>
        <div className="pack-item-digi__des" dangerouslySetInnerHTML={{ __html: product.shortDescription || '' }} />
        <div className="pack-item-digi__actions">
          <Link href={`/san-pham/${product.slug}`} className="pack-item-digi__btn-detail">CHI TIẾT</Link>
          <a href={`tel:${tel}`} className="pack-item-digi__btn-reg">ĐĂNG KÝ NGAY</a>
        </div>
      </div>
    </div>
  )
}
