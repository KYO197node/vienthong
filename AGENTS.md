# AGENTS.md — Hướng dẫn cho AI coding agent (Codex) trên server Ubuntu

> File này dành cho AGENT (Codex CLI). Chủ website là người Việt, không chuyên lập trình — hãy giải thích kết quả bằng tiếng Việt, còn code/tên kỹ thuật giữ tiếng Anh.

## 1. Bối cảnh dự án

Website **vienthongngason.com** — cửa hàng dịch vụ viễn thông tại Nga Sơn, Thanh Hóa (Việt Nam): Internet cáp quang, SIM & gói cước, camera an ninh, TV Box. Website giới thiệu dịch vụ + thu đăng ký lắp đặt (lead form), KHÔNG có thanh toán online.

**Trạng thái hiện tại**: Code đã hoàn thiện và đã test đầy đủ trên máy Windows (dev + production build pass). Nhiệm vụ trên server này: **triển khai production** theo runbook ở mục 5.

## 2. Stack & phiên bản

| Thành phần | Chi tiết |
|---|---|
| Framework | Next.js 15.5 (App Router) + React 19 |
| CMS | Payload 3.x (admin tại `/admin`) |
| DB | Dev: SQLite (`app/vtngason.db`) · **Production: PostgreSQL 17** (chọn bằng `DATABASE_ADAPTER=postgres`) |
| Rich text | @payloadcms/richtext-lexical |
| Deploy | Docker Compose (app + postgres + cloudflared) |
| Domain | `vienthongngason.com` — public qua **Cloudflare Tunnel** (server không có IP tĩnh, không mở port) |
| Node | >= 20 |

## 3. Cấu trúc repo

```
app/                        # TOÀN BỘ ỨNG DỤNG
├── payload.config.ts       # Config Payload — adapter SQLite/Postgres theo env
├── next.config.mjs         # withPayload + rewrite /mcp -> /api/mcp + output standalone
├── docker-compose.yml      # services: db (postgres) | app | cloudflared (profile tunnel) | seed (profile tools)
├── Dockerfile              # Multi-stage: deps -> builder -> runner (standalone)
├── src/
│   ├── collections/        # Users, Media, Categories, Products, Posts, ServiceRequests, Pages
│   ├── globals/Settings.ts # Global settings: hotline, zalo, slogan, heroSlides...
│   ├── app/(frontend)/     # Trang khách hàng (SSR/ISR): /, /shop, /danh-muc/[slug],
│   │                       # /san-pham/[slug], /tin-tuc, /dang-ky (form), /ho-tro,
│   │                       # /gioi-thieu, /chinh-sach/[slug], /tim-kiem
│   ├── app/(payload)/      # Admin UI bootstrap
│   ├── app/api/mcp/        # MCP server (JSON-RPC 2.0, Bearer token, 6 tools)
│   ├── app/api/register/   # Nhận form đăng ký dịch vụ
│   ├── app/sitemap.ts      # Sitemap động (products + categories + posts + static)
│   ├── app/robots.ts
│   ├── components/         # Header, Footer, HeroSlider, ProductCard, FloatingButtons, RegisterForm...
│   ├── lib/                # payload client, queries, utils (formatPrice VND...)
│   ├── seed.ts             # Seed: admin user + settings + 4 danh mục + 13 sản phẩm + 2 tin + 9 trang
│   └── styles/globals.css  # Design system (xanh #1565c0 / navy #0d47a1 / vàng #ffd200)
content/                    # Nội dung gốc tiếng Việt (markdown) — seed.ts ĐỌC thư mục này khi seed
assets/brand/               # Nơi đặt logo.png (chủ web sẽ cung cấp)
deploy.sh                   # Script deploy 1 lệnh trên server
start-dev.bat               # (Windows) chạy dev — không dùng trên server
```

## 4. Lệnh quan trọng

