import type { CollectionConfig } from 'payload'
import config from '@payload-config'
import { getPayload } from 'payload'
import { SERVICE_LABELS } from '@/lib/dashboard'
import { safeRevalidateTag } from '@/lib/revalidate'

// Nhan email khi co dang ky moi. Chi gui khi: SMTP da cau hinh day du, email
// nhan o Settings co gia tri, va ban ghi moi tao (operation create) — tranh
// gui lai khi admin cap nhat trang thai.
async function notifyNewRequest(doc: any) {
  if (!doc) return
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'settings', depth: 0 })
    const to = settings?.email
    const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    if (!to || !smtpReady) return

    const label = SERVICE_LABELS[doc.service as keyof typeof SERVICE_LABELS] ?? doc.service
    const tel = String(doc.phone ?? '')
    await payload.sendEmail({
      to: typeof to === 'string' ? to : String(to),
      subject: `Đăng ký mới #${doc.id}: ${doc.name} — ${label}`,
      text: [
        `Có đăng ký dịch vụ mới từ website:`,
        ``,
        `Khách hàng : ${doc.name}`,
        `Điện thoại : ${tel}`,
        `Dịch vụ    : ${label}`,
        `Địa chỉ    : ${doc.address || '(chưa nhập)'}`,
        `Ghi chú    : ${doc.note || '(không có)'}`,
        `Nguồn      : ${doc.source === 'mcp' ? 'AI assistant (MCP)' : 'Form website'}`,
        ``,
        `Xem và xử lý: ${(process.env.NEXT_PUBLIC_SITE_URL ?? '')}/admin/collections/service-requests/${doc.id}`,
      ].join('\n'),
    })
  } catch (e) {
    // Loi email khong duoc lam fail thao tac ghi du lieu khach hang — dang ky
    // da an toan trong DB, email co the gui lai sau.
    console.error('[notifyNewRequest]', e)
  }
}

export const ServiceRequests: CollectionConfig = {
  slug: 'service-requests',
  labels: { singular: 'Đăng ký', plural: 'Đăng ký dịch vụ' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'service', 'status', 'source', 'createdAt'],
  },
  // Gui email thong bao den chu shop khi khach gui form — khong co dong nay
  // thi dang ky chi nam im trong DB, phai tu mo /admin moi thay.
  hooks: {
    afterChange: [
      ({ doc, operation, previousDoc }) => {
        if (operation === 'create') {
          void notifyNewRequest(doc)
        } else if (previousDoc && previousDoc.status === 'new' && doc?.status !== 'new') {
          safeRevalidateTag('service-requests')
        }
      },
    ],
    afterDelete: [() => { safeRevalidateTag('service-requests') }],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
    create: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Họ và tên' },
    { name: 'phone', type: 'text', required: true, label: 'Số điện thoại' },
    {
      name: 'service',
      type: 'select',
      options: ['internet', 'sim', 'camera', 'tvbox', 'other'],
      defaultValue: 'internet',
      label: 'Dịch vụ',
    },
    { name: 'address', type: 'text', label: 'Địa chỉ lắp đặt' },
    { name: 'note', type: 'textarea', label: 'Ghi chú' },
    {
      name: 'source',
      type: 'select',
      options: ['web', 'mcp', 'other'],
      defaultValue: 'web',
      admin: { readOnly: true },
      label: 'Nguồn',
    },
    {
      name: 'status',
      type: 'select',
      options: ['new', 'contacted', 'surveying', 'done', 'cancelled'],
      defaultValue: 'new',
      admin: { position: 'sidebar' },
      label: 'Trạng thái',
    },
  ],
}
