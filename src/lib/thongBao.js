// Nội dung báo kết quả cho ứng viên (tin nhắn Zalo/SMS + trang tra cứu)
import { APP_URL } from '../config.js'

export const TAC_PHONG_NU = [
  'Áo thun / sơ mi đơn giản, ưu tiên màu trắng',
  'Quần jean / quần tây dài tối màu, không rách, đóng thùng',
  'Giày sandal màu đen, gót cao từ 3–5 cm',
  'Tóc gọn gàng, trang điểm nhẹ'
]
export const TAC_PHONG_NAM = [
  'Áo thun / sơ mi đơn giản, ưu tiên màu trắng',
  'Quần jean / quần tây dài tối màu (không rách, không xẻ)',
  'Giày sneaker hoặc sandal'
]
export const TAC_PHONG_MAC_DINH = TAC_PHONG_NU
export const LUU_Y_NHAN_VIEC = [
  'Mang theo hồ sơ xin việc và CMND/CCCD bản gốc',
  'Vui lòng đưa tin nhắn này cho nhân viên cửa hàng để được xác nhận thông tin',
  'Mọi thắc mắc, bạn vui lòng để lại tin nhắn để Phòng Tuyển dụng hồi âm sớm nhất'
]

export const MAC_DINH_TIN_DAT = `NÓN SƠN
Chào {xung_ho} {ten}, chúc mừng {xung_ho} đã trúng tuyển vị trí {vi_tri}! Dưới đây là thông tin dành cho {xung_ho}:
1. Ngày hội nhập: {thu}, {ngay}
2. Ca làm việc ngày đầu tiên: {ca}
3. Cửa hàng: {cua_hang}
4. Địa chỉ: {dia_chi}
{ban_do}5. Trang phục:
{tac_phong}
6. Lưu ý:
{luu_y}{ghi_chu}
Xem lại thông tin: {link}
Cảm ơn {xung_ho} đã ứng tuyển vào Nón Sơn — hẹn gặp {xung_ho}!`

export const MAC_DINH_TIN_KHONG_DAT = `Chào {ten}, cảm ơn bạn đã dành thời gian ứng tuyển vị trí {vi_tri} tại Nón Sơn.

Sau khi cân nhắc kỹ, lần này hồ sơ của bạn chưa phù hợp với yêu cầu hiện tại. Đây không phải là đánh giá về năng lực của bạn — Nón Sơn sẽ lưu hồ sơ và liên hệ khi có vị trí phù hợp hơn.

Chúc bạn nhiều sức khỏe và sớm tìm được công việc ưng ý!`

export const DONG_VIEN = 'Mỗi lần ứng tuyển là một bước trưởng thành. Nón Sơn trân trọng thời gian và sự quan tâm của bạn, và sẽ lưu hồ sơ để liên hệ khi có vị trí phù hợp hơn. Chúc bạn sớm tìm được công việc ưng ý!'

export function dsTacPhong(gt, macDinh = TAC_PHONG_MAC_DINH) {
  const ds = Array.isArray(gt) ? gt : String(gt || '').split('\n')
  const sach = ds.map((x) => String(x).trim()).filter(Boolean)
  return sach.length ? sach : macDinh
}
export const laNam = (gioiTinh) => String(gioiTinh || '').toLowerCase() === 'nam'
export function tacPhongTheo(gioiTinh, caiDat = {}) {
  return laNam(gioiTinh) ? dsTacPhong(caiDat.tac_phong_nam, TAC_PHONG_NAM) : dsTacPhong(caiDat.tac_phong_nu, TAC_PHONG_NU)
}
export const gioiTinhHS = (h) => h?.gioi_tinh || h?.tra_loi_them?.['Giới tính'] || ''

const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
function ngayVi(iso) {
  if (!iso) return { thu: '', ngay: '' }
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { thu: THU[t], ngay: String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + y }
}
const banDoCH = (ch) => (ch?.lat != null && ch?.lng != null ? 'https://www.google.com/maps/search/?api=1&query=' + ch.lat + ',' + ch.lng : '')

// h: hồ sơ · nv: { ngay_nhan_viec, gio_nhan_viec, gio_ket_thuc, gioi_tinh, ghi_chu_nhan_viec } · ch: cửa hàng · caiDat: s.dm.caiDat
export function tinDat(mau, h, nv, ch, caiDat = {}) {
  const { thu, ngay } = ngayVi(nv?.ngay_nhan_viec)
  const gt = nv?.gioi_tinh || gioiTinhHS(h)
  const xh = laNam(gt) ? 'anh' : gt ? 'chị' : 'bạn'
  const bd = String(nv?.gio_nhan_viec || '').slice(0, 5)
  const kt = String(nv?.gio_ket_thuc || '').slice(0, 5)
  const bdo = banDoCH(ch)
  return (mau || MAC_DINH_TIN_DAT)
    .replaceAll('{xung_ho}', xh)
    .replaceAll('{ten}', h?.ho_ten || '')
    .replaceAll('{vi_tri}', h?.vi_tri || '')
    .replaceAll('{cua_hang}', ch?.ten || h?.noi_lam_viec || '')
    .replaceAll('{dia_chi}', ch?.dia_chi || '')
    .replaceAll('{ban_do}', bdo ? '   Bản đồ: ' + bdo + '\n' : '')
    .replaceAll('{ca}', bd + (kt ? ' – ' + kt : ''))
    .replaceAll('{gio}', bd)
    .replaceAll('{thu}', thu)
    .replaceAll('{ngay}', ngay)
    .replaceAll('{ghi_chu}', nv?.ghi_chu_nhan_viec ? '\n- ' + nv.ghi_chu_nhan_viec : '')
    .replaceAll('{tac_phong}', tacPhongTheo(gt, caiDat).map((x) => '- ' + x).join('\n'))
    .replaceAll('{luu_y}', LUU_Y_NHAN_VIEC.map((x) => '- ' + x.replace('bạn vui lòng', xh + ' vui lòng')).join('\n'))
    .replaceAll('{link}', APP_URL + 'tra-cuu?ma=' + encodeURIComponent(h?.ma || ''))
}

export function tinKhongDat(mau, h) {
  return (mau || MAC_DINH_TIN_KHONG_DAT)
    .replaceAll('{ten}', h?.ho_ten || '')
    .replaceAll('{vi_tri}', h?.vi_tri || '')
    .replaceAll('{link}', APP_URL + 'tra-cuu?ma=' + encodeURIComponent(h?.ma || ''))
}
