import Image from 'next/image'
import Link from 'next/link'
import { formatPrice, isPriceOnRequest, mediaSrc } from '@/lib/utils'

type Props = {
  product: any
  hotline?: string
  variant?: 'pack-item' | 'box-internet' | 'soda'
}

type LexNode = { type?: string; text?: string; children?: LexNode[] }

/** Trich text tu Lexical JSON thanh cac dong (uu tien listitem). */
function lexicalLines(desc: unknown): string[] {
  const root = (desc as { root?: { children?: LexNode[] } } | null)?.root
  if (!root || !Array.isArray(root.children)) return []
  const lines: string[] = []
  const walk = (n: LexNode, inList: boolean) => {
    if (!n) return
    if (n.type === 'text') {
      const t = (n.text ?? '').trim()
      if (t) lines.push((inList ? '• ' : '') + t)
      return
    }
    const kids = n.children ?? []
    if (n.type === 'list') {
      kids.forEach((c) => walk(c, true))
      return
    }
    if (n.type === 'listitem') {
      const t = kids
        .map((c) => (c.type === 'text' ? (c.text ?? '') : ''))
        .join('')
        .trim()
      if (t) lines.push('• ' + t)
      return
    }
    kids.forEach((c) => walk(c, inList))
  }
  root.children.forEach((c) => walk(c, false))
  return lines.map((l) => l.replace(/^•\s*•\s*/, '• ')).filter(Boolean)
}

/** Tach cac dong mo ta thanh bullets hien thi (bo muc gia/chu ky/doi tuong). */
function sodaBullets(desc: unknown): string[] {
  const skip = /bảng giá|chu kỳ|đối tượng|tự động gia hạn|kiểm tra|hủy gói|tổng đài|soạn tin|^giá \d/i
  return lexicalLines(desc)
    .map((l) => l.replace(/^•\s*/, '').replace(/^-\s*/, '').trim())
    .filter((l) => l && !skip.test(l))
    .slice(0, 4)
    .map((l) => (l.length > 90 ? l.slice(0, 87).trimEnd() + '...' : l))
}

/** Text cho pill tren banner: uu tien Data -> phut -> SMS. */
function sodaPill(title: string, desc: unknown): string {
  const text = lexicalLines(desc).join(' ') + ' ' + title
  const gbDay = text.match(/(\d+(?:[.,]\d+)?\s*GB\s*\/\s*ngày)/i)
  if (gbDay) return gbDay[1].replace(/\s+/g, '')
  const gb = text.match(/(\d+(?:[.,]\d+)?\s*GB\b)/i)
  if (gb) return gb[1].replace(/\s+/g, ' ')
  const mb = text.match(/(\d+(?:[.,]\d+)?\s*MB\b)/i)
  if (mb) return mb[1].replace(/\s+/g, ' ')
  const min = text.match(/(\d[\d.,]*\s*phút)/i)
  if (min) return min[1].replace(/\s+/g, ' ')
  const sms = text.match(/(\d[\d.,]*\s*SMS)/i)
  if (sms) return sms[1].replace(/\s+/g, ' ')
  return title.split(' ').slice(0, 2).join(' ')
}

export default function DigishopCard({ product, hotline = '', variant = 'pack-item' }: Props) {
  const media = typeof product.image === 'object' && product.image !== null ? product.image : null
  const img = mediaSrc(media?.url)
  const tel = hotline.replace(/[^0-9]/g, '')
  const onRequest = isPriceOnRequest(product.price)
  const cycleLabel = product.unit === '/tháng' ? '30 ngày' : String(product.unit ?? '').replace(/^\//, '') || '30 ngày'

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
  
  // soda: banner gradient kieu SODA155 cho Di dong, khong dung anh
  if (variant === 'soda') {
    const bullets = sodaBullets(product.description)
    const pill = sodaPill(product.title, product.description)
    return (
      <div className="soda">
        <div className="soda__head">
          <Link href={`/san-pham/${product.slug}`}><h2 className="soda__title">{product.title}</h2></Link>
          {!onRequest && (
            <p className="soda__price">
              Giá chỉ: {product.price.toLocaleString('vi-VN')} đ/{cycleLabel}
            </p>
          )}
        </div>
        <div className="soda__banner" aria-hidden="true">
          <span className="soda__banner-name">{product.title}</span>
          <span className="soda__pill">
            <span className="soda__phone">5G</span>
            <span className="soda__pill-text">{pill}</span>
          </span>
        </div>
        {bullets.length > 0 && (
          <ul className="soda__specs">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        <div className="soda__actions">
          <Link href={`/san-pham/${product.slug}`} className="soda__btn-detail">CHI TIẾT</Link>
          <a href={`tel:${tel}`} className="soda__btn-reg">ĐĂNG KÝ NGAY</a>
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
