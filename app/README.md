# vienthongngason.com — Next.js + Payload CMS

Website bán dịch vụ viễn thông (Internet, SIM, Camera, TV Box) — **Next.js 15 + Payload 3**, admin panel tích hợp, MCP server cho AI assistant, chuẩn SEO.

## Chạy local (đã cài Node 20+)

```bash
cd app
cp .env.example .env        # sua MCP_TOKEN + PAYLOAD_SECRET + SEED_ADMIN_PASSWORD
npm install --legacy-peer-deps
npm run generate:types      # tao src/payload-types.ts
npm run migrate             # cap nhat schema database
npx tsx src/seed.ts         # du lieu mau (lan dau)
npm run dev                 # http://localhost:3000
```

- **Trang web**: http://localhost:3000
- **Admin**: http://localhost:3000/admin — `admin@vienthongngason.com`, mật khẩu lấy từ biến `SEED_ADMIN_PASSWORD` trong `.env` (bắt buộc đặt trước khi seed, không có giá trị mặc định)
- **MCP**: `POST /mcp` với header `Authorization: Bearer <MCP_TOKEN>`

## Cấu trúc

```
app/
├── payload.config.ts        # Cau hinh Payload (SQLite dev / PostgreSQL prod)
├── src/
│   ├── collections/         # Users, Media, Categories, Products, Posts, ServiceRequests, Pages
│   ├── globals/Settings.ts  # Hotline, Zalo, slogan, banner slider, logo doi tac VNPT
│   ├── migrations/          # Migration database (bat buoc chay khi doi schema)
│   ├── app/
│   │   ├── (frontend)/      # Trang khach hang: /, /shop, /danh-muc/[slug], /san-pham/[slug],
│   │   │                    # /tin-tuc, /dang-ky (form), /ho-tro, /gioi-thieu, /chinh-sach/[slug], /tim-kiem
│   │   ├── (payload)/       # Admin UI
│   │   ├── api/register/    # Nhan form dang ky
│   │   ├── api/mcp/         # MCP server (JSON-RPC 2.0, Bearer token)
│   │   ├── sitemap.ts       # Sitemap dong (tat ca san pham/danh muc/bai viet)
│   │   └── robots.ts
│   ├── components/
│   │   ├── admin/Dashboard  # Bang dieu khien quan tri (thay dashboard mac dinh)
│   │   └── ...              # Header, Footer, SiteNav, HeroSlider, ProductCard...
│   ├── lib/                 # Payload client, queries (cache runtime), dashboard, utils
│   └── seed.ts              # Du lieu mau (chay 1 lan)
├── Dockerfile               # Multi-stage, standalone output
└── docker-compose.yml       # app + PostgreSQL 17 + cloudflared (profile tunnel)
```

## Migration database — ĐỌC TRƯỚC KHI THÊM FIELD

Schema production do **migration** quản lý, không dùng `dev push`. Mỗi khi thêm/sửa
field trong `collections/` hoặc `globals/`, phải tạo migration rồi chạy, nếu không
mọi truy vấn sẽ lỗi `column ... does not exist` và **toàn site trả 500**.

```bash
npm run migrate:create ten_thay_doi   # sinh file trong src/migrations/
npm run migrate                       # ap dung len database
npm run migrate:status                # xem migration nao da chay
```

Trong Docker:

```bash
docker compose --profile tools run --rm seed npx payload migrate
```

`deploy.sh` đã tự chạy migration ở bước [5/7] trước khi seed.

## Render và cache

Các trang đọc DB dùng `force-dynamic`, **không** prerender lúc build. Lý do:
`next build` chạy với SQLite (xem Dockerfile) còn production dùng Postgres — nếu
prerender, HTML tĩnh sẽ chứa dữ liệu của DB build-time và sai hoàn toàn.

Tốc độ vẫn giữ nhờ cache dữ liệu ở runtime (`unstable_cache`, TTL 300s trong
`lib/queries.ts`). Hook `afterChange` của Settings/Categories/Posts gọi
`safeRevalidateTag` nên sửa trong admin là site cập nhật ngay, không phải đợi TTL.

Dockerfile xoá `.next/cache` ở stage runner vì `fetch-cache` cũng mang dữ liệu
SQLite build-time sang.

## SEO đã tích hợp

- Metadata API: title/description/canonical/OG riêng từng trang
- JSON-LD: **LocalBusiness**, **WebSite+SearchAction**, **Product** (giá VND, tồn kho), **BreadcrumbList**, **NewsArticle**, **FAQPage**, **CollectionPage**
- `sitemap.xml` tự động (66 URL), `robots.txt` chặn /admin và /api
- HTML ngữ nghĩa (h1-h3, nav, article), `next/font` (Be Vietnam Pro, subsets vietnamese), `next/image` (WebP tự động, tỷ lệ cố định nên CLS = 0)
- Sản phẩm giá 0 hiển thị "Liên hệ" và JSON-LD bỏ hẳn trường `price` thay vì báo 0₫ cho Google

## Deploy lên server Ubuntu (Docker + Cloudflare Tunnel)

```bash
tr -d '\r' < deploy.sh > /tmp/deploy.sh && bash /tmp/deploy.sh
```

Script tự cài Docker nếu thiếu, sinh secret ngẫu nhiên (kể cả mật khẩu admin),
build, chạy migration, rồi seed.

- Public hostname trên Cloudflare Tunnel: `vienthongngason.com` + `www` → `http://app:3000`
- Zero Trust Access bảo vệ `/admin`
- Cổng 3005 bind `127.0.0.1` — truy cập từ ngoài đi qua Tunnel, không phơi trực tiếp
- Backup: `pg_dump` + volume `app_media`

## MCP tools

`get_site_info` · `list_products` · `search_products` · `get_product` · `list_recent_posts` · `create_service_request`

Đăng ký lên Cloudflare AI Controls: Zero Trust → Access controls → AI controls → MCP servers → URL `https://vienthongngason.com/mcp`, auth Bearer = `MCP_TOKEN`.
