import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { getSettings } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Hỗ trợ — Liên hệ',
  description: 'Liên hệ Viễn Thông Nga Sơn: hotline, Zalo, địa chỉ, giờ làm việc. Hỗ trợ kỹ thuật tận nhà trong 24 giờ tại Nga Sơn, Thanh Hóa.',
  alternates: { canonical: '/ho-tro' },
}

const FAQS = [
  { q: 'Lắp mạng có cần trả trước bao nhiêu?', a: 'Tùy gói cước và chương trình ưu đãi từng thời điểm, kỹ thuật viên sẽ báo giá trọn gói khi khảo sát.' },
  { q: 'Thời gian lắp đặt mất bao lâu?', a: 'Thường trong vòng 24 giờ sau khi khảo sát (tùy khu vực và tình trạng đường truyền).' },
  { q: 'Camera có xem được khi mất điện không?', a: 'Không, camera cần điện để hoạt động. Có thể lắp thêm pin dự phòng nếu bạn có nhu cầu.' },
  { q: 'Có bảo hành tại nhà không?', a: 'Có. Mọi thiết bị do chúng tôi lắp đặt đều được hỗ trợ kỹ thuật tận nhà trong 24 giờ.' },
]

export default async function SupportPage() {
  const settings = await getSettings()
  const hotline = settings?.hotline ?? ''

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const contactLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Liên hệ Viễn Thông Nga Sơn',
  }

  return (
    <div className="vt-container">
      <JsonLd data={[faqLd, contactLd]} />
      <article className="vt-page" style={{ margin: '26px 0' }}>
        <h1>Hỗ trợ — Liên hệ</h1>
        <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn. Liên hệ theo thông tin dưới đây hoặc để lại tin nhắn.</p>
        <table>
          <tbody>
            <tr><th>Hotline</th><td><a href={`tel:${hotline.replace(/[^0-9]/g, '')}`}>{hotline}</a></td></tr>
            <tr><th>Zalo</th><td><a href={settings?.zalo || '#'} target="_blank" rel="noopener noreferrer">{settings?.zalo}</a></td></tr>
            <tr><th>Email</th><td>{settings?.email}</td></tr>
            <tr><th>Địa chỉ</th><td>{settings?.address}</td></tr>
            <tr><th>Giờ làm việc</th><td>7h30 – 20h00, tất cả các ngày trong tuần</td></tr>
          </tbody>
        </table>

        <h2>Hỗ trợ kỹ thuật</h2>
        <ol>
          <li>Gọi hotline <strong>{hotline}</strong> và mô tả hiện tượng.</li>
          <li>Cung cấp tên khách hàng + địa chỉ đã lắp để tra cứu nhanh.</li>
          <li>Kỹ thuật viên sẽ hướng dẫn xử lý từ xa hoặc hẹn đến nhà <strong>trong vòng 24 giờ</strong>.</li>
        </ol>

        <h3>Các sự cố thường gặp</h3>
        <ul>
          <li><strong>Mất kết nối Internet:</strong> kiểm tra đèn tín hiệu trên modem, khởi động lại modem (tắt 30 giây rồi bật). Nếu không được, gọi hotline.</li>
          <li><strong>Camera không xem được từ xa:</strong> kiểm tra wifi cho camera, đăng nhập lại ứng dụng.</li>
          <li><strong>TV Box lỗi hình ảnh:</strong> kiểm tra cáp HDMI, khởi động lại thiết bị.</li>
        </ul>

        <h2>Câu hỏi thường gặp</h2>
        {FAQS.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </article>
    </div>
  )
}
