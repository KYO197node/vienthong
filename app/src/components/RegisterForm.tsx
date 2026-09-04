'use client'

import { useState } from 'react'

export default function RegisterForm({ defaultService }: { defaultService?: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setMessage('')
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    form.forEach((v, k) => {
      body[k] = String(v)
    })
    // Turnstile token (neu co widget)
    const tsInput = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')
    if (tsInput?.value) body['cf-turnstile-response'] = tsInput.value
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setStatus('ok')
      setMessage(data.message ?? 'Đã gửi đăng ký thành công!')
      ;(e.target as HTMLFormElement).reset()
      // Reset Turnstile widget neu co
      const w = (window as unknown as { turnstile?: { reset: () => void } }).turnstile
      try { w?.reset() } catch {}
    } else {
      setStatus('err')
      setMessage(data.message ?? 'Có lỗi xảy ra, vui lòng thử lại.')
    }
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return (
    <form className="vt-form" onSubmit={onSubmit} noValidate>
      {status === 'ok' && (
        <div className="vt-msg ok" role="status" aria-live="polite">
          {message}
        </div>
      )}
      {status === 'err' && (
        <div className="vt-msg err" role="alert">
          {message}
        </div>
      )}
      <div>
        <label htmlFor="name">Họ và tên *</label>
        <input id="name" name="name" required maxLength={100} autoComplete="name" aria-required="true" />
      </div>
      <div>
        <label htmlFor="phone">Số điện thoại *</label>
        <input id="phone" name="phone" type="tel" required inputMode="numeric" pattern="[0-9+.\s]{8,15}" autoComplete="tel" aria-required="true" />
      </div>
      <div>
        <label htmlFor="service">Dịch vụ cần lắp</label>
        <select id="service" name="service" defaultValue={defaultService || 'internet'}>
          <option value="internet">Internet cáp quang</option>
          <option value="sim">SIM – Gói cước</option>
          <option value="camera">Camera an ninh</option>
          <option value="tvbox">TV Box – Truyền hình</option>
          <option value="other">Khác</option>
        </select>
      </div>
      <div>
        <label htmlFor="address">Địa chỉ lắp đặt</label>
        <input id="address" name="address" maxLength={200} autoComplete="street-address" />
      </div>
      <div>
        <label htmlFor="note">Ghi chú thêm</label>
        <textarea id="note" name="note" rows={3} maxLength={500} />
      </div>
      {/* Honeypot: an voi nguoi dung that, bot se dien */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {siteKey ? (
        <div className="vt-turnstile">
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
        </div>
      ) : null}
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Đang gửi...' : 'GỬI ĐĂNG KÝ'}
      </button>
    </form>
  )
}
