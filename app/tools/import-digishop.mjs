/**
 * import-digishop.mjs
 * Import sản phẩm đã crawl từ digishop.vnpt.vn vào website (Payload CMS)
 * qua REST API của Payload.
 *
 * Chạy:
 *   node tools/import-digishop.mjs \
 *     --data /path/to/digishop-products.json \
 *     --api http://localhost:3005 \
 *     --email admin@vienthongngason.com \
 *     --password <pass> \
 *     [--dry] [--delay 120]
 *
 * Nguyên tắc:
 *   - Cập nhật giá/mô tả cho sản phẩm ĐÃ CÓ trên web (khớp tên/mã gói).
 *   - Tạo mới sản phẩm chưa có + danh mục mới nếu cần.
 *   - Idempotent: chạy lại nhiều lần an toàn.
 */

import fs from 'fs'

// ---------- CLI ----------
function argVal(name, def) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def
}
const DATA_PATH = argVal('--data', './data/digishop-products.json')
const API = (argVal('--api', 'http://localhost:3005') || '').replace(/\/$/, '')
const EMAIL = argVal('--email', '')
const PASSWORD = argVal('--password', '')
const DELAY = Number(argVal('--delay', '120'))
const DRY = process.argv.includes('--dry')

if (!EMAIL || !PASSWORD) {
  console.error('Thiếu --email / --password (tài khoản admin Payload)')
  process.exit(1)
}

// ---------- HTTP helper ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, opts = {}) {
  const { headers = {}, ...rest } = opts
  const res = await fetch(API + path, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch { /* ignore */ }
  return { status: res.status, data }
}