```bash
cd app
cp .env.example .env             # BẮT BUỘC điền: PAYLOAD_SECRET, MCP_TOKEN, POSTGRES_PASSWORD
npm install --legacy-peer-deps   # LUÔN dùng --legacy-peer-deps (payload peer conflicts)
npm run generate:types           # tạo src/payload-types.ts (cần trước khi build)
npm run dev                      # dev server :3000
npm run build                    # production build (phải pass không lỗi TS)
npx tsx src/seed.ts              # seed dữ liệu (idempotent — chạy lại không nhân bản)
```

**Docker (production):**
```bash
cd app   # hoặc dùng deploy.sh ở repo root
docker compose --profile tunnel up -d --build      # app + postgres + cloudflared
docker compose --profile tools run --rm seed       # seed lần đầu
docker compose logs -f app                          # xem log
docker compose pull && docker compose --profile tunnel up -d --build   # update
```

## 5. RUNBOOK TRIỂN KHAI PRODUCTION (nhiệm vụ chính)

Thực hiện tuần tự, kiểm tra từng bước:

1. **Kiểm tra môi trường**: Docker đã cài (`docker --version`)? Nếu chưa: `curl -fsSL https://get.docker.com | sudo sh` rồi `sudo usermod -aG docker $USER` (nhắc user đăng nhập lại).
2. **Tạo env**: `cd app && cp .env.example .env` — sinh giá trị mạnh: `openssl rand -hex 32` cho `PAYLOAD_SECRET` và `MCP_TOKEN`; đặt `POSTGRES_PASSWORD` mạnh; điền `TUNNEL_TOKEN` (chủ web lấy từ Cloudflare dashboard → Zero Trust → Networks → Tunnels → tạo tunnel kiểu Cloudflared → copy token). Nếu chưa có token, vẫn deploy được (bỏ profile tunnel), báo chủ web cung cấp sau.
3. **Build + chạy**: `docker compose --profile tunnel up -d --build` (nếu có token) hoặc không profile. Kiểm tra: `docker compose ps` (db healthy, app running), `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → phải 200.
4. **Seed**: `docker compose --profile tools run --rm seed`. Kết quả mong đợi: tạo admin + 4 danh mục + 13 sản phẩm + 2 tin + 9 trang. Chạy lại sẽ bỏ qua (idempotent).
5. **Tunnel hostname** (cần Cloudflare dashboard của chủ web HOẶC API token): Public Hostname `vienthongngason.com` + `www` → service `http://app:3000`. Nếu dùng Cloudflare API: tạo CNAME proxied `@` và `www` → `<tunnel-id>.cfargotunnel.com`.
6. **Kiểm tra public**: `curl -s -o /dev/null -w '%{http_code}' https://vienthongngason.com` → 200. Kiểm tra `/sitemap.xml`, `/robots.txt`, `/admin` (→ redirect login), `/shop`.
7. **Bảo mật admin** (khuyến nghị mạnh): Zero Trust → Access controls → Applications → self-hosted app cho path `vienthongngason.com/admin` (chỉ email chủ web, IdP One-time PIN).
8. **Đăng ký MCP**: Zero Trust → Access controls → AI controls → MCP servers → Add: URL `https://vienthongngason.com/mcp`, auth **Bearer** = giá trị `MCP_TOKEN` trong `app/.env`, Access policy cho email chủ web. (Tùy chọn: gom vào MCP portal `mcp.vienthongngason.com`.)
9. **SEO sau live**: xác minh `https://vienthongngason.com/sitemap.xml` reachable → hướng dẫn chủ web đăng ký Google Search Console + Google Business Profile.
10. **Backup**: tạo cron hằng ngày: `docker compose exec db pg_dump -U vtngason vtngason | gzip > ~/backups/db-$(date +\%F).sql.gz` + volume `app_media`.

## 6. Quy ước code (bắt buộc giữ nguyên khi sửa)

