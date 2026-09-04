import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Trang', plural: 'Trang nội dung' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug'] },
  access: { read: () => true },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tiêu đề' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug', admin: { position: 'sidebar' } },
    { name: 'excerpt', type: 'textarea', label: 'Mô tả ngắn (SEO)' },
    { name: 'content', type: 'richText', label: 'Nội dung' },
  ],
}
