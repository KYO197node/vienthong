import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDashboardData, SERVICE_LABELS, STATUS_LABELS, type ServiceKey, type StatusKey } from '@/lib/dashboard'
import './Dashboard.scss'

function fmtDate(v: string) {
  return new Date(v).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_ORDER: StatusKey[] = ['new', 'contacted', 'surveying', 'done', 'cancelled']

/**
 * Bang dieu khien quan tri — thay man hinh mac dinh cua Payload.
 * Muc tieu: mo /admin la thay ngay viec can lam (dang ky moi chua goi),
 * thay tinh trang du lieu, va co loi vao nhanh cho cong viec hang ngay.
 */
export default async function Dashboard() {
  const payload = await getPayload({ config })
  const data = await getDashboardData(payload)
  const { requests: r, content: c, warnings } = data

  return (
    <div className="vt-dash">
      <header className="vt-dash__head">
        <div>
          <h1>Bảng điều khiển</h1>
          <p>Viễn Thông Nga Sơn — tổng quan đăng ký và nội dung website</p>
        </div>
        <a className="vt-dash__view-site" href="/" target="_blank" rel="noopener noreferrer">
          Xem website ↗
        </a>
      </header>

      {warnings.length > 0 && (
        <section className="vt-dash__alerts" aria-label="Việc cần làm">
          {warnings.map((w, i) => (
            <div className={`vt-dash__alert vt-dash__alert--${w.level}`} key={i}>
              <span className="vt-dash__alert-dot" aria-hidden="true" />
              <span className="vt-dash__alert-text">{w.text}</span>
              {w.href && <Link href={w.href}>Xử lý →</Link>}
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="dash-req">
        <h2 id="dash-req">Đăng ký dịch vụ</h2>
        <div className="vt-dash__stats">
          <Link className="vt-dash__stat vt-dash__stat--accent" href="/admin/collections/service-requests?where[status][equals]=new">
            <span className="vt-dash__stat-num">{r.byStatus.new ?? 0}</span>
            <span className="vt-dash__stat-label">Chưa liên hệ</span>
          </Link>
          <div className="vt-dash__stat">
            <span className="vt-dash__stat-num">{r.today}</span>
            <span className="vt-dash__stat-label">Hôm nay</span>
          </div>
          <div className="vt-dash__stat">
            <span className="vt-dash__stat-num">{r.week}</span>
            <span className="vt-dash__stat-label">7 ngày qua</span>
          </div>
          <div className="vt-dash__stat">
            <span className="vt-dash__stat-num">{r.pending}</span>
            <span className="vt-dash__stat-label">Đang xử lý</span>
          </div>
          <Link className="vt-dash__stat" href="/admin/collections/service-requests">
            <span className="vt-dash__stat-num">{r.total}</span>
            <span className="vt-dash__stat-label">Tổng cộng</span>
          </Link>
        </div>

        <div className="vt-dash__pipeline">
          {STATUS_ORDER.map((s) => (
            <Link
              className={`vt-dash__pill vt-dash__pill--${s}`}
              key={s}
              href={`/admin/collections/service-requests?where[status][equals]=${s}`}
            >
              {STATUS_LABELS[s]} <strong>{r.byStatus[s] ?? 0}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="dash-latest">
        <h2 id="dash-latest">Đăng ký gần nhất</h2>
        {r.latest.length === 0 ? (
          <p className="vt-dash__empty">Chưa có đăng ký nào. Khi khách gửi form trên website, dữ liệu sẽ hiện ở đây.</p>
        ) : (
          <div className="vt-dash__table-wrap">
            <table className="vt-dash__table">
              <thead>
                <tr>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Điện thoại</th>
                  <th scope="col">Dịch vụ</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {r.latest.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/collections/service-requests/${row.id}`}>{row.name}</Link>
                      {row.address && <small>{row.address}</small>}
                    </td>
                    <td>
                      <a href={`tel:${row.phone.replace(/[^0-9]/g, '')}`}>{row.phone}</a>
                    </td>
                    <td>{SERVICE_LABELS[row.service as ServiceKey] ?? row.service}</td>
                    <td>
                      <span className={`vt-dash__badge vt-dash__badge--${row.status}`}>
                        {STATUS_LABELS[row.status as StatusKey] ?? row.status}
                      </span>
                    </td>
                    <td>{fmtDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="dash-content">
        <h2 id="dash-content">Nội dung website</h2>
        <div className="vt-dash__stats vt-dash__stats--sm">
          <Link className="vt-dash__stat" href="/admin/collections/products">
            <span className="vt-dash__stat-num">{c.products}</span>
            <span className="vt-dash__stat-label">Sản phẩm</span>
          </Link>
          <Link className="vt-dash__stat" href="/admin/collections/categories">
            <span className="vt-dash__stat-num">{c.categories}</span>
            <span className="vt-dash__stat-label">Danh mục</span>
          </Link>
          <Link className="vt-dash__stat" href="/admin/collections/posts">
            <span className="vt-dash__stat-num">{c.posts}</span>
            <span className="vt-dash__stat-label">Bài viết</span>
          </Link>
          <Link className="vt-dash__stat" href="/admin/collections/pages">
            <span className="vt-dash__stat-num">{c.pages}</span>
            <span className="vt-dash__stat-label">Trang nội dung</span>
          </Link>
          <Link className="vt-dash__stat" href="/admin/collections/media">
            <span className="vt-dash__stat-num">{c.media}</span>
            <span className="vt-dash__stat-label">Ảnh</span>
          </Link>
        </div>

        {(c.productsNoImage > 0 || c.productsNoPrice > 0 || c.categoriesEmpty > 0) && (
          <ul className="vt-dash__issues">
            {c.productsNoImage > 0 && <li>{c.productsNoImage} sản phẩm thiếu ảnh</li>}
            {c.productsNoPrice > 0 && (
              <li>
                {c.productsNoPrice} sản phẩm giá 0 — website hiển thị “Liên hệ” thay vì “0₫”
              </li>
            )}
            {c.categoriesEmpty > 0 && <li>{c.categoriesEmpty} danh mục chưa có sản phẩm</li>}
          </ul>
        )}
      </section>

      <section aria-labelledby="dash-actions">
        <h2 id="dash-actions">Lối vào nhanh</h2>
        <div className="vt-dash__actions">
          <Link href="/admin/collections/products/create">+ Thêm sản phẩm</Link>
          <Link href="/admin/collections/posts/create">+ Viết tin tức</Link>
          <Link href="/admin/collections/media/create">+ Tải ảnh lên</Link>
          <Link href="/admin/globals/settings">Cài đặt website</Link>
          <Link href="/admin/collections/categories">Quản lý danh mục</Link>
        </div>
      </section>
    </div>
  )
}
