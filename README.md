# vienthongngason.com

Website bán dịch vụ viễn thông (Internet cáp quang, SIM & gói cước, Camera an ninh, TV Box) cho **Viễn Thông Nga Sơn** — Nga Sơn, Thanh Hóa.

**Stack**: Next.js 15 + Payload CMS 3 + PostgreSQL + MCP server — chạy trên máy chủ cá nhân (Ubuntu, Docker), public qua **Cloudflare Tunnel** với domain `vienthongngason.com` (không cần IP tĩnh, không mở port).

## Kiến trúc

```
Khách hàng → Cloudflare Edge (SSL, CDN, WAF, cache)
           → Cloudflare Tunnel (cloudflared)
           → Docker trên server Ubuntu:
                ├── app (:3000)   Next.js 15 + Payload 3
                │     ├── /           trang khách hàng (ISR 300s, SEO đầy đủ)
                │     ├── /admin      Payload CMS — quản sản phẩm/tin/đơn
                │     ├── /api        form đăng ký + REST
                │     └── /mcp        MCP server (6 tools, Bearer token)
                ├── db            PostgreSQL 17
                └── cloudflared   tunnel
```

## Cấu trúc repo

| Đường dẫn | Vai trò |
|-----------|---------|
| `app/` | Ứng dụng Next.js + Payload (xem chi tiết trong `app/README.md`) |
| `content/` | Nội dung gốc các trang (Giới thiệu, Chính sách...) — nguồn seed |
| `assets/brand/` | Logo & tài nguyên thương hiệu (thả `logo.png` vào đây) |
| `start-dev.bat` | Chạy dev server trên Windows (double-click) |
| `deploy.sh` | Deploy tự động lên server Ubuntu |

## Chạy local (Windows)

```bat
start-dev.bat
```

hoặc thủ công:

```bash
cd app
cp .env.example .env        # điền PAYLOAD_SECRET, MCP_TOKEN
npm install --legacy-peer-deps
npx tsx src/seed.ts         # lần đầu: tạo admin + dữ liệu mẫu (đọc từ content/)
npm run dev                 # http://localhost:3000
```

- Web: `http://localhost:3000` · Admin: `http://localhost:3000/admin`
- Admin: `admin@vienthongngason.com` — mật khẩu do bạn đặt qua biến `SEED_ADMIN_PASSWORD` trong `app/.env` trước khi seed. Không còn mật khẩu mặc định; seed sẽ báo lỗi nếu biến này để trống. Tạo mật khẩu mạnh: `openssl rand -base64 24 | tr -d '/+=' | cut -c1-24`

## Deploy lên server Ubuntu

1. Copy repo lên server (`git clone` hoặc scp)
2. Chạy:

```bash
tr -d '\r' < deploy.sh > /tmp/deploy.sh && bash /tmp/deploy.sh
```

3. Trỏ hostname trên Cloudflare Tunnel: `vienthongngason.com` + `www` → `http://app:3000`
4. Bảo mật: Zero Trust Access cho `/admin`, WAF rate-limit `/api/register`
5. Đăng ký MCP: Zero Trust → AI Controls → MCP servers → `https://vienthongngason.com/mcp` (Bearer = `MCP_TOKEN`)

## SEO

- Metadata/canonical/OG riêng từng trang, JSON-LD: LocalBusiness, Product (giá VND), FAQ, Breadcrumb, NewsArticle
- `sitemap.xml` động (tự gồm mọi sản phẩm/danh mục/bài viết), `robots.txt`
- ISR 300s + Cloudflare cache → tốc độ cao
- Đăng ký Google Search Console sau khi live
