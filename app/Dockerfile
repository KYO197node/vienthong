FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
# Build voi SQLite (khong can Postgres luc build); production chuyen bang env
ENV DATABASE_ADAPTER=sqlite
ENV DATABASE_URI=file:./vtngason.db
# Seed nay chi de tao schema SQLite tam cho `next build`. DB va admin user o day
# BI HUY, khong duoc copy sang stage runner -> dung mat khau ngau nhien dung 1 lan.
RUN mkdir -p ../content \
    && SEED_ADMIN_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")" \
       npx -y tsx src/seed.ts
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# Xoa cache sinh luc build: `next build` chay voi SQLite nen fetch-cache chua
# du lieu cua DB build-time. Neu giu lai, runtime se doc cache SQLite cu thay vi
# truy van Postgres -> danh muc/san pham hien sai. Cache webpack/swc cung chi
# can luc build, bo di giam dung luong image ~366MB.
RUN rm -rf /app/.next/cache
# Media uploads (neu co)
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["./node_modules/.bin/next", "start"]
