@echo off
title Viễn Thông Nga Sơn - Dev Server
cd /d "%~dp0app"

if not exist .env (
  echo [!] Chua co file .env - tao tu .env.example...
  copy .env.example .env >nul
)

if not exist node_modules (
  echo [!] Chua cai dependencies - dang cai (vai phut)...
  call npm install --legacy-peer-deps
)

if not exist src\payload-types.ts (
  echo [!] Tao types...
  call npx payload generate:types
)

echo Dang khoi dong dev server: http://localhost:3000
start "VTNS-Dev" cmd /c "npm run dev"
timeout /t 15 /nobreak >nul
start "" http://localhost:3000
echo.
echo Web:  http://localhost:3000
echo Admin: http://localhost:3000/admin  (admin@vienthongngason.com)
echo        Mat khau: lay tu SEED_ADMIN_PASSWORD trong app\.env
echo Dong cua so VTNS-Dev de tat server.
pause
