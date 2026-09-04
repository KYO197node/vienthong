import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import config from '../payload.config'
import { getPayload } from 'payload'
import { htmlToLexical } from './mklexical'

const COLORS: Record<string, [number, number, number]> = {
  internet: [30, 110, 235],
  sim: [13, 90, 200],
  camera: [10, 70, 160],
  tvbox: [25, 130, 210],
}

function svgPlaceholder(key: string): string {
  const [r, g, b] = COLORS[key] ?? [21, 101, 192]
  return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="rgb(${r},${g},${b})"/>
    <rect x="200" y="150" width="400" height="270" rx="16" fill="#ffffff"/>
    <circle cx="400" cy="285" r="65" fill="rgb(${r},${g},${b})"/>
    <circle cx="400" cy="285" r="35" fill="#ffd200"/>
    <rect x="250" y="470" width="300" height="30" rx="8" fill="#ffd200"/>
  </svg>`
}

// Cache trong 1 lan chay, tranh goi DB nhieu lan cho cung 1 key.
const placeholderCache: Record<string, number> = {}

async function uploadPlaceholder(payload: any, key: string, alt: string) {
  if (placeholderCache[key]) return placeholderCache[key]

  // Payload tu doi ten file khi trung (ph-internet.png -> ph-internet-1.png ...),
  // nen phai tim theo prefix `ph-<key>` chu khong so sanh bang ten chinh xac.
  // Neu so sanh bang, guard nay never match va moi lan seed lai tao them ban ghi moi.
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { like: `ph-${key}` } },
    sort: 'id',
    limit: 1,
  })
  if (existing.docs[0]) {
    placeholderCache[key] = existing.docs[0].id
    return existing.docs[0].id
  }

  const buf = await sharp(Buffer.from(svgPlaceholder(key))).png().toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data: buf, mimetype: 'image/png', name: `ph-${key}.png`, size: buf.length },
  })
  placeholderCache[key] = media.id
  return media.id
}

function mdToHtml(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inUl = false
  let inOl = false
  let inTable = false
  let firstH1 = false
  const closeLists = () => {
    if (inUl) { html += '</ul>\n'; inUl = false }
    if (inOl) { html += '</ol>\n'; inOl = false }
  }
  const closeTable = () => {
    if (inTable) { html += '</tbody></table>\n'; inTable = false }
  }
  const inline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') { closeLists(); closeTable(); continue }
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      closeLists(); closeTable()
      const level = h[1].length
      if (level === 1 && !firstH1) { firstH1 = true; continue }
      html += `<h${Math.min(level + 1, 6)}>${inline(h[2])}</h${Math.min(level + 1, 6)}>\n`
      continue
    }
    if (line === '---') { closeLists(); closeTable(); html += '<hr>\n'; continue }
    if (line.startsWith('|')) {
      closeLists()
      const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const isSep = cells.every((c) => c === '' || /^:?-+:?$/.test(c))
      if (isSep) continue
      if (!inTable) {
        html += '<table><thead><tr><th>' + inline(cells.join('</th><th>')) + '</th></tr></thead><tbody>\n'
        inTable = true
      } else {
        html += '<tr><td>' + inline(cells.join('</td><td>')) + '</td></tr>\n'
      }
      continue
    }
    const ul = line.match(/^[-*]\s+(.*)/)
    if (ul) { closeTable(); if (inOl) { html += '</ol>\n'; inOl = false } if (!inUl) { html += '<ul>\n'; inUl = true } html += '<li>' + inline(ul[1]) + '</li>\n'; continue }
    const ol = line.match(/^\d+\.\s+(.*)/)
    if (ol) { closeTable(); if (inUl) { html += '</ul>\n'; inUl = false } if (!inOl) { html += '<ol>\n'; inOl = true } html += '<li>' + inline(ol[1]) + '</li>\n'; continue }
    closeLists(); closeTable()
    html += '<p>' + inline(line) + '</p>\n'
  }
   closeLists(); closeTable()
   return html
 }

// Converter dung chung: tao node Lexical thuan tu HTML don gian.
// richTextFromHtml cu nhét cả chuỗi HTML vào 1 text node → web hiển thị
// nguyên văn thẻ bị escape. htmlToLexical parse theo tung dong, nen chen
// \n vao giua cac the khi input chua co.
const richTextFromHtml = (html: string): any =>
  htmlToLexical(html.includes('\n') ? html : html.replace(/(<\/(?:p|h[1-4]|li|ul|ol)>)/g, '$1\n'))

const CATEGORIES = [
  { name: 'Mạng Internet', slug: 'internet-cap-quang', key: 'internet', order: 1, description: 'Internet cáp quang FTTH tốc độ cao, wifi mesh phủ sóng toàn nhà, lắp đặt trọn gói tại Nga Sơn, Thanh Hóa.' },
  { name: 'SIM & Gói cước', slug: 'sim-goi-cuoc', key: 'sim', order: 2, description: 'Sim số đẹp, gói 4G/5G dung lượng lớn, combo thoại + data giá tốt.' },
  { name: 'Camera An Ninh', slug: 'camera-an-ninh', key: 'camera', order: 3, description: 'Camera IP wifi & có dây chính hãng, xem từ xa trên điện thoại, lắp đặt tận nhà, bảo hành 12–24 tháng.' },
  { name: 'TV Box', slug: 'tv-box', key: 'tvbox', order: 4, description: 'Android TV Box chính hãng, hàng trăm kênh trong nước và quốc tế.' },
]

const PRODUCTS: Array<[string, string, string, number, string, string]> = [
  ['Home Internet 1 — Fiber 300Mbps', 'home-internet-1-fiber-300mbps', 'internet-cap-quang', 180000, 'internet', 'Tốc độ 300Mbps, giá 180.000đ/tháng (có VAT). Gói 3 tháng 540K, 6 tháng 1.080K, 12/13 tháng 2.160K. Lắp đặt trọn gói tại Nga Sơn.'],
  ['Home Internet 2 — Fiber 500Mbps', 'home-internet-2-fiber-500mbps', 'internet-cap-quang', 240000, 'internet', 'Tốc độ 500Mbps, giá 240.000đ/tháng. Gói 6 tháng 1.440K, 12/13 tháng 2.880K — tiết kiệm hơn khi trả dài hạn.'],
  ['Home Internet 1 Mesh — 300Mbps + Wifi Mesh', 'home-internet-1-mesh-300mbps', 'internet-cap-quang', 210000, 'internet', 'Fiber 300Mbps kèm 01 thiết bị Mesh phủ sóng toàn nhà. Giá 210.000đ/tháng, gói 12/13 tháng 2.520K.'],
  ['Home Internet 2 Mesh — 500Mbps + Wifi Mesh', 'home-internet-2-mesh-500mbps', 'internet-cap-quang', 270000, 'internet', 'Fiber 500Mbps kèm 01 Mesh. Giá 270.000đ/tháng, gói 12/13 tháng 3.240K.'],
  ['HomeTV 1 — MyTV Nâng cao (300Mbps)', 'hometv-1-mytv-nang-cao-300mbps', 'tv-box', 200000, 'tvbox', 'Internet 300Mbps + Truyền hình MyTV App. Giá 200.000đ/tháng, gói 12/13 tháng 2.400K.'],
  ['HomeTV 2 — MyTV Nâng cao (500Mbps)', 'hometv-2-mytv-nang-cao-500mbps', 'tv-box', 260000, 'tvbox', 'Internet 500Mbps + MyTV App. Giá 260.000đ/tháng, bản Mesh 290K/tháng.'],
  ['MyTV VIP — HomeTV VIP1 (300Mbps)', 'mytv-vip-hometv-vip1-300mbps', 'tv-box', 230000, 'tvbox', 'Internet 300Mbps + Truyền hình MyTV VIP App. Giá 230.000đ/tháng, gói 12/13 tháng 2.760K.'],
  ['Home Cam 1 — Internet 300M + Camera Cloud', 'home-cam-1-internet-300m-camera-cloud', 'camera-an-ninh', 250000, 'camera', 'Fiber 300Mbps + 01 Camera Indoor + Cloud 7 ngày. Giá 250.000đ/tháng, gói 12/13 tháng 3.000K.'],
  ['Home Cam 2 — Internet 500M + Camera + Mesh', 'home-cam-2-internet-500m-camera-mesh', 'camera-an-ninh', 310000, 'camera', 'Fiber 500Mbps + Mesh 6 + Camera + Cloud. Giá 310.000đ/tháng, gói 12/13 tháng 3.720K.'],
  ['Home Sành 2 — Combo Internet + Di động', 'home-sanh-2-combo-internet-di-dong', 'sim-goi-cuoc', 249000, 'sim', 'Fiber 300Mbps + data di động chủ nhóm 3GB/ngày + 1.500 phút nội mạng. Tối đa 6 thành viên. Giá 249.000đ/tháng.'],
  ['Home Sành 4 — Combo 500Mbps', 'home-sanh-4-combo-500mbps', 'sim-goi-cuoc', 359000, 'sim', 'Fiber 500Mbps + 01 Mesh + data 3GB/ngày + 1.500 phút nội mạng cho chủ nhóm. Giá 359.000đ/tháng.'],
  ['Gói VD150 — 150K: Thoại + 2GB/ngày', 'goi-vd150-thoai-data', 'sim-goi-cuoc', 150000, 'sim', '80 phút thoại nội mạng + 2GB/ngày. Chu kỳ 1 tháng 150K, 3 tháng 450K, 6 tháng 900K, 12 tháng 1.800K.'],
  ['Gói D169G — 169K: 2000p gọi + 7GB/ngày', 'goi-d169g-2000p-goi-7gb-ngay', 'sim-goi-cuoc', 169000, 'sim', '2.000 phút gọi nội mạng + 150 phút ngoại mạng + 7GB/ngày. Giá 169.000đ/chu kỳ.'],
  ['Gói YOLO90 — 90K: 1,5GB/ngày', 'goi-yolo90-15gb-ngay', 'sim-goi-cuoc', 90000, 'sim', 'Data 1,5GB/ngày, giá chỉ 90.000đ/chu kỳ. Gói 3 tháng 270K, 6 tháng 540K, 12 tháng 1.080K.'],
  ['Gói VIP249 — 10GB/ngày chia sẻ', 'goi-vip249-10gb-ngay-chia-se', 'sim-goi-cuoc', 249000, 'sim', '10GB/ngày (hết dung lượng dừng tốc độ), quyền chia sẻ data dùng chung cho nhóm thành viên. Giá 249.000đ/chu kỳ.'],
]

const POLICY_FILES: Array<[string, string, string]> = [
  ['Điều khoản chung', 'dieu-khoan-chung', '05-dieu-khoan-chung.md'],
  ['Chính sách bảo vệ thông tin khách hàng', 'chinh-sach-bao-ve-thong-tin-khach-hang', '06-chinh-sach-bao-ve-thong-tin-khach-hang.md'],
  ['Chính sách thanh toán', 'chinh-sach-thanh-toan', '07-chinh-sach-thanh-toan.md'],
  ['Chính sách bảo hành và đổi trả', 'chinh-sach-bao-hanh-doi-tra', '08-chinh-sach-bao-hanh-doi-tra.md'],
  ['Quy trình lắp đặt và giải quyết khiếu nại', 'quy-trinh-lap-dat-va-khieu-nai', '09-quy-trinh-lap-dat-khieu-nai.md'],
]

export default async function seed() {
  const payload = await getPayload({ config })

  console.log('== Admin user ==')
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@vienthongngason.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const existingUsers = await payload.find({ collection: 'users', limit: 1 })
  if (!existingUsers.docs[0]) {
    if (!adminPassword) {
      throw new Error(
        'Thieu SEED_ADMIN_PASSWORD. Dat bien moi truong nay truoc khi seed, vi du:\n' +
          "  SEED_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)",
      )
    }
    await payload.create({ collection: 'users', data: { email: adminEmail, password: adminPassword, name: 'Quản trị' }, overrideAccess: true })
    console.log(`  + admin: ${adminEmail} (mat khau lay tu SEED_ADMIN_PASSWORD)`)
  } else {
    console.log('  ~ admin da ton tai')
  }

  console.log('== Settings ==')
  const settings = await payload.findGlobal({ slug: 'settings' })
  if (!settings?.id) {
    await payload.updateGlobal({ slug: 'settings', data: {} })
  }

  console.log('== Danh muc ==')
  const catIds: Record<string, number> = {}
  for (const c of CATEGORIES) {
    const existing = await payload.find({ collection: 'categories', where: { slug: { equals: c.slug } }, limit: 1 })
    if (existing.docs[0]) {
      catIds[c.slug] = existing.docs[0].id
      continue
    }
    const mediaId = await uploadPlaceholder(payload, c.key, c.name)
    const doc = await payload.create({
      collection: 'categories',
      data: { name: c.name, slug: c.slug, description: c.description, order: c.order, image: mediaId },
      overrideAccess: true,
    })
    catIds[c.slug] = doc.id
    console.log(`  + ${c.name} (#${doc.id})`)
  }

  console.log('== San pham ==')
  for (const [title, slug, catSlug, price, key, shortDescription] of PRODUCTS) {
    const existing = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1 })
    if (existing.docs[0]) continue
    const mediaId = await uploadPlaceholder(payload, key, title)
    await payload.create({
      collection: 'products',
      data: {
        title,
        slug,
        category: catIds[catSlug],
        price,
        unit: '/tháng',
        shortDescription,
        description: richTextFromHtml(`<p>${shortDescription}</p><p>Liên hệ hotline để được tư vấn chi tiết và nhận báo giá tốt nhất. Lắp đặt trọn gói tại Nga Sơn và các khu vực lân cận.</p>`),
        image: mediaId,
        inStock: true,
        featured: false,
        order: 0,
      },
      overrideAccess: true,
    })
    console.log(`  + ${title}`)
  }

  console.log('== Tin tuc ==')
  const news: Array<[string, string, string]> = [
    ['Khuyến mãi tháng 8: Miễn phí công lắp đặt camera', 'khuyen-mai-thang-8-camera', 'Nhân dịp khai trương khu vực phục vụ mới, Viễn Thông Nga Sơn tặng miễn phí công lắp đặt cho 20 khách hàng đăng ký trọn gói camera trong tháng 8. Số lượng có hạn, liên hệ hotline để giữ chỗ.'],
    ['Hướng dẫn chọn gói Internet phù hợp với gia đình bạn', 'huong-dan-chon-goi-internet', 'Gia đình 3-5 người chỉ xem phim, học online: gói 30Mbps là đủ. Có game thủ hoặc livestream: chọn 50Mbps trở lên. Muốn tiết kiệm tối đa: combo Internet + TV Box. Gọi hotline để được khảo sát và tư vấn miễn phí.'],
  ]
  for (const [title, slug, content] of news) {
    const existing = await payload.find({ collection: 'posts', where: { slug: { equals: slug } }, limit: 1 })
    if (existing.docs[0]) continue
    const mediaId = await uploadPlaceholder(payload, 'internet', title)
    await payload.create({
      collection: 'posts',
      data: {
        title,
        slug,
        excerpt: content.slice(0, 150),
        content: richTextFromHtml(`<p>${content}</p>`),
        image: mediaId,
        publishedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    console.log(`  + ${title}`)
  }

  console.log('== Trang noi dung (tu content/*.md) ==')
  // docker-compose mount ../content -> /app/content (ro). Local dev van dung
  // ../content tu thu muc repo. Uu tien /app/content vi do la duong dan mount.
  const fsContent = '/app/content'
  const contentDir = fs.existsSync(fsContent) ? fsContent : path.resolve(process.cwd(), '../content')
  const pages: Array<[string, string, string | null]> = [
    ['Giới thiệu', 'gioi-thieu', '02-gioi-thieu.md'],
    ['Đăng ký lắp đặt', 'dang-ky', '03-dang-ky-lap-dat.md'],
    ['Hỗ trợ', 'ho-tro', '04-ho-tro-lien-he.md'],
    ...POLICY_FILES.map((p) => [p[0], p[1], p[2]] as [string, string, string]),
  ]
  for (const [title, slug, file] of pages) {
    const existing = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1 })
    if (existing.docs[0]) continue
    let html = ''
    const filePath = path.join(contentDir, file ?? '')
    if (file && fs.existsSync(filePath)) {
      html = mdToHtml(fs.readFileSync(filePath, 'utf-8'))
    } else {
      html = `<p>Nội dung trang <strong>${title}</strong> đang được cập nhật.</p>`
    }
    await payload.create({
      collection: 'pages',
      data: { title, slug, excerpt: title, content: richTextFromHtml(html) },
      overrideAccess: true,
    })
    console.log(`  + ${title} (${slug})`)
  }

  console.log('== SEED HOAN TAT ==')
  process.exit(0)
}

void seed()