- **Ngôn ngữ nội dung**: tiếng Việt. UI text tiếng Việt. Đừng dịch code/comments.
- **Line endings LF** (repo có `.gitattributes`).
- **Không thêm comment vào code** trừ khi được yêu cầu.
- **Màu thương hiệu**: primary `#1565c0`, navy `#0d47a1`, vàng nhấn `#ffd200`, giá đỏ `#e53935` — khai báo trong `src/styles/globals.css` (`:root`).
- **Giá sản phẩm**: số nguyên VND (không thập phân), hiển thị qua `formatPrice()`.
- **Slug**: chữ thường, không dấu, gạch ngang (vd `internet-cap-quang`).
- **npm install luôn kèm `--legacy-peer-deps`**.
- **Đổi adapter DB**: chỉ qua env `DATABASE_ADAPTER` — đừng sửa `payload.config.ts`.
- **`npx payload run` bị lỗi im lặng trên Windows** → dùng `npx tsx src/seed.ts` (trên Linux cả hai được, nhưng cứ dùng tsx cho nhất quán).
- **Seed idempotent**: luôn check tồn tại theo slug trước khi create.

## 7. Lỗi đã gặp & cách xử lý (đừng lặp lại)

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `ERR_REQUIRE_ASYNC_MODULE` khi chạy payload CLI | Thiếu `"type": "module"` trong package.json | Đã fix — giữ nguyên |
| Admin `/admin` crash `Maximum call stack size exceeded` | Hàm local trùng tên import (`RootLayout`) | Đã fix bằng alias `PayloadRootLayout` |
| `RootLayout is not a function` từ `@payloadcms/next/views` | API đổi: RootLayout nằm ở `@payloadcms/next/layouts`, cần props `config` + `serverFunction` | Đã fix theo template chính thức Payload |
| `generatePayloadViewport` not exported | Không tồn tại trong version này | Đã bỏ — đừng thêm lại |
| TS error `string | null` không gán vào `string | undefined` | Payload types trả null cho upload/text fields | Dùng pattern `const x = field && typeof field === 'object' ? field.url : null` |
| Build lỗi type Product/Media relationship | Relationship có thể là number (chưa populate) | Dùng `depth: 1` khi find + typeof check |
| Trang danh mục trắng (bản WordPress cũ) | WC "Coming soon" mode | Không còn relevant (đã bỏ WP) nhưng ghi nhớ: WC mới luôn bật coming-soon sau cài |

## 8. Checklist xác minh sau deploy

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://vienthongngason.com                 # 200
curl -s https://vienthongngason.com | grep -c 'FTTH\|Camera IP'                      # > 0
curl -s -o /dev/null -w '%{http_code}\n' https://vienthongngason.com/shop            # 200
curl -s -o /dev/null -w '%{http_code}\n' https://vienthongngason.com/admin           # 200 hoặc 30x
curl -s -o /dev/null -w '%{http_code}\n' https://vienthongngason.com/sitemap.xml     # 200
curl -s -X POST https://vienthongngason.com/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' -o /dev/null -w '%{http_code}\n'  # 401 (chưa token)
curl -s -X POST https://vienthongngason.com/api/register -H 'Content-Type: application/json' \
  -d '{"name":"Test Deploy","phone":"0912345678","service":"internet"}'              # JSON thành công
```

Form test tạo đơn → vào `/admin` (Đăng ký dịch vụ) thấy đơn → xóa đơn test.

## 9. Việc chưa làm / backlog

- [ ] Logo thật: chủ web cung cấp `assets/brand/logo.png` → upload qua `/admin` (Settings → Logo) hoặc copy vào volume `app_media`
- [ ] Đổi mật khẩu admin mặc định sau seed
- [ ] Ảnh sản phẩm thật (đang là placeholder PNG màu thương hiệu — thay qua /admin)
- [ ] Thông báo đơn đăng ký realtime qua Telegram/Zalo OA bot (hiện chỉ lưu DB)
- [ ] Tra cứu hóa đơn (cần API nhà cung cấp)
- [ ] MCP Portal `mcp.vienthongngason.com` (tùy chọn nâng cao)
