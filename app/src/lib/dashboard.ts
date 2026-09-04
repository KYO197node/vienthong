import type { Payload, Where } from 'payload'

export type ServiceKey = 'internet' | 'sim' | 'camera' | 'tvbox' | 'other'
export type StatusKey = 'new' | 'contacted' | 'surveying' | 'done' | 'cancelled'

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  internet: 'Internet',
  sim: 'SIM / Gói cước',
  camera: 'Camera',
  tvbox: 'TV Box / MyTV',
  other: 'Khác',
}

export const STATUS_LABELS: Record<StatusKey, string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  surveying: 'Đang khảo sát',
  done: 'Hoàn tất',
  cancelled: 'Đã huỷ',
}

export type DashboardData = {
  requests: {
    total: number
    today: number
    week: number
    byStatus: Record<string, number>
    pending: number
    latest: Array<{
      id: number | string
      name: string
      phone: string
      service: string
      status: string
      address?: string | null
      createdAt: string
    }>
  }
  content: {
    products: number
    productsNoImage: number
    productsNoPrice: number
    categories: number
    categoriesEmpty: number
    posts: number
    pages: number
    media: number
  }
  warnings: Array<{ level: 'error' | 'warn' | 'info'; text: string; href?: string }>
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = startOfToday()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Tong hop so lieu cho bang dieu khien.
 * Dung `limit: 0` de chi lay `totalDocs` — khong keo ve toan bo document.
 */
export async function getDashboardData(payload: Payload): Promise<DashboardData> {
  const countReq = async (where: Where = {}) => {
    const { totalDocs } = await payload.find({ collection: 'service-requests', where, limit: 0, depth: 0 })
    return totalDocs
  }

  const statuses: StatusKey[] = ['new', 'contacted', 'surveying', 'done', 'cancelled']

  const [
    reqTotal,
    reqToday,
    reqWeek,
    statusCounts,
    latest,
    products,
    productsNoImage,
    productsNoPrice,
    categories,
    posts,
    pages,
    media,
  ] = await Promise.all([
    countReq(),
    countReq({ createdAt: { greater_than_equal: startOfToday().toISOString() } }),
    countReq({ createdAt: { greater_than_equal: daysAgo(7).toISOString() } }),
    Promise.all(statuses.map(async (s) => [s, await countReq({ status: { equals: s } })] as const)),
    payload.find({
      collection: 'service-requests',
      limit: 8,
      sort: '-createdAt',
      depth: 0,
    }),
    payload.find({ collection: 'products', limit: 0, depth: 0 }),
    payload.find({ collection: 'products', where: { image: { exists: false } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'products', where: { price: { less_than_equal: 0 } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'categories', limit: 100, depth: 0 }),
    payload.find({ collection: 'posts', limit: 0, depth: 0 }),
    payload.find({ collection: 'pages', limit: 0, depth: 0 }),
    payload.find({ collection: 'media', limit: 0, depth: 0 }),
  ])

  const byStatus = Object.fromEntries(statusCounts) as Record<string, number>
  const pending = (byStatus.new ?? 0) + (byStatus.contacted ?? 0) + (byStatus.surveying ?? 0)

  // Danh muc la (khong co con) ma khong co san pham nao -> trang se trong.
  const cats = categories.docs as Array<{ id: number; name: string; parent?: unknown }>
  const parentIds = new Set(
    cats
      .map((c) => {
        const p = c.parent as { id?: number } | number | null | undefined
        if (p == null) return null
        return typeof p === 'number' ? p : (p.id ?? null)
      })
      .filter((x): x is number => x != null),
  )
  const leafCats = cats.filter((c) => !parentIds.has(c.id))
  const emptyLeafCounts = await Promise.all(
    leafCats.map(async (c) => {
      const { totalDocs } = await payload.find({
        collection: 'products',
        where: { category: { equals: c.id } },
        limit: 0,
        depth: 0,
      })
      return totalDocs === 0 ? c.name : null
    }),
  )
  const emptyCats = emptyLeafCounts.filter((x): x is string => x != null)

  const settings = await payload.findGlobal({ slug: 'settings', depth: 0 })

  const warnings: DashboardData['warnings'] = []

  if (byStatus.new > 0) {
    warnings.push({
      level: 'error',
      text: `${byStatus.new} đăng ký mới chưa liên hệ`,
      href: '/admin/collections/service-requests?where[status][equals]=new',
    })
  }
  if (productsNoImage.totalDocs > 0) {
    warnings.push({
      level: 'warn',
      text: `${productsNoImage.totalDocs} sản phẩm chưa có ảnh — thẻ sản phẩm sẽ hiện biểu tượng thay thế`,
      href: '/admin/collections/products',
    })
  }
  if (emptyCats.length > 0) {
    warnings.push({
      level: 'warn',
      text: `${emptyCats.length} danh mục chưa có sản phẩm: ${emptyCats.slice(0, 4).join(', ')}${emptyCats.length > 4 ? '…' : ''}`,
      href: '/admin/collections/categories',
    })
  }
  if (!settings.partnerLogo) {
    warnings.push({ level: 'info', text: 'Chưa upload logo đối tác VNPT (Cài đặt website)', href: '/admin/globals/settings' })
  }
  if (!settings.logo) {
    warnings.push({ level: 'info', text: 'Chưa upload logo website (Cài đặt website)', href: '/admin/globals/settings' })
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    warnings.push({
      level: 'warn',
      text: 'Chưa cấu hình SMTP — email đặt lại mật khẩu chỉ ghi ra log, không gửi thật',
    })
  }

  return {
    requests: {
      total: reqTotal,
      today: reqToday,
      week: reqWeek,
      byStatus,
      pending,
      latest: latest.docs.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        service: d.service ?? 'other',
        status: d.status ?? 'new',
        address: d.address,
        createdAt: d.createdAt,
      })),
    },
    content: {
      products: products.totalDocs,
      productsNoImage: productsNoImage.totalDocs,
      productsNoPrice: productsNoPrice.totalDocs,
      categories: cats.length,
      categoriesEmpty: emptyCats.length,
      posts: posts.totalDocs,
      pages: pages.totalDocs,
      media: media.totalDocs,
    },
    warnings,
  }
}
