/** Nhan hien thi khi san pham chua co gia niem yet (vd: dich vu CNTT). */
export const PRICE_ON_REQUEST = 'Liên hệ'

/** True khi san pham khong co gia co dinh -> hien "Lien he" thay vi "0d". */
export function isPriceOnRequest(price: number | null | undefined): boolean {
  return price == null || price <= 0
}

export function formatPrice(price: number | null | undefined, unit?: string | null): string {
  // Gia 0 nghia la "chua niem yet" (dich vu tu van, chu ky so...), khong phai mien phi.
  if (isPriceOnRequest(price)) return PRICE_ON_REQUEST
  const formatted = new Intl.NumberFormat('vi-VN').format(price as number)
  return formatted + '₫' + (unit ? ' ' + unit : '')
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://vienthongngason.com'
  return new URL(path, base).toString()
}

/**
 * Chuyen URL anh cua Payload ve dang duong dan tuong doi.
 * Payload sinh URL tuyet doi theo `serverURL` (vd https://vienthongngason.com/api/media/file/x.png).
 * next/image se coi do la anh remote va doi khai bao trong `images.remotePatterns`,
 * ngoai ra con lam anh di vong ra internet thay vi doc noi bo. Cat ve pathname
 * de toi uu hoa anh chay hoan toan trong container.
 */
export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/')) return url
  try {
    const parsed = new URL(url)
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}
