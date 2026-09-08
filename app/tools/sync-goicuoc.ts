// @ts-nocheck
// Dong bo du lieu tu data/goicuoc-vnpt-thanhhoa.json (lay tu https://goicuoc-vnpt.netlify.app/)
// vao collection products: cap nhat gia + mo ta chi tiet (bang gia chu ky, thong so),
// tao cac goi con thieu. Chay: npx tsx tools/sync-goicuoc.ts [--dry]
import { getPayload } from 'payload'
import config from '../payload.config'
import fs from 'fs'
import path from 'path'
import { htmlToLexical } from '../src/mklexical'

const DATA = process.env.DATA_PATH || '../data/goicuoc-vnpt-full.json'
const DRY = process.argv.includes('--dry')

const fmt = (v: number) => v.toLocaleString('vi-VN') + 'đ'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

// Chuan hoa ten de khop source (goicuoc-vnpt) voi title trong DB
function normTitle(s: string) {
  return s
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace('(1 MESH)', '(MESH)')
    .replace(/^HOMETV(\d)/, 'HOMETV $1')
    .replace(/^HOME(\d)/, 'HOME $1')
}

function cycleLines(g: Record<string, number>) {
  return Object.entries(g).map(([k, v]) => `<li>${k}: ${fmt(v)}</li>`)
}

function specLines(tp: Record<string, string>) {
  return Object.entries(tp).map(([k, v]) => `<li>${k}: ${v}</li>`)
}

// Mo ta ngan cho card: md + thong so chinh + gia 1 thang
function buildShort(g: any, price1: number) {
  const specs = Object.entries(g.tp || {})
    .slice(0, 2)
    .map(([k, v]) => `${v}`)
    .join(', ')
  const base = `${g.md || ''}${specs ? '. ' + specs : ''}. Giá ${fmt(price1)}/tháng (đã VAT).`
  return base.slice(0, 600)
}

function buildHomeHtml(g: any) {
  const lines: string[] = []
  if (g.nh) lines.push(`<p><strong>${g.nh}</strong></p>`)
  if (g.md) lines.push(`<p>${g.md}</p>`)
  const specs = specLines(g.tp || {})
  if (specs.length) {
    lines.push('<h3>Thông số kỹ thuật</h3>')
    lines.push('<ul>')
    lines.push(...specs)
    lines.push('</ul>')
  }
  const cycles = cycleLines(g.g || {})
  if (cycles.length) {
    lines.push('<h3>Bảng giá theo chu kỳ (đã bao gồm VAT)</h3>')
    lines.push('<ul>')
    lines.push(...cycles)
    lines.push('</ul>')
  }
  lines.push('<p>Giá đã bao gồm VAT. Mọi gói Home đã gồm Modem WiFi và dịch vụ bảo mật GreenNet.</p>')
  return lines.join('\n')
}

