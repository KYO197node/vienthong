import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

const SERVICES = ['internet', 'sim', 'camera', 'tvbox', 'other'] as const

// ---------------------------------------------------------------------------
// Rate limit in-memory theo IP: 5 request / 10 phut / IP.
// Du cho site 1 container — restart thi reset bang chuyen va cham, chap nhan
// duoc so voi viec them Redis chi de chan spam form cong khai.
// Neu co REDIS_URL hoac UPSTASH_REDIS_URL thi co the thay bang Redis o tuong lai;
// hien tai giu in-memory de khong them dependency.
// ---------------------------------------------------------------------------
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5

type Bucket = { count: number; resetAt: number }
const globalForRate = globalThis as unknown as { __regRate?: Map<string, Bucket> }
const buckets: Map<string, Bucket> = (globalForRate.__regRate ??= new Map())

function rateLimited(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now()
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

function normalizePhone(raw: string): string {
  let s = raw.trim().replace(/[\s.-]+/g, '')
  // Chuyen +84 -> 0
  if (s.startsWith('+84')) s = '0' + s.slice(3)
  if (s.startsWith('84') && s.length >= 10 && s.length <= 12) s = '0' + s.slice(2)
  return s
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  // Neu chua cau hinh Turnstile thi bo qua (khong chan form)
  if (!secret) return true
  if (!token) return false
  try {
    const form = new URLSearchParams()
    form.append('secret', secret)
    form.append('response', token)
    if (ip) form.append('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  } catch {
    // Loi mang khi verify -> cho qua de khong mat lead, log de theo doi
    console.warn('[turnstile] verify failed, allowing request')
    return true
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
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

    // Honeypot: bot dien field an `website` -> loai ngay
    const honey = String(body.website ?? body.url ?? '').trim()
    if (honey) {
      // Tra ok gia de bot tuong thanh cong, nhung khong ghi DB
      return NextResponse.json({ message: 'Đã gửi đăng ký thành công! Kỹ thuật viên sẽ gọi lại trong 30 phút (giờ hành chính).' })
    }

    const turnstileToken = String(body['cf-turnstile-response'] ?? body.turnstile ?? '').trim()
    const turnstileOk = await verifyTurnstile(turnstileToken, ip === 'local' ? null : ip)
    if (!turnstileOk) {
      return NextResponse.json({ message: 'Xác minh bảo mật thất bại. Vui lòng thử lại.' }, { status: 400 })
    }

    const name = String(body.name ?? '').trim()
    const phoneRaw = String(body.phone ?? '').trim()
    const phone = normalizePhone(phoneRaw)
    const service = (SERVICES as readonly string[]).includes(String(body.service))
      ? (String(body.service) as (typeof SERVICES)[number])
      : 'other'
    const address = String(body.address ?? '').trim().slice(0, 200)
    const note = String(body.note ?? '').trim().slice(0, 500)

    if (name.length < 2) return NextResponse.json({ message: 'Vui lòng nhập họ tên.' }, { status: 400 })
    if (!/^(0[0-9]{9,10})$/.test(phone)) return NextResponse.json({ message: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 chữ số.' }, { status: 400 })

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
