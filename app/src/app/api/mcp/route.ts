import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { formatPrice } from '@/lib/utils'

function jsonResponse(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', result, id })
}

function errorResponse(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: '2.0', error: { code, message }, id }, { status })
}

function textResult(text: string, isError = false) {
  const r: Record<string, unknown> = { content: [{ type: 'text', text }] }
  if (isError) r.isError = true
  return r
}

const TOOLS = [
  {
    name: 'get_site_info',
    description: 'Thông tin website Viễn Thông Nga Sơn: tên, slogan, danh sách dịch vụ, danh mục sản phẩm và thông tin liên hệ.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_products',
    description: 'Liệt kê sản phẩm/dịch vụ đang bán: gói Internet cáp quang, SIM & gói cước, camera an ninh, TV Box. Có thể lọc theo danh mục.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Slug danh mục — chấp nhận cả danh mục gốc (di-dong, internet-truyen-hinh, dich-vu-cntt) lẫn danh mục con; sẽ gộp sản phẩm của các danh mục con. Bỏ trống để lấy tất cả.' },
        limit: { type: 'integer', description: 'Số lượng tối đa (mặc định 10, tối đa 50).' },
      },
    },
  },
  {
    name: 'search_products',
    description: 'Tìm kiếm sản phẩm/dịch vụ theo từ khóa.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa, ví dụ: wifi mesh, camera trong nhà, gói 4G.' },
        limit: { type: 'integer', description: 'Số lượng tối đa (mặc định 10, tối đa 50).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product',
    description: 'Xem chi tiết một sản phẩm/dịch vụ theo slug.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Slug sản phẩm' } },
      required: ['slug'],
    },
  },
  {
    name: 'list_recent_posts',
    description: 'Liệt kê bài viết/tin tức mới nhất trên website.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'Số lượng tối đa (mặc định 5, tối đa 20).' } },
    },
  },
  {
    name: 'create_service_request',
    description: 'Tạo đăng ký lắp đặt dịch vụ mới cho khách hàng (lưu vào hệ thống, nhân viên sẽ gọi lại). Dùng khi khách muốn lắp Internet, SIM, camera hoặc TV Box.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Họ và tên khách hàng.' },
        phone: { type: 'string', description: 'Số điện thoại khách hàng.' },
        service: { type: 'string', description: 'internet / sim / camera / tvbox / other.' },
        address: { type: 'string', description: 'Địa chỉ lắp đặt.' },
        note: { type: 'string', description: 'Ghi chú thêm.' },
      },
      required: ['name', 'phone'],
    },
  },
]

