import type { CollectionConfig } from 'payload'
import { safeRevalidateTag } from '@/lib/revalidate'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Bài viết', plural: 'Tin tức' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'publishedAt'] },
  access: { read: () => true },
  // Xoa cache runtime khi dang/sua bai viet.
  hooks: {
    afterChange: [() => { safeRevalidateTag('posts') }],
    afterDelete: [() => { safeRevalidateTag('posts') }],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tiêu đề' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug', admin: { position: 'sidebar' } },
    { name: 'excerpt', type: 'textarea', label: 'Mô tả ngắn (SEO)' },
    { name: 'content', type: 'richText', label: 'Nội dung' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Ảnh đại diện' },
    { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } }, label: 'Ngày đăng', defaultValue: () => new Date() },
  ],
}
