// Nội dung báo kết quả cho ứng viên (tin nhắn Zalo/SMS + trang tra cứu)
import { APP_URL } from '../config.js'

export const TAC_PHONG_MAC_DINH = [
  'Trang phục gọn gàng, lịch sự',
  'Áo thun hoặc áo sơ mi',
  'Quần tây hoặc quần jean lịch sự',
  'Giày/sandal màu đen, cao 3–5 cm'
]

export const MAC_DINH_TIN_DAT = `Chào {ten}, Nón Sơn chúc mừng bạn đã TRÚNG TUYỂN vị trí {vi_tri}!

Thông tin nhận việc:
• Cửa hàng: {cua_hang}
• Địa chỉ: {dia_chi}
• Thời gian: {gio} {thu}, ngày {ngay}
{ghi_chu}
Tác phong khi đến nhận việc:
{tac_phong}

Xem lại thông tin: {link}
Hẹn gặp bạn tại cửa hàng!`

export const MAC_DINH_TIN_KHONG_DAT = `Chào {ten}, cảm ơn bạn đã dành thời gian ứng tuyển vị trí {vi_tri} tại Nón Sơn.

Sau khi cân nhắc kỹ, lần này hồ sơ của bạn chưa phù hợp với yêu cầu hiện tại. Đây không phải là đánh giá về năng lực của bạn — Nón Sơn sẽ lưu hồ sơ và liên hệ khi có vị trí phù hợp hơn.

Chúc bạn nhiều sức khỏe và sớm tìm được công việc ưng ý!`

export const DONG_VIEN = 'Mỗi lần ứng tuyển là một bước trưởng thành. Nón Sơn trân trọng thời gian và sự quan tâm của bạn, và sẽ lưu hồ sơ để liên hệ khi có vị trí phù hợp hơn. Chúc bạn sớm tìm được công việc ưng ý!'

export function dsTacPhong(gt) {
  const ds = Array.isArray(gt) ? gt : String(gt || '').split('\n')
  const sach = ds.map((x) => String(x).trim()).filter(Boolean)
  return sach.length ? sach : TAC_PHONG_MAC_DINH
}

const THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
function ngayVi(iso) {
  if (!iso) return { thu: '', ngay: '' }
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { thu: THU[t].toLowerCase(), ngay: String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + y }
}

// h: hồ sơ (ho_ten, vi_tri, ma) · nv: { ngay_nhan_viec, gio_nhan_viec, ghi_chu_nhan_viec } · ch: cửa hàng { ten, dia_chi }
export function tinDat(mau, h, nv, ch, tacPhong) {
  const { thu, ngay } = ngayVi(nv?.ngay_nhan_viec)
  return (mau || MAC_DINH_TIN_DAT)
    .replaceAll('{ten}', h?.ho_ten || '')
    .replaceAll('{vi_tri}', h?.vi_tri || '')
    .replaceAll('{cua_hang}', ch?.ten || h?.noi_lam_viec || '')
    .replaceAll('{dia_chi}', ch?.dia_chi || '')
    .replaceAll('{gio}', String(nv?.gio_nhan_viec || '').slice(0, 5))
    .replaceAll('{thu}', thu)
    .replaceAll('{ngay}', ngay)
    .replaceAll('{ghi_chu}', nv?.ghi_chu_nhan_viec ? '• Lưu ý: ' + nv.ghi_chu_nhan_viec + '\n' : '')
    .replaceAll('{tac_phong}', dsTacPhong(tacPhong).map((x) => '• ' + x).join('\n'))
    .replaceAll('{link}', APP_URL + 'tra-cuu?ma=' + encodeURIComponent(h?.ma || ''))
}

export function tinKhongDat(mau, h) {
  return (mau || MAC_DINH_TIN_KHONG_DAT)
    .replaceAll('{ten}', h?.ho_ten || '')
    .replaceAll('{vi_tri}', h?.vi_tri || '')
    .replaceAll('{link}', APP_URL + 'tra-cuu?ma=' + encodeURIComponent(h?.ma || ''))
}
