import { ShoppingBag, Users, Factory, Store, Warehouse, Truck, Scissors, Briefcase, Video, Headphones, Package, Sparkles } from 'lucide-react'

// Biểu tượng cho vị trí tuyển (lưu mã ngắn trong CSDL)
export const ICON_VI_TRI = {
  tui: { ic: ShoppingBag, ten: 'Bán hàng' },
  nguoi: { ic: Users, ten: 'Cộng tác' },
  xuong: { ic: Factory, ten: 'Xưởng' },
  cua_hang: { ic: Store, ten: 'Cửa hàng' },
  kho: { ic: Warehouse, ten: 'Kho' },
  xe: { ic: Truck, ten: 'Giao hàng' },
  may: { ic: Scissors, ten: 'May mặc' },
  van_phong: { ic: Briefcase, ten: 'Văn phòng' },
  live: { ic: Video, ten: 'Livestream' },
  cskh: { ic: Headphones, ten: 'CSKH' },
  dong_goi: { ic: Package, ten: 'Đóng gói' },
  khac: { ic: Sparkles, ten: 'Khác' }
}
export const iconViTri = (ma) => (ICON_VI_TRI[ma] || ICON_VI_TRI.khac).ic
