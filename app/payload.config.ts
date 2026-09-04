import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'

import { Users } from './src/collections/Users'
import { Media } from './src/collections/Media'
import { Categories } from './src/collections/Categories'
import { Products } from './src/collections/Products'
import { Posts } from './src/collections/Posts'
import { ServiceRequests } from './src/collections/ServiceRequests'
import { Pages } from './src/collections/Pages'
import { Settings } from './src/globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const usePostgres = process.env.DATABASE_ADAPTER === 'postgres'

// Chi bat SMTP that khi da cau hinh day du. Neu thieu, Payload dung adapter mac dinh
// (in email ra console) - tranh crash khi build hoac chay dev.
const smtpHost = process.env.SMTP_HOST
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const useSmtp = Boolean(smtpHost && smtpUser && smtpPass)
const smtpPort = Number(process.env.SMTP_PORT ?? 587)

export default buildConfig({
  // Bat buoc de link trong email (reset password, verify) la URL tuyet doi.
  // Thieu serverURL -> Payload sinh link dang "/admin/reset/<token>" khong bam duoc.
  serverURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  admin: {
    meta: {
      titleSuffix: ' — Quản trị Viễn Thông Nga Sơn',
    },
    components: {
      // Thay man hinh mac dinh cua Payload bang bang dieu khien rieng.
      views: {
        dashboard: {
          Component: '@/components/admin/Dashboard#default',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname, './src'),
    },
  },
  collections: [Users, Media, Categories, Products, Posts, ServiceRequests, Pages],
  globals: [Settings],
  editor: lexicalEditor(),
  email: useSmtp
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@vienthongngason.com',
        defaultFromName: process.env.EMAIL_FROM_NAME ?? 'Vien Thong Nga Son',
        transportOptions: {
          host: smtpHost,
          port: smtpPort,
          // 465 = SMTPS (TLS ngay tu dau), 587 = STARTTLS
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        },
      })
    : undefined,
  db: usePostgres
    ? postgresAdapter({
        pool: { connectionString: process.env.DATABASE_URI ?? '' },
      })
    : sqliteAdapter({
        client: { url: process.env.DATABASE_URI ?? 'file:./vtngason.db' },
      }),
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-change-me',
  typescript: {
    outputFile: path.resolve(dirname, './src/payload-types.ts'),
  },
  sharp,
  telemetry: false,
  upload: {
    limits: { fileSize: 10 * 1024 * 1024 },
  },
})
