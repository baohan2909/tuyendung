// Đoán khu vực kinh doanh Nón Sơn từ địa chỉ / khu vực mong muốn do ứng viên tự gõ.
// Bản đồ lấy theo cách công ty chia vùng cửa hàng (bảng cua_hang.khu_vuc).
import { khongDau } from './format'

export const KV_CHINH = ['Khu vực Hồ Chí Minh', 'Khu vực Đông Nam Bộ', 'Khu vực Tây Nam Bộ', 'Khu vực Trung Tây Nguyên', 'Khu vực Bắc Trung Bộ', 'Khu vực Hà Nội']
export const KV_CHUA_RO = 'Chưa rõ khu vực'
export const tenKV = (kv) => String(kv || '').replace(/^Khu vực /, '')

// Thứ tự kiểm tra quan trọng: vùng có địa danh dễ trùng được xét trước
const BANG = [
  ['Khu vực Tây Nam Bộ', ['can tho', 'ninh kieu', 'cai rang', 'o mon', 'binh thuy', 'thot not', 'soc trang', 'phu loi', 'bac lieu', 'ca mau', 'nam can', 'an xuyen', 'an giang', 'long xuyen', 'chau doc', 'cho moi', 'tan chau', 'kien giang', 'rach gia', 'phu quoc', 'ha tien', 'vinh long', 'long ho', 'tra vinh', 'ben tre', 'tien giang', 'my tho', 'cai lay', 'go cong', 'dong thap', 'cao lanh', 'sa dec', 'hong ngu', 'hau giang', 'vi thanh', 'nga bay', 'long an', 'tan an', 'ben luc', 'duc hoa', 'can giuoc', 'can duoc']],
  ['Khu vực Đông Nam Bộ', ['binh duong', 'di an', 'thuan an', 'thu dau mot', 'ben cat', 'tan uyen', 'dinh hoa', 'hoa loi', 'dong nai', 'bien hoa', 'long khanh', 'nhon trach', 'trang bom', 'tan trieu', 'long thanh', 'ba ria', 'vung tau', 'phu my', 'tay ninh', 'trang bang', 'go dau', 'hoa thanh', 'binh phuoc', 'dong xoai', 'chon thanh']],
  ['Khu vực Hồ Chí Minh', ['ho chi minh', 'hcm', 'sai gon', 'saigon', 'thu duc', 'go vap', 'binh thanh', 'tan binh', 'tan phu', 'binh tan', 'phu nhuan', 'hoc mon', 'cu chi', 'binh chanh', 'nha be', 'can gio', 'cat lai', 'trung my tay', 'tan thoi hiep', 'tan thoi nhi', 'xuan thoi', 'tang nhon phu', 'linh xuan', 'linh dong', 'an phu dong', 'phu dinh', 'an hoi', 'phu tho hoa', 'binh hung', 'thanh loc', 'tan phuoc']],
  ['Khu vực Hà Nội', ['ha noi', 'hanoi', 'cau giay', 'dong da', 'hoan kiem', 'ba dinh', 'hai ba trung', 'hoang mai', 'long bien', 'ha dong', 'tu liem', 'tay ho', 'yen hoa', 'tran duy hung', 'gia lam', 'dong anh', 'soc son', 'thanh tri']],
  ['Khu vực Bắc Trung Bộ', ['hai phong', 'hai an', 'bac ninh', 'quang ninh', 'ha long', 'nam dinh', 'ninh binh', 'thai binh', 'hai duong', 'hung yen', 'ha nam', 'thai nguyen', 'vinh phuc', 'phu tho', 'viet tri', 'bac giang', 'lang son', 'lao cai', 'yen bai', 'tuyen quang', 'hoa binh', 'son la', 'dien bien', 'thanh hoa', 'nghe an']],
  ['Khu vực Trung Tây Nguyên', ['ha tinh', 'quang binh', 'dong hoi', 'quang tri', 'thua thien', 'da nang', 'quang nam', 'hoi an', 'tam ky', 'quang ngai', 'binh dinh', 'quy nhon', 'phu yen', 'tuy hoa', 'khanh hoa', 'nha trang', 'dien khanh', 'cam ranh', 'ninh thuan', 'phan rang', 'binh thuan', 'phan thiet', 'lam dong', 'da lat', 'bao loc', 'dak lak', 'dac lac', 'daklak', 'buon ma thuot', 'ea kao', 'gia lai', 'pleiku', 'kon tum', 'dak nong', 'gia nghia', ' hue']]
]

const nho = new Map()
export function doanKhuVuc(chu) {
  if (!chu) return null
  if (nho.has(chu)) return nho.get(chu)
  const t = ' ' + khongDau(chu).toLowerCase().replace(/[.,;/()\-_]+/g, ' ').replace(/\s+/g, ' ') + ' '
  let kq = null
  for (const [kv, ds] of BANG) { if (ds.some((k) => t.includes(' ' + k.trim() + ' '))) { kq = kv; break } }
  if (!kq && /\s(q|quan)\s?\d{1,2}\s/.test(t)) kq = 'Khu vực Hồ Chí Minh'
  nho.set(chu, kq)
  return kq
}
