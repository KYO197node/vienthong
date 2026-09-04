// Cap nhat gia that tu digishop.vnpt.vn vao san pham website + them goi moi.
//
// Du lieu: /tmp/opencode/digishop-data.json (da crawl 49 goi: 39 internet-tv + 10 di-dong).
//  - San pham da co tren site: doi gia + mo ta ngan/mo ta day du theo gia VNPT that.
//  - Goi VNPT co tren digishop ma site chua co: tao san pham moi (goi moi
//    internet/mesh/mytv; cac goi data ngan ngay CTG/CPV/DCH bo vao danh muc di-dong).
//  - Goi ty le (vd 'HOME 1 (Mesh)') boc sung chu ky 1/3/6/13 thang vao mo ta.
// Chay: docker cp vao container + npx tsx (cung cach import-pages.ts).
import fs from 'fs'
import { getPayload } from 'payload'
import config from '../payload.config'
import { htmlToLexical } from './mklexical'

type Pkg = {
  id: number
  name: string
  url: string
  slug: string
  price: number
  duration: number
  packageCode: string | null
  cycles: Record<string, number>
  short: string
  description_html: string
}

type Data = { internet: Pkg[]; mobile: Pkg[] }

// ---- map ten goi digishop <-> slug san pham dang co tren site ----
const NAME_TO_SLUG: Record<string, string> = {
  'HOME 1': 'home-internet-1-fiber-300mbps',
  'HOME 2': 'home-internet-2-fiber-500mbps',
  'HOME 3': 'home-internet-3-fiber-1gbps',
  'HOME 1 (Mesh)': 'home-internet-1-mesh-300mbps',
  'HOME 2 (Mesh)': 'home-internet-2-mesh-500mbps',
  'HOMETV 1': 'hometv-1-mytv-nang-cao-300mbps',
  'HOMETV 2': 'hometv-2-mytv-nang-cao-500mbps',
  'HOMETV  3': 'hometv-3-mytv-nang-cao-1gbps',
  'HOMETV VIP1': 'mytv-vip-hometv-vip1-300mbps',
  'HOME CAM 1': 'home-cam-1-internet-300m-camera-cloud',
  'HOME CAM 2': 'home-cam-2-internet-500m-camera-mesh',
  'HOME CAM 3': 'home-cam-3-internet-1g-camera-cloud',
  'HOME SÀNH 2': 'home-sanh-2-combo-internet-di-dong',
}

// danh muc con (slug) cho tung loai goi moi
const CAT_OF_NEW: Record<string, string> = {
  'HOME 1 (2 Mesh)': 'internet-wifi-mesh',
  'HOME 2 (2 Mesh)': 'internet-wifi-mesh',
  'HOME 3 (2 Mesh)': 'internet-wifi-mesh',
  'HOME 3 (Mesh)': 'internet-wifi-mesh',
  'HOMETV 1 (Mesh)': 'truyen-hinh-mytv',
  'HOMETV 2 (Mesh)': 'truyen-hinh-mytv',
  'HOMETV 2 (2 Mesh)': 'truyen-hinh-mytv',
  'HOMETV 3 (Mesh)': 'truyen-hinh-mytv',
  'HOMETV 3 (2 Mesh)': 'truyen-hinh-mytv',
  'HOMETV VIP1 (Mesh)': 'truyen-hinh-mytv',
  'HOME CAM 1 (Mesh)': 'internet-camera',
  'HOME CAM 2 (Mesh)': 'internet-camera',
  'HOME CAM 2 (2 Mesh)': 'internet-camera',
  'HOME CAM 3 (Mesh)': 'internet-camera',
  'HOME CAM 3 (2 Mesh)': 'internet-camera',
  'HOME ĐỈNH': 'internet-wifi-mesh',
  'HOME SÀNH 2': 'internet-di-dong',
  CINE: 'truyen-hinh-mytv',
  'MỌT PHIM': 'truyen-hinh-mytv',
  SCTV: 'truyen-hinh-mytv',
  'SPORT LITE': 'truyen-hinh-mytv',
  SPORT: 'truyen-hinh-mytv',
  'TẮT QUẢNG CÁO': 'truyen-hinh-mytv',
  'VIP LITE': 'truyen-hinh-mytv',
  VIP: 'truyen-hinh-mytv',
  'VIP Max': 'truyen-hinh-mytv',
  VTVcab: 'truyen-hinh-mytv',
  CPV10: 'goi-cuoc-4g',
  CPV125: 'goi-cuoc-4g',
  CTG5: 'goi-cuoc-4g',
  CTG25: 'goi-cuoc-4g',
  CTG90: 'goi-cuoc-4g',
  DCH90: 'goi-cuoc-4g',
}

