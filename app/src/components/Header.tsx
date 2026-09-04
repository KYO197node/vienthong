import Image from 'next/image'
import Link from 'next/link'
import { getSettings, getCategoryTree } from '@/lib/queries'
import { mediaSrc } from '@/lib/utils'
import SiteNav, { type NavCategory } from './SiteNav'

const MENU = [
  { href: '/shop', label: 'Danh mục sản phẩm', mega: true },
  { href: '/', label: 'Trang chủ' },
  { href: '/tin-tuc', label: 'Tin tức' },
  { href: '/dang-ky', label: 'Đăng ký lắp đặt' },
  { href: '/ho-tro', label: 'Hỗ trợ' },
  { href: '/gioi-thieu', label: 'Giới thiệu' },
]

export default async function Header() {
  const [settings, tree] = await Promise.all([getSettings(), getCategoryTree()])
  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')
  const siteName = settings?.siteName ?? 'Viễn Thông Nga Sơn'

  const categories: NavCategory[] = tree.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    children: r.children.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  }))

  const logo = settings?.logo && typeof settings.logo === 'object' ? settings.logo : null
  const logoSrc = mediaSrc(logo?.url)

  const partner = settings?.partnerLogo && typeof settings.partnerLogo === 'object' ? settings.partnerLogo : null
  const partnerSrc = mediaSrc(partner?.url)
  const partnerLabel = settings?.partnerLabel || 'Đối tác uỷ quyền VNPT'

  return (
    <header className="vt-header">
      <a className="vt-skip" href="#main">
        Bỏ qua điều hướng, đến nội dung chính
      </a>

      <div className="vt-container vt-header-main">
        {/* BEN TRAI: logo thuong hieu, la link ve trang chu. */}
        <div className="vt-logo">
          <Link href="/" className="vt-logo-link" aria-label={`${siteName} — về trang chủ`}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={siteName}
                width={logo?.width || 512}
                height={logo?.height || 512}
                priority
              />
            ) : (
              <span className="vt-logo-text">
                <strong>{siteName}</strong>
                <span>{settings?.slogan ?? 'Đồng hành cùng mọi nhà'}</span>
              </span>
            )}
          </Link>
        </div>

        <div className="vt-search">
          <form action="/tim-kiem" role="search">
            <label className="sr-only" htmlFor="vt-q">
              Tìm kiếm sản phẩm
            </label>
            <input id="vt-q" type="search" name="q" placeholder="Tìm gói internet, camera, sim..." />
            <button type="submit">
              <span aria-hidden="true">🔍</span>
              <span className="sr-only">Tìm</span>
            </button>
          </form>
        </div>

        {/* BEN PHAI: hotline + logo doi tac VNPT.
            Hotline chi xuat hien MOT lan trong header (truoc day lap ca o topbar). */}
        <div className="vt-header-right">
          {hotline && (
            <a className="vt-header-hotline" href={`tel:${tel}`}>
              <span className="vt-header-hotline__label">Hotline tư vấn miễn phí</span>
              <strong>{hotline}</strong>
            </a>
          )}

          {partnerSrc && (
            <div className="vt-header-partner" title={partnerLabel}>
              <Image
                src={partnerSrc}
                alt={partner?.alt || partnerLabel}
                width={partner?.width || 400}
                height={partner?.height || 160}
                priority
              />
              <span className="vt-header-partner__label">{partnerLabel}</span>
            </div>
          )}
        </div>
      </div>

      <SiteNav items={MENU} categories={categories} />
    </header>
  )
}