async function callTool(name: string, args: Record<string, unknown>) {
  const payload = await getPayloadClient()

  switch (name) {
    case 'get_site_info': {
      const settings = await payload.findGlobal({ slug: 'settings' })
      const cats = await payload.find({ collection: 'categories', limit: 20, depth: 0 })
      return textResult(
        JSON.stringify(
          {
            name: settings?.siteName,
            slogan: settings?.slogan,
            url: process.env.NEXT_PUBLIC_SITE_URL,
            services: ['Internet cáp quang', 'SIM & gói cước', 'Camera an ninh', 'TV Box'],
            product_categories: cats.docs.map((c) => ({ name: c.name, slug: c.slug })),
            contact: { hotline: settings?.hotline, address: settings?.address, email: settings?.email },
          },
          null,
          2,
        ),
      )
    }

    case 'list_products':
    case 'search_products': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 10))
      const where: Where = {}
      if (args.category) {
        const cats = await payload.find({ collection: 'categories', where: { slug: { equals: String(args.category) } }, limit: 1, depth: 1 })
        const cat = cats.docs[0]
        if (!cat) return textResult('Không tìm thấy danh mục: ' + String(args.category), true)
        // Gop ca danh muc con (frontend da lam vay): truy van dung id danh muc
        // cha se tra thieu san pham cua cac danh muc con.
        const ids: number[] = [cat.id as number]
        const all = await payload.find({ collection: 'categories', limit: 200, depth: 1 })
        for (const c of all.docs) {
          const p = (c as { parent?: { id?: number } | number | null }).parent
          const pid = p == null ? null : typeof p === 'number' ? p : (p.id ?? null)
          if (pid === cat.id) ids.push(c.id as number)
        }
        where.category = { in: ids }
      }
      if (name === 'search_products' && args.query) {
        where.or = [
          { title: { like: String(args.query) } },
          { shortDescription: { like: String(args.query) } },
        ]
      }
      const { docs, totalDocs } = await payload.find({ collection: 'products', where, limit, depth: 1 })
      return textResult(
        JSON.stringify(
          {
            total: totalDocs,
            count: docs.length,
            items: docs.map((p) => ({
              id: p.id,
              name: p.title,
              slug: p.slug,
              price: formatPrice(p.price, p.unit),
              category: typeof p.category === 'object' ? p.category?.slug : undefined,
              excerpt: p.shortDescription,
              link: `/san-pham/${p.slug}`,
            })),
          },
          null,
          2,
        ),
      )
    }

    case 'get_product': {
      const slug = String(args.slug ?? '')
      const { docs } = await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
      const p = docs[0]
      if (!p) return textResult('Không tìm thấy sản phẩm: ' + slug, true)
      return textResult(
        JSON.stringify(
          {
            id: p.id,
            name: p.title,
            slug: p.slug,
            price: formatPrice(p.price, p.unit),
            category: typeof p.category === 'object' ? p.category?.name : undefined,
            excerpt: p.shortDescription,
            inStock: p.inStock,
            link: `/san-pham/${p.slug}`,
          },
          null,
          2,
        ),
      )
    }

    case 'list_recent_posts': {
      const limit = Math.max(1, Math.min(20, Number(args.limit) || 5))
      const { docs } = await payload.find({ collection: 'posts', limit, sort: '-publishedAt', depth: 0 })
      return textResult(
        JSON.stringify(
          {
            total: docs.length,
            items: docs.map((p) => ({ title: p.title, slug: p.slug, link: `/tin-tuc/${p.slug}` })),
          },
          null,
          2,
        ),
      )
    }

    case 'create_service_request': {
      const customerName = String(args.name ?? '').trim()
      const phone = String(args.phone ?? '').trim()
      if (customerName.length < 2 || phone.length < 8) {
        return textResult('Vui long cung cap du name va phone cua khach hang.', true)
      }
      const service = (['internet', 'sim', 'camera', 'tvbox', 'other'] as const).includes(String(args.service) as any)
        ? (String(args.service) as 'internet' | 'sim' | 'camera' | 'tvbox' | 'other')
        : 'other'
      const doc = await payload.create({
        collection: 'service-requests',
        data: {
          name: customerName.slice(0, 100),
          phone: phone.slice(0, 15),
          service,
          address: String(args.address ?? '').slice(0, 200),
          note: String(args.note ?? '').slice(0, 500),
          source: 'mcp',
          status: 'new',
        },
      })
      return textResult(`Da tao dang ky #${doc.id} cho khach hang ${customerName} (${phone}). Nhan vien se goi lai trong 30 phut.`)
    }

    default:
      return textResult('Unknown tool: ' + name, true)
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.MCP_TOKEN ?? ''
  if (!expected) return errorResponse(null, -32000, 'Server chua cau hinh MCP_TOKEN.', 500)

  const provided = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim() || (req.headers.get('x-mcp-token') ?? '').trim()
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (provided.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return errorResponse(null, -32001, 'Unauthorized', 401)
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.method !== 'string') {
    return errorResponse(null, -32700, 'Parse error: body khong phai JSON-RPC 2.0 hop le.', 400)
  }

  const { id, method, params } = body as { id?: unknown; method: string; params?: Record<string, unknown> }
  if (method.startsWith('notifications/')) {
    return new NextResponse(null, { status: 202 })
  }

  try {
    switch (method) {
      case 'initialize':
        return jsonResponse(id, {
          protocolVersion: (params?.protocolVersion as string) ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'vienthongngason-mcp', version: '1.0.0' },
        })
      case 'ping':
        return jsonResponse(id, {})
      case 'tools/list':
        return jsonResponse(id, { tools: TOOLS })
      case 'tools/call': {
        const { name, arguments: args } = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
        return jsonResponse(id, await callTool(String(name), args ?? {}))
      }
      default:
        return errorResponse(id, -32601, 'Method not found: ' + method)
    }
  } catch (e) {
    console.error('[mcp]', e)
    return errorResponse(id, -32603, 'Internal error')
  }
}

export async function GET() {
  return errorResponse(null, -32000, 'Method Not Allowed. Chi ho tro POST (JSON-RPC 2.0, Streamable HTTP).', 405)
}
