import type { GlobalConfig } from 'payload'
import { safeRevalidateTag } from '@/lib/revalidate'

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Cài đặt website',
  access: { read: () => true },
  hooks: {
    // Du lieu duoc cache 300s bang unstable_cache (lib/queries.ts). Neu khong
    // xoa cache sau khi luu, thay doi trong admin phai doi toi 5 phut moi hien.
    afterChange: [
      () => {
        safeRevalidateTag('settings')
      },
    ],
  },
  fields: [
    { name: 'siteName', type: 'text', defaultValue: 'Viễn Thông Nga Sơn', label: 'Tên website' },
    { name: 'slogan', type: 'text', defaultValue: 'Đồng hành cùng mọi nhà', label: 'Slogan' },
    { name: 'hotline', type: 'text', defaultValue: '0943.397.197', label: 'Hotline' },
    { name: 'zalo', type: 'text', defaultValue: 'https://zalo.me/0943397197', label: 'Link Zalo' },
    { name: 'messenger', type: 'text', defaultValue: 'https://web.facebook.com/vienthongngason', label: 'Link Messenger' },
    { name: 'address', type: 'text', defaultValue: 'Nga Sơn, Thanh Hóa', label: 'Địa chỉ' },
    { name: 'email', type: 'email', defaultValue: 'vienthongngason@gmail.com', label: 'Email' },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
    {
      name: 'partnerLogo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo VNPT/VinaPhone',
      admin: {
        description:
          'Upload logo VNPT chính thức (PNG nền trong suốt, tối thiểu 400px rộng). Hiển thị ở header, footer và làm watermark banner. Để trống thì không hiện.',
      },
    },
    {
      name: 'partnerLabel',
      type: 'text',
      defaultValue: '',
      label: 'Chú thích cạnh logo VNPT (tuỳ chọn)',
      admin: { description: 'Để trống nếu bạn là nhân viên VNPT chính thức — logo VNPT vẫn hiển thị mà không kèm chữ.' },
    },
    {
      name: 'partnerWatermark',
      type: 'checkbox',
      defaultValue: true,
      label: 'Hiện logo đối tác làm hình nền mờ ở banner trang chủ',
    },
    {
      name: 'heroSlides',
      type: 'array',
      label: 'Banner trang chủ (slider)',
      defaultValue: [
        { title: 'Internet Cáp Quang Tốc Độ Cao', description: 'Lắp đặt trọn gói tại Nga Sơn, Thanh Hóa — khảo sát miễn phí, lắp nhanh trong 24 giờ.', link: '/dang-ky', buttonText: 'Đăng ký lắp ngay' },
        { title: 'Camera An Ninh — Xem Từ Xa Trên Điện Thoại', description: 'Camera chính hãng, bảo hành 12–24 tháng, kỹ thuật hỗ trợ tận nhà.', link: '/danh-muc/camera-an-ninh', buttonText: 'Xem camera' },
        { title: 'Sim 4G/5G — TV Box Truyền Hình', description: 'Gói cước dung lượng lớn, TV Box hàng trăm kênh — giá tốt nhất khu vực.', link: '/danh-muc/sim-goi-cuoc', buttonText: 'Xem ưu đãi' },
      ],
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Tiêu đề' },
        { name: 'description', type: 'textarea', label: 'Mô tả' },
        { name: 'link', type: 'text', label: 'Link nút' },
        { name: 'buttonText', type: 'text', label: 'Chữ nút' },
      ],
    },
  ],
}