// cac goi da ton tai tren site nhung KHONG lay du lieu digishop (sp thiet bi,
// dich vu cntt...) — giu nguyen gia hien tai.

function cycleNote(p: Pkg): string {
  const parts: string[] = []
  const order = ['1', '3', '6', '13', '24', '7', '30', '90', '180', '360']
  for (const k of order) {
    if (p.cycles[k]) parts.push(`${k} tháng: ${p.cycles[k].toLocaleString('vi-VN')}đ`)
  }
  return parts.length ? `Giá theo chu kỳ — ${parts.join(' · ')}.` : ''
}

function buildShort(p: Pkg): string {
  // lay 3 dong dau (uu dai chinh) lam mo ta ngan
  const lines = p.short.split(/(?=\d\. )/).slice(0, 2).join(' ')
  return (lines || p.short).slice(0, 380)
}

function buildHtml(p: Pkg): string {
  // description_html da la HTML hoan chinh cua VNPT; boc them gia chu ky
  const note = cycleNote(p)
  const pre = note ? `<p><strong>${p.name}</strong> — ${note}</p>` : ''
  return (pre + p.description_html).replace(/<br>\n?/g, '<br/>')
}

function slugifyNew(p: Pkg): string {
  const map: Record<string, string> = {
    'HOME 1 (2 Mesh)': 'home-internet-1-2-mesh-300mbps',
    'HOME 2 (2 Mesh)': 'home-internet-2-2-mesh-500mbps',
    'HOME 3 (Mesh)': 'home-internet-3-mesh-1gbps',
    'HOME 3 (2 Mesh)': 'home-internet-3-2-mesh-1gbps',
    'HOMETV 1 (Mesh)': 'hometv-1-mesh-300mbps',
    'HOMETV 2 (Mesh)': 'hometv-2-mesh-500mbps',
    'HOMETV 2 (2 Mesh)': 'hometv-2-2-mesh-500mbps',
    'HOMETV 3 (Mesh)': 'hometv-3-mesh-1gbps',
    'HOMETV 3 (2 Mesh)': 'hometv-3-2-mesh-1gbps',
    'HOMETV VIP1 (Mesh)': 'hometv-vip1-mesh-300mbps',
    'HOME CAM 1 (Mesh)': 'home-cam-1-mesh-300m-camera-cloud',
    'HOME CAM 2 (Mesh)': 'home-cam-2-mesh-500m-camera-mesh',
    'HOME CAM 2 (2 Mesh)': 'home-cam-2-2-mesh-500m-camera-mesh',
    'HOME CAM 3 (Mesh)': 'home-cam-3-mesh-1g-camera-cloud',
    'HOME CAM 3 (2 Mesh)': 'home-cam-3-2-mesh-1g-camera-cloud',
    'HOME ĐỈNH': 'home-dinh-combo-internet-1g-mytv',
    CINE: 'goi-cine-truyen-hinh',
    'MỌT PHIM': 'goi-mot-phim',
    SCTV: 'goi-sctv',
    'SPORT LITE': 'goi-sport-lite',
    SPORT: 'goi-sport',
    'TẮT QUẢNG CÁO': 'goi-tat-quang-cao',
    'VIP LITE': 'goi-vip-lite',
    VIP: 'goi-vip-truyen-hinh',
    'VIP Max': 'goi-vip-max',
    VTVcab: 'goi-vtvcab',
    CPV10: 'goi-cpv10-5gb-24h',
    CPV125: 'goi-cpv125-7gb-ngay',
    CTG5: 'goi-ctg5-150mb-24h',
    CTG25: 'goi-ctg25-300mb-7-ngay',
    CTG90: 'goi-ctg90-2gb-30-ngay',
    DCH90: 'goi-dch90-8gb-30-ngay',
  }
  return map[p.name] ?? `goi-${p.slug}-${p.id}`
}