async function main() {
  const payload = await getPayload({ config })
  const raw = JSON.parse(fs.readFileSync(path.resolve(DATA), 'utf-8'))
  // Ho tro 2 dang file: full {DATA, DD, TTN} va flat cu (goi/mytv/...)
  const data = raw.DATA || raw
  const ddGoi: any[] = raw.DD?.goi || []
  const ddLe: any[] = raw.DD?.le || []
  const ttn: any[] = raw.TTN || []
  console.log(`Loaded goi=${data.goi.length} mytv=${data.mytv.length} campack=${data.campack.length} addon=${data.addon.length} camthe=${data.camthe.length} ddGoi=${ddGoi.length} ddLe=${ddLe.length} ttn=${ttn.length}, DRY=${DRY}`)

  const cats = await payload.find({ collection: 'categories', limit: 100, depth: 0 })
  const catBySlug: Record<string, number> = {}
  for (const c of cats.docs) catBySlug[c.slug] = c.id

  const all = await payload.find({ collection: 'products', limit: 2000, depth: 0 })
  const byNorm: Record<string, any[]> = {}
  for (const p of all.docs) {
    const k = normTitle(p.title)
    ;(byNorm[k] = byNorm[k] || []).push(p)
  }

  let updated = 0
  let created = 0

  async function upsert(matchKeys: string[], fields: any) {
    let targets: any[] = []
    for (const k of matchKeys) {
      if (byNorm[k]) targets.push(...byNorm[k])
    }
    targets = [...new Map(targets.map((t) => [t.id, t])).values()]
    if (targets.length === 0) {
      if (DRY) {
        console.log(`[dry] CREATE ${fields.title} slug=${fields.slug}`)
        created++
        return
      }
      const doc = await payload.create({ collection: 'products', data: fields, overrideAccess: true })
      created++
      console.log(`+ ${fields.title} (${fields.slug}) id=${doc.id}`)
      return
    }
    for (const t of targets) {
      const data = { ...fields, slug: t.slug, category: t.category, featured: t.featured, order: t.order }
      if (DRY) {
        console.log(`[dry] UPDATE ${t.title} (${t.slug})`)
      } else {
        await payload.update({ collection: 'products', id: t.id, data, overrideAccess: true })
        console.log(`~ ${t.title} (${t.slug})`)
      }
      updated++
    }
  }

  function homeCat(title: string) {
    const t = title.toUpperCase()
    if (t.includes('HOMETV') || (t.includes('TV') && !t.includes('CAM'))) return 'home-tv'
    if (t.includes('CAM')) return 'home-cam'
    if (t.includes('SÀNH') || t.includes('SANH') || t.includes('ĐỈNH')) return 'home-sanh'
    if (t.includes('MESH')) return 'home-mesh'
    return 'home-internet'
  }

  // 1. 35 goi Home (tru 5 goi tao moi rieng ben duoi)
  const NEW_SRC = ['Home1_M', 'HomeTV_B', 'Home Cam Canh', 'Home Cam Mật', 'Home Cam Sành']
  for (const g of data.goi) {
    if (NEW_SRC.includes(g.n)) continue
    const price1 = g.g['1 tháng']
    const html = buildHomeHtml(g)
    await upsert([normTitle(g.n)], {
      title: g.n,
      slug: slugify(`goi-${g.n}`),
      category: catBySlug[homeCat(g.n)],
      price: price1,
      billingCycle: 'monthly',
      unit: '/tháng',
      shortDescription: buildShort(g, price1),
      description: htmlToLexical(html),
      inStock: true,
    })
  }

  // 2. 5 goi moi (3 tan cong + 2 canh tranh)
  const NEW_PRODUCTS = [
    { src: 'Home1_M', title: 'Home Tấn Công (Mesh) — 195K', slug: 'goi-home-tan-cong-mesh-195k', cat: 'home-mesh', featured: true },
    { src: 'HomeTV_B', title: 'Home Tấn Công (MyTV) — 195K', slug: 'goi-home-tan-cong-mytv-195k', cat: 'home-tv', featured: true },
    { src: 'Home Cam Canh', title: 'Home Tấn Công (Camera) — 195K', slug: 'goi-home-tan-cong-camera-195k', cat: 'home-cam', featured: true },
    { src: 'Home Cam Mật', title: 'Home Cam Mật — 220K', slug: 'goi-home-cam-mat-220k', cat: 'home-cam', featured: false },
    { src: 'Home Cam Sành', title: 'Home Cam Sành — 235K', slug: 'goi-home-cam-sanh-235k', cat: 'home-cam', featured: false },
  ]
  for (const np of NEW_PRODUCTS) {
    const g = data.goi.find((x: any) => x.n === np.src)
    const price1 = g.g['1 tháng']
    const html = buildHomeHtml(g)
    const exists = await payload.find({ collection: 'products', where: { slug: { equals: np.slug } }, limit: 1 })
    if (exists.docs[0]) {
      if (DRY) console.log(`[dry] UPDATE(new) ${np.title}`)
      else {
        await payload.update({
          collection: 'products',
          id: exists.docs[0].id,
          data: { title: np.title, price: price1, shortDescription: buildShort(g, price1), description: htmlToLexical(html), inStock: true },
          overrideAccess: true,
        })
        console.log(`~ ${np.title}`)
      }
      updated++
      continue
    }
    if (DRY) {
      console.log(`[dry] CREATE ${np.title} slug=${np.slug}`)
      created++
      continue
    }
    const doc = await payload.create({
      collection: 'products',
      data: {
        title: np.title,
        slug: np.slug,
        category: catBySlug[np.cat],
        price: price1,
        billingCycle: 'monthly',
        unit: '/tháng',
        shortDescription: buildShort(g, price1),
        description: htmlToLexical(html),
        inStock: true,
        featured: np.featured,
        order: 0,
      },
      overrideAccess: true,
    })
    created++
    console.log(`+ ${np.title} id=${doc.id}`)
  }

  // 3. MyTV: cap nhat theo ten
  for (const m of data.mytv) {
    const price1 = m.gia['Hàng tháng']
    const cycles = Object.entries(m.gia)
      .map(([k, v]) => `<li>${k}: ${fmt(v as number)}</li>`)
      .join('\n')
    const html = `<p>${m.mota}</p>\n<h3>Bảng giá (đã bao gồm VAT)</h3>\n<ul>\n${cycles}\n</ul>`
    const mytvSlug = m.ten === 'MyTV Film+' ? 'goi-mytv-film-plus' : slugify(`goi-mytv-${m.ten}`)
    await upsert([normTitle(m.ten)], {
      title: m.ten,
      slug: mytvSlug,
      category: catBySlug['truyen-hinh-mytv'],
      price: price1,
      billingCycle: 'monthly',
      unit: '/tháng',
      shortDescription: `${m.mota} Giá ${fmt(price1)}/tháng.`.slice(0, 600),
      description: htmlToLexical(html),
      inStock: true,
    })
  }

  // 4. Campack: tao moi duoi internet-camera (goi thue camera + cloud theo thang)
  for (const c of data.campack) {
    const price1 = c.gia['Hàng tháng']
    const cycles = Object.entries(c.gia)
      .map(([k, v]) => `<li>${k}: ${fmt(v as number)}</li>`)
      .join('\n')
    const title = `${c.ten} — Camera + Cloud`
    const slug = slugify(`goi-${c.ten}-camera-cloud`)
    const html = `<p>${c.nd}</p>\n<h3>Bảng giá thuê (đã bao gồm VAT)</h3>\n<ul>\n${cycles}\n</ul>`
    const exists = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1 })
    if (exists.docs[0]) {
      if (DRY) console.log(`[dry] UPDATE(campack) ${title}`)
      else {
        await payload.update({
          collection: 'products',
          id: exists.docs[0].id,
          data: { title, price: price1, shortDescription: `${c.nd}. Giá ${fmt(price1)}/tháng.`.slice(0, 600), description: htmlToLexical(html), inStock: true },
          overrideAccess: true,
        })
        console.log(`~ ${title}`)
      }
      updated++
      continue
    }
    if (DRY) {
      console.log(`[dry] CREATE(campack) ${title} slug=${slug}`)
      created++
      continue
    }
    const doc = await payload.create({
      collection: 'products',
      data: {
        title,
        slug,
        category: catBySlug['internet-camera'],
        price: price1,
        billingCycle: 'monthly',
        unit: '/tháng',
        shortDescription: `${c.nd}. Giá ${fmt(price1)}/tháng.`.slice(0, 600),
        description: htmlToLexical(html),
        inStock: true,
        featured: false,
        order: 0,
      },
      overrideAccess: true,
    })
    created++
    console.log(`+ ${title} id=${doc.id}`)
  }

  // 5. Addon MyTV + the camera: tao moi
  const extraCreates = [
    ...data.addon.map((a: any) => ({
      title: `${a.ten} — MyTV`,
      slug: slugify(`goi-addon-${a.ten}-mytv`),
      cat: 'truyen-hinh-mytv',
      price: a.gia,
      short: `${a.mota} Giá ${fmt(a.gia)}/tháng.`,
      html: `<p>${a.mota}</p>\n<p>Giá ${fmt(a.gia)}/tháng (đã bao gồm VAT).</p>`,
    })),
    ...data.camthe.map((a: any) => ({
      title: `${a.ten} — Camera + thẻ nhớ`,
      slug: slugify(`goi-${a.ten}-camera-the-nho`),
      cat: 'internet-camera',
      price: a.gia,
      short: `${a.cam} + ${a.the}. Giá ${fmt(a.gia)}/tháng.`,
      html: `<ul>\n<li>${a.cam}</li>\n<li>${a.the}</li>\n</ul>\n<p>Giá ${fmt(a.gia)}/tháng (đã bao gồm VAT).</p>`,
    })),
  ]
  for (const e of extraCreates) {
    const exists = await payload.find({ collection: 'products', where: { slug: { equals: e.slug } }, limit: 1 })
    if (exists.docs[0]) {
      if (!DRY) {
        await payload.update({
          collection: 'products',
          id: exists.docs[0].id,
          data: { title: e.title, price: e.price, shortDescription: e.short.slice(0, 600), description: htmlToLexical(e.html), inStock: true },
          overrideAccess: true,
        })
      }
      updated++
      console.log(`${DRY ? '[dry] ' : ''}~ ${e.title}`)
      continue
    }
    if (DRY) {
      console.log(`[dry] CREATE ${e.title} slug=${e.slug}`)
      created++
      continue
    }
    const doc = await payload.create({
      collection: 'products',
      data: {
        title: e.title,
        slug: e.slug,
        category: catBySlug[e.cat],
        price: e.price,
        billingCycle: 'monthly',
        unit: '/tháng',
        shortDescription: e.short.slice(0, 600),
        description: htmlToLexical(e.html),
        inStock: true,
        featured: false,
        order: 0,
      },
      overrideAccess: true,
    })
    created++
    console.log(`+ ${e.title} id=${doc.id}`)
  }

  // 6. Di dong combo (DD.goi): khop theo ma goi, gia 1 thang + bang chu ky
  const CYCLE_NAMES: Record<string, string> = { '1': '1 tháng', '3': '3 tháng', '6': '6 tháng', '12': '12 tháng' }
  for (const g of ddGoi) {
    let price1 = g.g?.['1']
    let billingCycle = 'monthly'
    let unit = '/tháng'
    if (!price1) {
      const entries = Object.entries(g.g || {})
      if (!entries.length) continue
      const [k, v] = entries[0] as [string, number]
      price1 = v
      if (/ngày/i.test(k)) {
        const d = parseInt(k) || 0
        billingCycle = d <= 3 ? 'daily' : 'weekly'
        unit = '/' + k
      } else {
        billingCycle = 'other'
        unit = '/' + k + ' tháng'
      }
    }
    const specs = Object.entries(g.q || {})
      .map(([k, v]) => `<li>${k}: ${v}</li>`)
      .join('\n')
    const cycles = Object.entries(g.g || {})
      .map(([k, v]) => `<li>${CYCLE_NAMES[k] || k}: ${fmt(v as number)}</li>`)
      .join('\n')
    const html =
      `<p><strong>${g.ho || 'Gói di động VinaPhone'}</strong></p>\n` +
      (specs ? `<h3>Ưu đãi gói cước</h3>\n<ul>\n${specs}\n</ul>\n` : '') +
      `<h3>Bảng giá theo chu kỳ (đã bao gồm VAT)</h3>\n<ul>\n${cycles}\n</ul>\n` +
      (g.dt ? `<p>Đối tượng: ${g.dt}</p>\n` : '') +
      `<p>Gói cước tự động gia hạn. Soạn tin kiểm tra/hủy theo hướng dẫn của nhà mạng.</p>`
    const hasData = /data|gb/i.test(JSON.stringify(g.q || {}))
    const hasVoice = /thoại|thoai|phút|phut|sms/i.test(JSON.stringify(g.q || {}))
    const catSlug = hasData && hasVoice ? 'combo-thoai-data' : hasVoice ? 'goi-cuoc-thoai' : 'goi-cuoc-4g'
    const title = g.n
    const slug = slugify(`goi-${g.n}`)
    const short = Object.entries(g.q || {})
      .slice(0, 2)
      .map(([, v]) => `${v}`)
      .join(', ')
    const exists = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1 })
    const byName = exists.docs[0]
      ? []
      : await payload.find({ collection: 'products', where: { title: { equals: title } }, limit: 5 }).then((r) => r.docs)
    const target = exists.docs[0] || byName[0]
    if (target) {
      if (!DRY) {
        await payload.update({
          collection: 'products',
          id: target.id,
          data: {
            title,
            price: price1,
            billingCycle,
            unit,
            shortDescription: `${short}. Giá ${fmt(price1)}/tháng.`.slice(0, 600),
            description: htmlToLexical(html),
            inStock: true,
          },
          overrideAccess: true,
        })
      }
      updated++
      console.log(`${DRY ? '[dry] ' : ''}~ ${title} (${target.slug})`)
      continue
    }
    if (DRY) {
      console.log(`[dry] CREATE ${title} slug=${slug} cat=${catSlug}`)
      created++
      continue
    }
    const doc = await payload.create({
      collection: 'products',
      data: {
        title,
        slug,
        category: catBySlug[catSlug],
        price: price1,
        billingCycle,
        unit,
        shortDescription: `${short}. Giá ${fmt(price1)}/tháng.`.slice(0, 600),
        description: htmlToLexical(html),
        inStock: true,
        featured: false,
        order: 0,
      },
      overrideAccess: true,
    })
    created++
    console.log(`+ ${title} id=${doc.id}`)
  }

  // 7. Di dong le (DD.le): gia + chu ky le, don vi theo chu ky
  for (const g of ddLe) {
    const ck = g.ck || ''
    const billingCycle = /h$/i.test(ck) || ck.includes('h') ? 'daily' : /7 ngày/i.test(ck) ? 'weekly' : 'monthly'
    const unit = '/' + ck
    const title = g.n
    const slug = slugify(`goi-${g.n}`)
    const html = `<p>${g.nd || ''}</p>\n<p>Giá ${fmt(g.gia)}/${ck} (đã bao gồm VAT).</p>`
    const exists = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1 })
    if (exists.docs[0]) {
      if (!DRY) {
        await payload.update({
          collection: 'products',
          id: exists.docs[0].id,
          data: {
            title,
            price: g.gia,
            billingCycle,
            unit,
            shortDescription: `${g.nd || ''} Giá ${fmt(g.gia)}/${ck}.`.slice(0, 600),
            description: htmlToLexical(html),
            inStock: true,
          },
          overrideAccess: true,
        })
      }
      updated++
      console.log(`${DRY ? '[dry] ' : ''}~ ${title}`)
      continue
    }
    const catSlug = /thoại|thoai|sms/i.test(`${g.loai || ''} ${g.nd || ''}`) ? 'goi-cuoc-thoai' : 'goi-cuoc-4g'
    if (DRY) {
      console.log(`[dry] CREATE ${title} slug=${slug} cat=${catSlug}`)
      created++
      continue
    }
    const doc = await payload.create({
      collection: 'products',
      data: {
        title,
        slug,
        category: catBySlug[catSlug],
        price: g.gia,
        billingCycle,
        unit,
        shortDescription: `${g.nd || ''} Giá ${fmt(g.gia)}/${ck}.`.slice(0, 600),
        description: htmlToLexical(html),
        inStock: true,
        featured: false,
        order: 0,
      },
      overrideAccess: true,
    })
    created++
    console.log(`+ ${title} id=${doc.id}`)
  }

  // 8. Cam TTN moi 01/9: gia thue/thang + ghi gia mua trong mo ta
  for (const t of ttn) {
    const title = t.n
    const slug = slugify(`goi-${t.n}-ttn-moi`)
    const html =
      `<p><strong>MỚI từ 01/9/2026${t.nhan ? ' — ' + t.nhan : ''}</strong></p>\n` +
      `<p>${t.nd || ''}</p>\n` +
      `<ul>\n<li>Giá thuê: ${fmt(t.thue || 0)}/tháng${t.thuen ? ` (${t.thuen})` : ''}</li>\n` +
      `<li>Giá mua: ${fmt(t.gia || 0)}${t.cu ? ` (giá cũ ${fmt(t.cu)})` : ''}</li>\n</ul>\n` +
      (t.dk ? `<p>${t.dk}</p>\n` : '') +
      (t.cunhan ? `<p>${t.cunhan}</p>\n` : '')
    const exists = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1 })
    if (exists.docs[0]) {
      if (!DRY) {
        await payload.update({
          collection: 'products',
          id: exists.docs[0].id,
          data: {
            title,
            price: t.thue || t.gia || 0,
            billingCycle: 'monthly',
            unit: '/tháng',
            shortDescription: `${t.nd || ''} Thuê ${fmt(t.thue || 0)}/tháng.`.slice(0, 600),
            description: htmlToLexical(html),
            inStock: true,
          },
          overrideAccess: true,
        })
      }
      updated++
      console.log(`${DRY ? '[dry] ' : ''}~ ${title}`)
      continue
    }
    if (DRY) {
      console.log(`[dry] CREATE ${title} slug=${slug}`)
      created++
      continue
    }
    const doc = await payload.create({
      collection: 'products',
      data: {
        title,
        slug,
        category: catBySlug['internet-camera'],
        price: t.thue || t.gia || 0,
        billingCycle: 'monthly',
        unit: '/tháng',
        shortDescription: `${t.nd || ''} Thuê ${fmt(t.thue || 0)}/tháng.`.slice(0, 600),
        description: htmlToLexical(html),
        inStock: true,
        featured: true,
        order: 0,
      },
      overrideAccess: true,
    })
    created++
    console.log(`+ ${title} id=${doc.id}`)
  }

  console.log(`\n== KET QUA == Updated: ${updated} | Created: ${created}${DRY ? ' (dry run — khong ghi DB)' : ''}`)
  process.exit(0)
}

main().catch((e) => {
  console.error('LOI:', e)
  process.exit(1)
})
