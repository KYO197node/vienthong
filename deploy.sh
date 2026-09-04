#!/usr/bin/env bash
# ==============================================================
# Deploy vienthongngason.com (Next.js + Payload + PostgreSQL)
# Chay tren server Ubuntu, tu thu muc repo:
#   tr -d '\r' < deploy.sh > /tmp/deploy.sh && bash /tmp/deploy.sh
# ==============================================================
set -euo pipefail
cd "$(dirname "$0")"

D="docker"
if ! $D info >/dev/null 2>&1; then
  D="sudo docker"
fi
DC="$D compose --env-file app/.env -f app/docker-compose.yml"

echo "==> [1/7] Kiem tra Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "    - Chua co Docker, tu dong cai..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
  D="sudo docker"
  DC="$D compose --env-file app/.env -f app/docker-compose.yml"
fi
$D --version

echo "==> [2/7] Tao app/.env (neu chua co)"
if [ ! -f app/.env ]; then
  cp app/.env.example app/.env
  PGPASS=$(openssl rand -hex 16)
  SECRET=$(openssl rand -hex 32)
  MCPTOK=$(openssl rand -hex 32)
  # Mat khau admin sinh ngau nhien, khong con gia tri mac dinh doan duoc.
  ADMINPASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PGPASS|" app/.env 2>/dev/null || echo "POSTGRES_PASSWORD=$PGPASS" >> app/.env
  sed -i "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$SECRET|" app/.env
  sed -i "s|^MCP_TOKEN=.*|MCP_TOKEN=$MCPTOK|" app/.env
  sed -i "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$ADMINPASS|" app/.env 2>/dev/null || echo "SEED_ADMIN_PASSWORD=$ADMINPASS" >> app/.env
  chmod 600 app/.env
  echo "    ############################################"
  echo "    LUU LAI NGAY (chi hien 1 lan):"
  echo "    MCP_TOKEN:           $MCPTOK"
  echo "    Mat khau admin:      $ADMINPASS"
  echo "    ############################################"
  read -r -p "    TUNNEL_TOKEN (Enter de bo qua): " TTOK || true
  if [ -n "${TTOK:-}" ]; then
    echo "TUNNEL_TOKEN=$TTOK" >> app/.env
  fi
fi

echo "==> [3/7] Build + khoi dong stack"
TUNNEL_VAL=$(grep '^TUNNEL_TOKEN=' app/.env | cut -d= -f2- | tr -d '[:space:]' || true)
if [ ${#TUNNEL_VAL} -gt 10 ]; then
  $DC --profile tunnel up -d --build
  echo "    - app + postgres + cloudflared da chay"
else
  $DC up -d --build
  echo "    - chua co TUNNEL_TOKEN: chi chay app + postgres"
  echo "      (Zero Trust > Networks > Tunnels > tao tunnel > copy token vao app/.env roi chay lai)"
fi

echo "==> [4/7] Cho app san sang"
for i in $(seq 1 40); do
  if $DC exec -T app node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "    - App da san sang!"
    break
  fi
  sleep 3
done

echo "==> [5/7] Chay migration database"
# Bat buoc chay truoc khi seed: khi them field moi vao collection/global, schema
# Postgres phai duoc cap nhat, neu khong moi truy van se loi "column does not exist".
$DC --profile tools run --rm seed npx payload migrate || {
  echo "    !! Migration loi. Kiem tra log truoc khi tiep tuc."
  exit 1
}

echo "==> [6/7] Seed du lieu lan dau (tao admin + san pham + noi dung)"
$DC --profile tools run --rm seed || echo "    - Seed loi hoac da ton tai (kiem tra log neu can)"

echo "==> [7/7] HOAN TAT!"
echo ""
echo "---------------- TIEP THEO ----------------"
echo "1. Cloudflare Tunnel > Public Hostname:"
echo "   vienthongngason.com + www  ->  http://app:3000"
echo "2. Web:  https://vienthongngason.com"
echo "   Admin: https://vienthongngason.com/admin"
echo "3. Zero Trust Access bao ve /admin (khuyen nghi)"
echo "4. Dang ky MCP: AI Controls > MCP servers >"
echo "   https://vienthongngason.com/mcp (Bearer MCP_TOKEN)"
echo "-------------------------------------------"
