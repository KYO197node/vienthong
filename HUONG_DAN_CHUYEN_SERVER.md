# HƯỚNG DẪN CHUYỂN WEB SANG MÁY CHỦ UBUNTU (cho chủ website)

> Bạn không cần hiểu kỹ thuật — chỉ cần làm theo từng bước. Phần khó sẽ để **Codex** tự làm.

---

## BƯỚC 1 — Chuyển file sang server

File gói đã tạo sẵn: **`vienthongngason-package.tar.gz`** (nằm cạnh thư mục web trên máy Windows).

Chọn 1 trong 2 cách:

**Cách A — qua mạng (khuyên dùng, cần biết IP + user của server):**
Mở PowerShell/terminal trên máy Windows:
```bash
scp D:\vienthongngason-package.tar.gz user@IP_SERVER:/home/user/
```

**Cách B — qua USB:** copy file `vienthongngason-package.tar.gz` vào USB, cắm vào server, copy ra `/home/user/`.

## BƯỚC 2 — Giải nén trên server

SSH vào server (hoặc gõ trực tiếp nếu đang ngồi trước máy):
```bash
cd /home/user
tar -xzf vienthongngason-package.tar.gz
cd vienthongngason
```

## BƯỚC 3 — Cài Codex CLI trên server (nếu chưa có)

```bash
npm install -g @openai/codex     # cần Node 20+: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
codex login                       # đăng nhập tài khoản OpenAI
```

## BƯỚC 4 — Chạy Codex và giao việc

```bash
cd /home/user/vienthongngason
codex
```

Trong Codex, gõ (copy nguyên văn):
```
Đọc file AGENTS.md rồi triển khai production website theo runbook mục 5. Server này là máy chủ production, domain vienthongngason.com. Báo tôi khi cần TUNNEL_TOKEN từ Cloudflare dashboard.
```

Codex sẽ tự: kiểm tra Docker → tạo `.env` với mật khẩu mạnh → build → chạy web → seed dữ liệu → hướng dẫn các bước cần bạn bấm trên Cloudflare dashboard.

## BƯỚC 5 — Những thứ CHỈ bạn làm được (Codex sẽ nhắc khi đến bước này)

| Việc | Ở đâu |
|------|-------|
| Đăng ký domain vào Cloudflare (nếu chưa) | dash.cloudflare.com → Add site |
| Tạo Tunnel + copy **TUNNEL_TOKEN** | Zero Trust → Networks → Tunnels → Create tunnel |
| Trỏ Public Hostname `vienthongngason.com` + `www` → `http://app:3000` | Trong cấu hình tunnel |
| Bật Access bảo vệ `/admin` | Zero Trust → Access controls → Applications |
| Đăng ký MCP server | Zero Trust → AI controls → MCP servers |

## Sau khi live — làm ngay

1. Đăng nhập `https://vienthongngason.com/admin` — **đổi mật khẩu admin**
2. Vào **Settings** (Payload admin) — sửa hotline, Zalo, địa chỉ thật
3. Upload logo thật (Settings → Logo)
4. Đăng ký **Google Search Console** + **Google Business Profile**
5. Thông báo đơn đăng ký test → xóa đơn test trong admin

---

## Nếu gặp lỗi

- Chụp màn hình lỗi → hỏi lại Codex trong phiên: `Lỗi X, hãy xử lý theo AGENTS.md mục 7`
- Web truy cập không được → kiểm tra: `cd vienthongngason/app && docker compose ps && docker compose logs --tail 50 app`
- Mất TUNNEL_TOKEN → tạo lại tunnel mới trên Cloudflare, update `app/.env`, chạy `docker compose --profile tunnel up -d`
