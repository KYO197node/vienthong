import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Ảnh', plural: 'Thư viện ảnh' },
  access: { read: () => true },
  upload: {
    staticDir: process.env.MEDIA_DIR || 'media',
    mimeTypes: ['image/*'],
  },
  admin: { useAsTitle: 'filename' },
  fields: [
    { name: 'alt', type: 'text', label: 'Mô tả ảnh (alt)' },
  ],
}
