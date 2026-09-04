// Import noi dung that cho 8 trang "pages" tu content/*.md cua repo.
//
// Ngu canh: seed luc docker build khong thay thu muc content/ (nam ngoai build
// context cua service app), nen tat ca cac trang deu luu placeholder loi:
// chuoi "<p>Nội dung trang ... đang được cập nhật.</p>" duoc luu thanh TEXT
// thuoc Lexical -> web hien nguyen van the HTML bi escape.
//
// Chay trong container: docker exec ... npx tsx src/import-pages.ts
// Dung convertHTMLToLexical cua chinh @payloadcms/richtext-lexical (khac voi
// ham tu viet trong seed.ts khong tao du cau truc Lexical thuc su).
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'
import { htmlToLexical } from './mklexical'

// Converter HTML don gian cho markdown cua rieng repo nay: ho tro
// h1-h4, ul/ol/li, bold, italic, link, doan van, ngat dong.
function mdToHtml(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inUl = false
  let inOl = false
  let inList = false

  const closeLists = () => {
    if (inUl) { html.push('</ul>'); inUl = false }
    if (inOl) { html.push('</ol>'); inOl = false }
    inList = false
  }

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { closeLists(); continue }

    if (/^---+$/.test(line)) { closeLists(); html.push('<hr/>'); continue }

    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      closeLists()
      const level = h[1].length
      html.push(`<h${level}>${inline(h[2])}</h${level}>`)
      continue
    }

    const li = line.match(/^[-*]\s+(.*)/)
    if (li) {
      if (inOl) { html.push('</ol>'); inOl = false }
      if (!inUl) { html.push('<ul>'); inUl = true; inList = true }
      html.push(`<li>${inline(li[1])}</li>`)
      continue
    }

    const oli = line.match(/^\d+[.)]\s+(.*)/)
    if (oli) {
      if (inUl) { html.push('</ul>'); inUl = false }
      if (!inOl) { html.push('<ol>'); inOl = true; inList = true }
      html.push(`<li>${inline(oli[1])}</li>`)
      continue
    }

    closeLists()
    html.push(`<p>${inline(line)}</p>`)
  }
  closeLists()
  return html.join('\n')
}

// Map slug pages <-> file markdown. Seed dung bo ten khac slug nen phai anh xa
// lai: xem POLICY_FILES va mang pages trong seed.ts.
const MD_TO_PAGE: Array<[string /* slug page */, string /* file md */]> = [
  ['gioi-thieu', '02-gioi-thieu.md'],
  ['dang-ky', '03-dang-ky-lap-dat.md'],
  ['ho-tro', '04-ho-tro-lien-he.md'],
  ['dieu-khoan-chung', '05-dieu-khoan-chung.md'],
  ['chinh-sach-bao-ve-thong-tin-khach-hang', '06-chinh-sach-bao-ve-thong-tin-khach-hang.md'],
  ['chinh-sach-thanh-toan', '07-chinh-sach-thanh-toan.md'],
  ['chinh-sach-bao-hanh-doi-tra', '08-chinh-sach-bao-hanh-doi-tra.md'],
  ['quy-trinh-lap-dat-va-khieu-nai', '09-quy-trinh-lap-dat-khieu-nai.md'],
]

async function main() {
  const payload = await getPayload({ config })
  const contentDir = process.env.CONTENT_DIR ?? '../content'
  let updated = 0

  for (const [slug, file] of MD_TO_PAGE) {
    const filePath = path.join(contentDir, file)
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP ${slug.padEnd(42)} (khong tim thay ${filePath})`)
      continue
    }

    const md = fs.readFileSync(filePath, 'utf-8')
    const body = md.split(/\n---\n|\n## Thông tin liên hệ/)[0] // bo phan footer lien he
    const html = mdToHtml(body)
    const excerpt = (body.match(/^#\s+(.+)$/m)?.[1] ?? slug).replace(/[#*]/g, '').trim()

    // htmlToLexical tao node Lexical thuan (heading/paragraph/list/link/
    // horizontalrule) — dung duoc ngay voi component RichText cua Payload,
    // khac seed.ts cu nhet chuoi HTML vao text node lam web hien the bi escape.
    const lexical = htmlToLexical(html)

    const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1 })
    if (docs[0]) {
      await payload.update({
        collection: 'pages',
        id: docs[0].id,
        data: { content: lexical as any, excerpt },
        overrideAccess: true,
      })
      console.log(`  OK   ${slug.padEnd(42)} cap nhat (page #${docs[0].id})`)
    } else {
      const created = await payload.create({
        collection: 'pages',
        data: { title: excerpt, slug, excerpt, content: lexical as any },
        overrideAccess: true,
      })
      console.log(`  OK   ${slug.padEnd(42)} tao moi (page #${created.id})`)
    }
    updated++
  }

  console.log(`--- ${updated} trang da nhap noi dung that`)
  process.exit(0)
}

main().catch((e) => {
  console.error('LOI:', e)
  process.exit(1)
})