async function main() {
  const payload = await getPayload({ config })
  const data: Data = JSON.parse(fs.readFileSync('/tmp/digishop-data.json', 'utf-8'))
  const all = [...data.internet, ...data.mobile]

  let updated = 0
  let created = 0
  const skipped: string[] = []

  // danh muc theo slug (de lay id khi tao goi moi)
  const { docs: cats } = await payload.find({ collection: 'categories', limit: 100, depth: 0 })
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id as number]))

  for (const p of all) {
    const existingSlug = NAME_TO_SLUG[p.name]

    if (existingSlug) {
      const { docs } = await payload.find({ collection: 'products', where: { slug: { equals: existingSlug } }, limit: 1 })
      if (!docs[0]) {
        skipped.push(`${p.name} -> ${existingSlug} (slug khong ton tai)`)
        continue
      }
      await payload.update({
        collection: 'products',
        id: docs[0].id,
        data: {
          price: p.price,
          shortDescription: buildShort(p),
          description: htmlToLexical(buildHtml(p).replace(/(<\/(?:p|h[1-4]|li|ul|ol)>)/g, '$1\n')) as any,
        },
        overrideAccess: true,
      })
      console.log(`UPD  ${p.name.padEnd(22)} -> #${docs[0].id} gia=${p.price}`)
      updated++
      continue
    }

    const catSlug = CAT_OF_NEW[p.name]
    if (!catSlug || !catBySlug.get(catSlug)) {
      skipped.push(`${p.name} (khong map danh muc)`)
      continue
    }

    const newSlug = slugifyNew(p)
    const { docs: dupe } = await payload.find({ collection: 'products', where: { slug: { equals: newSlug } }, limit: 1 })
    if (dupe[0]) {
      // da co lan chay truoc: chi cap nhat gia
      await payload.update({
        collection: 'products',
        id: dupe[0].id,
        data: { price: p.price, shortDescription: buildShort(p), description: htmlToLexical(buildHtml(p).replace(/(<\/(?:p|h[1-4]|li|ul|ol)>)/g, '$1\n')) as any },
        overrideAccess: true,
      })
      console.log(`UPD* ${p.name.padEnd(22)} -> #${dupe[0].id} gia=${p.price}`)
      updated++
      continue
    }

    const createdDoc = await payload.create({
      collection: 'products',
      data: {
        title: p.name,
        slug: newSlug,
        category: catBySlug.get(catSlug)!,
        price: p.price,
        unit: '/tháng',
        shortDescription: buildShort(p),
        description: htmlToLexical(buildHtml(p).replace(/(<\/(?:p|h[1-4]|li|ul|ol)>)/g, '$1\n')) as any,
        inStock: true,
        featured: false,
        order: 100,
      },
      overrideAccess: true,
    })
    console.log(`NEW  ${p.name.padEnd(22)} -> #${createdDoc.id} gia=${p.price} (${catSlug})`)
    created++
  }

  console.log(`---\ncap nhat: ${updated} | tao moi: ${created} | bo qua: ${skipped.length}`)
  for (const s of skipped) console.log('  skip', s)
  process.exit(0)
}

main().catch((e) => {
  console.error('LOI:', e)
  process.exit(1)
})
