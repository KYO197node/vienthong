import type { Metadata } from 'next'
import Link from 'next/link'
import RegisterForm from '@/components/RegisterForm'
import { getPayloadClient } from '@/lib/payload'
import { getSettings, getCategoryTree, getCategories, parentIdOf, type CategoryLike } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Đăng ký lắp đặt dịch vụ',
  description:
    'Đăng ký lắp đặt Internet cáp quang, SIM, Camera, TV Box tại Nga Sơn, Thanh Hóa — gọi lại tư vấn trong 30 phút, khảo sát miễn phí.',
  alternates: { canonical: '/dang-ky' },
}

type Props = { searchParams: Promise<{ s?: string }> }

// Map danh muc (goc hoac con) -> key dich vu cua form dang ky.
const ROOT_TO_SERVICE: Record<string, string> = {
  'di-dong': 'sim',
  'internet-truyen-hinh': 'internet',
  'dich-vu-cntt': 'other',
}
const LEAF_TO_SERVICE: Record<string, string> = {
  camera: 'camera',
  mytv: 'tvbox',
  'tv-box': 'tvbox',
}

/** Chuyen ?s=<slug san pham> thanh key dich vu (internet/sim/camera/tvbox/other). */
async function resolveService(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined
  const payload = await getPayloadClient()
  // depth 0 la du — chi can id danh muc, khong can expand
  const { docs } = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  const p = docs[0]
  if (!p) return undefined

  const cats = (await getCategories()) as unknown as CategoryLike[]
  const catId = typeof p.category === 'object' && p.category !== null ? p.category.id : (p.category as number)
  const cat = cats.find((c) => c.id === catId)
  if (!cat) return undefined

  if (LEAF_TO_SERVICE[cat.slug]) return LEAF_TO_SERVICE[cat.slug]
  for (const [k, v] of Object.entries(LEAF_TO_SERVICE)) {
    if (cat.slug.includes(k)) return v
  }
  const pid = parentIdOf(cat)
  const parent = pid ? cats.find((c) => c.id === pid) : null
  return (parent && ROOT_TO_SERVICE[parent.slug]) ?? undefined
}

export default async function RegisterPage({ searchParams }: Props) {
  const [{ s }, settings, tree] = await Promise.all([searchParams, getSettings().catch(() => null), getCategoryTree()])
  const defaultService = await resolveService(s)

  const hotline = settings?.hotline ?? ''
  const tel = hotline.replace(/[^0-9]/g, '')
  const isValidLink = (u?: string | null) => Boolean(u) && u !== '#' && /^https?:\/\//.test(u as string)

  // Lay danh muc tu DB thay vi hardcode slug — truoc day link
  // /danh-muc/tv-box-truyen-hinh tra ve 404 vi slug do khong ton tai.
  const popular = tree.flatMap((r) => (r.children.length > 0 ? r.children.slice(0, 2) : [r])).slice(0, 5)

  return (
    <div className="vt-container">
      <nav className="vt-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Đăng ký lắp đặt</span>
      </nav>

      <article className="vt-page">
        <h1>Đăng ký dịch vụ — Miễn phí khảo sát</h1>
        <p>
          Điền thông tin bên dưới, kỹ thuật viên sẽ <strong>gọi lại tư vấn trong 30 phút</strong> (giờ hành chính).
        </p>

        <div className="reg-layout">
          <div className="reg-form-col">
            <RegisterForm defaultService={defaultService} />
          </div>

          <aside className="reg-info-col">
            <h2>Liên hệ trực tiếp</h2>
            <ul className="reg-contact">
              {tel && (
                <li>
                  Hotline/Zalo:{' '}
                  <a className="reg-contact__tel" href={`tel:${tel}`}>
                    {hotline}
                  </a>
                </li>
              )}
              {isValidLink(settings?.messenger) && (
                <li>
                  Fanpage:{' '}
                  <a href={settings!.messenger as string} target="_blank" rel="noopener noreferrer">
                    Facebook Messenger
                  </a>
                </li>
              )}
              <li>{settings?.address ?? 'Nga Sơn, Thanh Hóa'} — phục vụ tận nhà toàn huyện</li>
              <li>Giờ làm việc: 7h30 – 19h00 hằng ngày</li>
            </ul>

            <h2>Cam kết với khách hàng</h2>
            <ul>
              <li>Gọi lại trong 30 phút kể từ khi nhận đăng ký (trong giờ làm việc).</li>
              <li>
                Khảo sát và tư vấn <strong>hoàn toàn miễn phí</strong>.
              </li>
              <li>Báo giá trọn gói trước khi lắp — không phát sinh chi phí.</li>
              <li>Thông tin của bạn được bảo mật theo chính sách bảo vệ thông tin khách hàng.</li>
            </ul>

            {popular.length > 0 && (
              <>
                <h2>Dịch vụ phổ biến</h2>
                <ul>
                  {popular.map((c) => (
                    <li key={c.id}>
                      <Link href={`/danh-muc/${c.slug}`}>{c.name}</Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/shop">Tất cả sản phẩm &amp; dịch vụ</Link>
                  </li>
                </ul>
              </>
            )}
          </aside>
        </div>
      </article>
    </div>
  )
}
