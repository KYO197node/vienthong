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
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setStatus('ok')
      setMessage(data.message ?? 'Đã gửi đăng ký thành công!')
      ;(e.target as HTMLFormElement).reset()
    } else {
      setStatus('err')
      setMessage(data.message ?? 'Có lỗi xảy ra, vui lòng thử lại.')
    }
  }

  return (
    <form className="vt-form" onSubmit={onSubmit}>
      {status === 'ok' && <div className="vt-msg ok">{message}</div>}
      {status === 'err' && <div className="vt-msg err">{message}</div>}
      <div>
        <label htmlFor="name">Họ và tên *</label>
        <input id="name" name="name" required maxLength={100} />
      </div>
      <div>
        <label htmlFor="phone">Số điện thoại *</label>
        <input id="phone" name="phone" type="tel" required pattern="[0-9+.\s]{8,15}" />
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
        <input id="address" name="address" maxLength={200} />
      </div>
      <div>
        <label htmlFor="note">Ghi chú thêm</label>
        <textarea id="note" name="note" rows={3} maxLength={500} />
      </div>
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Đang gửi...' : 'GỬI ĐĂNG KÝ'}
      </button>
    </form>
  )
}
