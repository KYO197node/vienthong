import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

const SERVICES = ['internet', 'sim', 'camera', 'tvbox', 'other'] as const

// ---------------------------------------------------------------------------
// Rate limit in-memory theo IP: 5 request / 10 phut / IP.
// Du cho site 1 container — restart thi reset bang chuyen va cham, chap nhan
// duoc so voi vie them Redis chi de chan spam form cong khai.
// ---------------------------------------------------------------------------
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5

type Bucket = { count: number; resetAt: number }
const globalForRate = globalThis as unknown as { __regRate?: Map<string, Bucket> }
const buckets: Map<string, Bucket> = (globalForRate.__regRate ??= new Map())

function rateLimited(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now()
  // don sach cac bucket qua han truoc khi check
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k)
  }
  const b = buckets.get(ip)
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { limited: false, retryAfter: 0 }
  }
  b.count += 1
  if (b.count > MAX_PER_WINDOW) {
    return { limited: true, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { limited: false, retryAfter: 0 }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'

  const rl = rateLimited(ip)
  if (rl.limited) {
    return NextResponse.json(
      { message: 'Bạn đã gửi quá nhiều đăng ký. Vui lòng thử lại sau ít phút hoặc gọi hotline.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ message: 'Dữ liệu không hợp lệ.' }, { status: 400 })

    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const service = (SERVICES as readonly string[]).includes(String(body.service))
      ? (String(body.service) as (typeof SERVICES)[number])
      : 'other'
    const address = String(body.address ?? '').trim().slice(0, 200)
    const note = String(body.note ?? '').trim().slice(0, 500)

    if (name.length < 2) return NextResponse.json({ message: 'Vui lòng nhập họ tên.' }, { status: 400 })
    if (!/^[0-9+.\s]{8,15}$/.test(phone)) return NextResponse.json({ message: 'Số điện thoại không hợp lệ.' }, { status: 400 })

    const payload = await getPayloadClient()
    await payload.create({
      collection: 'service-requests',
      data: { name, phone, service, address, note, source: 'web', status: 'new' },
    })

    return NextResponse.json({
      message: 'Đã gửi đăng ký thành công! Kỹ thuật viên sẽ gọi lại trong 30 phút (giờ hành chính).',
    })
  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ message: 'Có lỗi hệ thống, vui lòng gọi hotline.' }, { status: 500 })
  }
}
