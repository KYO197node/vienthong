import type { CollectionConfig } from 'payload'
import { safeRevalidateTag } from '@/lib/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Danh mục', plural: 'Danh mục sản phẩm' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug'] },
  access: { read: () => true },
  // Xoa cache runtime khi sua danh muc, neu khong menu/trang chu phai doi 300s.
  hooks: {
    afterChange: [() => { safeRevalidateTag('categories') }],
    afterDelete: [() => { safeRevalidateTag('categories') }],
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Tên danh mục' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug (vd: internet-cap-quang)', admin: { position: 'sidebar' } },
    { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Danh mục cha', admin: { position: 'sidebar' } },
    { name: 'description', type: 'textarea', label: 'Mô tả (SEO)' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Ảnh danh mục' },
    { name: 'order', type: 'number', defaultValue: 0, label: 'Thứ tự hiển thị', admin: { position: 'sidebar' } },
  ],
}
