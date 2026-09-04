import Image from 'next/image'
import Link from 'next/link'
import { getSettings, getCategoryTree } from '@/lib/queries'
import { mediaSrc } from '@/lib/utils'

const POLICIES = [
  { href: '/chinh-sach/dieu-khoan-chung', label: 'Điều khoản chung' },
  { href: '/chinh-sach/chinh-sach-bao-ve-thong-tin-khach-hang', label: 'Chính sách bảo vệ thông tin khách hàng' },
  { href: '/chinh-sach/chinh-sach-thanh-toan', label: 'Chính sách thanh toán' },
  { href: '/chinh-sach/chinh-sach-bao-hanh-doi-tra', label: 'Chính sách bảo hành và đổi trả' },
  { href: '/chinh-sach/quy-trinh-lap-dat-va-khieu-nai', label: 'Quy trình lắp đặt và giải quyết khiếu nại' },
]

export default async function Footer() {
  const [settings, tree] = await Promise.all([getSettings(), getCategoryTree()])
  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')
  const siteName = settings?.siteName ?? 'Viễn Thông Nga Sơn'
  const isValidLink = (u?: string | null) => Boolean(u) && u !== '#' && /^https?:\/\//.test(u as string)

  const partner = settings?.partnerLogo && typeof settings.partnerLogo === 'object' ? settings.partnerLogo : null
  const partnerSrc = mediaSrc(partner?.url)
  const partnerLabel = settings?.partnerLabel || 'Đối tác uỷ quyền VNPT'

  return (
    <footer className="vt-footer">
      <div className="vt-container">
        <div className="vt-footer-grid">
          <div className="vt-footer-about">
            <h4>{siteName}</h4>
            <strong>{settings?.slogan ?? 'Đồng hành cùng mọi nhà'}</strong>
            {settings?.address && <p>Địa chỉ: {settings.address}</p>}
            {hotline && (
              <p>
                Hotline: <a href={`tel:${tel}`}>{hotline}</a>
              </p>
            )}
            {settings?.email && (
              <p>
                Email: <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </p>
            )}

            {/* Badge doi tac: logo VNPT dang thay duoc, khong phai watermark mo. */}
            {partnerSrc && (
              <p className="vt-partner">
                <Image
                  src={partnerSrc}
                  alt={partner?.alt || partnerLabel}
                  width={partner?.width || 400}
                  height={partner?.height || 160}
                  sizes="150px"
                />
                <span>{partnerLabel}</span>
              </p>
            )}
          </div>

          <div>
            <h4>Dịch vụ</h4>
            <ul>
              {/* Chi liet ke danh muc goc — truoc day in ca 16 danh muc phang. */}
              {tree.map((c) => (
                <li key={c.id}>
                  <Link href={`/danh-muc/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/shop">Tất cả sản phẩm</Link>
              </li>
              <li>
                <Link href="/dang-ky">Đăng ký lắp đặt</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Chính sách &amp; điều khoản</h4>
            <ul>
              {POLICIES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href}>{p.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Kết nối</h4>
            <ul>
              {hotline && (
                <li>
                  <a href={`tel:${tel}`}>Gọi ngay: {hotline}</a>
                </li>
              )}
              {isValidLink(settings?.zalo) && (
                <li>
                  <a href={settings!.zalo as string} target="_blank" rel="noopener noreferrer">
                    Chat Zalo
                  </a>
                </li>
              )}
              {isValidLink(settings?.messenger) && (
                <li>
                  <a href={settings!.messenger as string} target="_blank" rel="noopener noreferrer">
                    Facebook Messenger
                  </a>
                </li>
              )}
              <li>
                <Link href="/ho-tro">Trung tâm hỗ trợ</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="vt-copyright">
        <div className="vt-container">
          Copyright © {new Date().getFullYear()} {siteName}
          {settings?.slogan ? ` | ${settings.slogan}` : ''}
        </div>
      </div>
    </footer>
  )
}