// ---------- Tiện ích ----------
function norm(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function slugify(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

/** Lexical JSON tối thiểu cho field richText của Payload. */
function toLexical(text = '') {
  return {
    root: {
      type: 'root',
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children: [
        {
          type: 'paragraph',
          version: 1,
          format: '',
          indent: 0,
          direction: null,
          textFormat: 0,
          children: [
            {
              type: 'text',
              version: 1,
              text,
              format: 0,
              style: '',
              detail: 0,
              mode: 'normal',
            },
          ],
        },
      ],
    },
  }
}

// ---------- Map danh mục digishop -> slug danh mục web ----------
function catSlugOf(p) {
  const mc = norm(p.danh_muc || '')
  const nhom = norm(p.nhom_san_pham || '')

  if (/roaming|quoc te|chuyen vung/.test(mc)) return 'chuyen-vung-quoc-te'
  if (/kaspersky/.test(mc)) return 'kaspersky'
  if (/vnpt camera|thue camera|mua camera/.test(mc)) return 'vnpt-camera'
  if (/vnpt wifi mesh|wifi mesh/.test(mc)) return 'vnpt-wifi-mesh'
  if (/familysafe/.test(mc)) return 'familysafe'
  if (/mytv|truyen hinh mytv/.test(mc)) return 'truyen-hinh-mytv'
  if (/internet.*camera/.test(mc)) return 'internet-camera'
  if (/internet.*di dong/.test(mc)) return 'internet-di-dong'
  if (/internet.*truyen hinh/.test(mc)) return 'internet-truyen-hinh-combo'
  if (/internet.?wifi/.test(mc)) return 'internet-wifi-mesh'
  if (/di dong/.test(mc)) {
    if (nhom.includes('data')) return 'goi-cuoc-4g'
    if (nhom.includes('thoai')) return 'goi-cuoc-thoai'
    if (nhom.includes('combo')) return 'combo-thoai-data'
    return 'di-dong'
  }
  return 'di-dong'
}

/** Tên gói digishop (đã normalize) -> slug sản phẩm đã có trên web. */
const NAME_TO_SLUG = {
  home1: 'home-internet-1-fiber-300mbps',
  home2: 'home-internet-2-fiber-500mbps',
  home3: 'home-internet-3-fiber-1gbps',
  home1mesh: 'home-internet-1-mesh-300mbps',
  home2mesh: 'home-internet-2-mesh-500mbps',
  home3mesh: 'home-internet-3-mesh-1gbps',
  home12mesh: 'home-internet-1-2-mesh-300mbps',
  home22mesh: 'home-internet-2-2-mesh-500mbps',
  home32mesh: 'home-internet-3-2-mesh-1gbps',
  hometv1: 'hometv-1-mytv-nang-cao-300mbps',
  hometv2: 'hometv-2-mytv-nang-cao-500mbps',
  hometv3: 'hometv-3-mytv-nang-cao-1gbps',
  hometvvip1: 'mytv-vip-hometv-vip1-300mbps',
  hometv1mesh: 'hometv-1-mesh-300mbps',
  hometv2mesh: 'hometv-2-mesh-500mbps',
  hometv3mesh: 'hometv-3-mesh-1gbps',
  hometv22mesh: 'hometv-2-2-mesh-500mbps',
  hometv32mesh: 'hometv-3-2-mesh-1gbps',
  hometvvip1mesh: 'hometv-vip1-mesh-300mbps',
  homecam1: 'home-cam-1-internet-300m-camera-cloud',
  homecam2: 'home-cam-2-internet-500m-camera-mesh',
  homecam3: 'home-cam-3-internet-1g-camera-cloud',
  homecam1mesh: 'home-cam-1-mesh-300m-camera-cloud',
  homecam2mesh: 'home-cam-2-mesh-500m-camera-mesh',
  homecam3mesh: 'home-cam-3-mesh-1g-camera-cloud',
  homecam22mesh: 'home-cam-2-2-mesh-500m-camera-mesh',
  homecam32mesh: 'home-cam-3-2-mesh-1g-camera-cloud',
  homedinh: 'home-dinh-combo-internet-1g-mytv',
  homesanh2: 'home-sanh-2-combo-internet-di-dong',
  homesanh4: 'home-sanh-4-combo-500mbps',
  cine: 'goi-cine-truyen-hinh',
  vtvcab: 'goi-vtvcab',
  vip: 'goi-vip-truyen-hinh',
  vipmax: 'goi-vip-max',
  viplite: 'goi-vip-lite',
  tatquangcao: 'goi-tat-quang-cao',
  sport: 'goi-sport',
  sportlite: 'goi-sport-lite',
  sctv: 'goi-sctv',
  motphim: 'goi-mot-phim',
  cpv10: 'goi-cpv10-5gb-24h',
  cpv125: 'goi-cpv125-7gb-ngay',
  ctg5: 'goi-ctg5-150mb-24h',
  ctg25: 'goi-ctg25-300mb-7-ngay',
  ctg90: 'goi-ctg90-2gb-30-ngay',
  dch90: 'goi-dch90-8gb-30-ngay',
}

/** Danh mục mới cần tạo nếu chưa có. */
const NEW_CATS = [
  { name: 'Chuyển vùng quốc tế', slug: 'chuyen-vung-quoc-te', parent: 'di-dong' },
  { name: 'Dịch vụ số', slug: 'dich-vu-so', parent: null },
  { name: 'Kaspersky (Bảo mật)', slug: 'kaspersky', parent: 'dich-vu-so' },
  { name: 'VNPT Camera', slug: 'vnpt-camera', parent: 'dich-vu-so' },
  { name: 'VNPT Wifi Mesh', slug: 'vnpt-wifi-mesh', parent: 'dich-vu-so' },
  { name: 'VNPT Family Safe', slug: 'familysafe', parent: 'dich-vu-so' },
]

// ---------- Main ----------
async function main() {
  console.log(`== Import digishop → ${API} (dry=${DRY})`)

  // 1. Đăng nhập
  const login = await api('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const token = login.data && login.data.token

  if (!token) {
    console.error('Đăng nhập thất bại:', JSON.stringify(login.data).slice(0, 200))
    process.exit(1)
  }
  const auth = { Authorization: `JWT ${token}` }
  console.log('✔ Đăng nhập thành công')

  // 2. Danh mục hiện có
  const catsRes = await api('/api/categories?limit=100&depth=0', { headers: auth })
  const cats = (catsRes.data && catsRes.data.docs) || []
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]))

  // 3. Tạo danh mục thiếu
  for (const nc of NEW_CATS) {
    if (catBySlug.has(nc.slug)) continue
    const data = { name: nc.name, slug: nc.slug, order: 90 }
    if (nc.parent && catBySlug.has(nc.parent)) data.parent = catBySlug.get(nc.parent)
    if (DRY) { catBySlug.set(nc.slug, 0); continue }
    const r = await api('/api/categories', { method: 'POST', headers: auth, body: JSON.stringify(data) })
    if (r.status < 300 && r.data && r.data.doc) {
      catBySlug.set(r.data.doc.slug, r.data.doc.id)
      console.log(`  + danh mục: ${nc.slug} → #${r.data.doc.id}`)
    } else {
      console.warn(`  ! tạo danh mục ${nc.slug} lỗi: HTTP ${r.status}`, JSON.stringify(r.data).slice(0, 150))
    }
    await sleep(DELAY)
  }

  // 4. Sản phẩm hiện có
  const prodRes = await api('/api/products?limit=1000&depth=0', { headers: auth })
  const existing = (prodRes.data && prodRes.data.docs) || []
  const bySlug = new Map(existing.map((d) => [d.slug, d]))
  const byNormTitle = new Map(existing.map((d) => [norm(d.title), d]))

  // 5. Đọc dữ liệu crawl
  const crawl = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  console.log(`✔ Tải ${crawl.length} sản phẩm từ ${DATA_PATH}`)

  let updated = 0
  let created = 0
  let skipped = 0
  const usedSlugs = new Set(bySlug.keys())

  for (const p of crawl) {
    const nameNorm = norm(p.ten_goi || p.ma_goi)
    const matchedSlug = NAME_TO_SLUG[nameNorm]
        const cycleNorm = norm((p.chu_ky || '').replace('giờ', 'h').replace('ngày', 'd').replace('tuần', 'w').replace('tháng', 'm').replace('tuần', 'w'))
    const cycleMap = { '24h': 'daily', '7d': 'weekly', '3d': 'weekly', '1d': 'daily', '15d': 'monthly', '5d': 'weekly', '12h': 'daily', '90d': '3m', '1m': '1m', '10d': 'monthly', '1w': 'weekly' }
    const cycleVal = cycleMap[cycleNorm] || (p.chu_ky && ['1 tháng', '30 ngày'].some(c => p.chu_ky.includes(c)) ? 'monthly' : 'other')
    const data = {
      title: p.ten_goi || p.ma_goi,
      price: p.gia ?? 0,
      oldPrice: p.gia_goc != null && p.gia_goc > (p.gia ?? 0) ? p.gia_goc : null,
      unit: '/tháng',
      billingCycle: cycleVal,
      shortDescription: (p.mo_ta_ngan || '').slice(0, 600),
      description: toLexical((p.mo_ta_ngan || 'Liên hệ hotline để được tư vấn.').slice(0, 2000)),
      inStock: true,
      order: 50,
    }
    const catSlug = catSlugOf(p)

    // a) Khớp sản phẩm đã có trên web
    let target = matchedSlug && bySlug.get(matchedSlug)
    if (!target) target = byNormTitle.get(nameNorm)

    if (target) {
      const body = { ...data }
      const catId = catBySlug.get(catSlug)
      if (catId) body.category = catId
      if (DRY) { console.log(`  [dry] update #${target.id} ${data.title} → ${data.price}đ`); updated++; continue }
      const r = await api(`/api/products/${target.id}?depth=0`, { method: 'PATCH', headers: auth, body: JSON.stringify(body) })
      if (r.status < 300) {
        console.log(`  ↑ #${target.id} ${data.title} → ${data.price}đ`)
        updated++
      } else {
        console.warn(`  ! update #${target.id} lỗi: HTTP ${r.status}`, JSON.stringify(r.data).slice(0, 150))
      }
      await sleep(DELAY)
      continue
    }

    // b) Tạo mới
    const catId = catBySlug.get(catSlug)
    if (!catId) { skipped++; console.warn(`  ! bỏ qua ${data.title} (chưa có danh mục ${catSlug})`); continue }

    let slug = 'goi-' + slugify(p.ma_goi || p.ten_goi)
    let n = 2
    while (usedSlugs.has(slug)) slug = 'goi-' + slugify(p.ma_goi || p.ten_goi) + '-' + n++

    if (DRY) { console.log(`  [dry] tạo mới ${slug}`); usedSlugs.add(slug); created++; continue }
    const r = await api('/api/products', { method: 'POST', headers: auth, body: JSON.stringify({ ...data, slug, category: catId }) })
    if (r.status < 300 && r.data && r.data.doc) {
      usedSlugs.add(r.data.doc.slug)
      console.log(`  + mới #${r.data.doc.id} ${data.title} → ${data.price}đ (${catSlug})`)
      created++
    } else {
      console.warn(`  ! tạo ${slug} lỗi: HTTP ${r.status}`, JSON.stringify(r.data).slice(0, 150))
    }
    await sleep(DELAY)
  }

  console.log(`\n== KẾT QUẢ ==`)
  console.log(`Cập nhật: ${updated} | Tạo mới: ${created} | Bỏ qua: ${skipped}`)
  if (DRY) console.log('(dry run — không ghi gì vào DB)')
}

main().catch((e) => { console.error('LỖI:', e); process.exit(1) })