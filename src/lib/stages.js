// Giai đoạn hồ sơ (nội bộ) — thứ tự, nhãn, màu
export const GIAI_DOAN = [
  { ma: 'moi', ten: 'Chờ xử lý', ngan: 'Chờ xử lý', bg: '#FDE6F1', fg: '#A3004F', cham: '#E0157E' },
  { ma: 'sang_loc', ten: 'Đã xem hồ sơ', bg: '#FDF3E3', fg: '#8A5410', cham: '#D98A1C', cu: true },
  { ma: 'hen_pv', ten: 'Phỏng vấn', ngan: 'Phỏng vấn', bg: '#EAF0FD', fg: '#2E5BC9', cham: '#3B6FE0' },
  { ma: 'da_pv', ten: 'Đã PV', bg: '#EFE8FB', fg: '#5B2A9E', cham: '#7B2CBF', cu: true },
  { ma: 'de_xuat', ten: 'Đề xuất', bg: '#E1F3F6', fg: '#0F6375', cham: '#1590A8', cu: true },
  { ma: 'dat', ten: 'Trúng tuyển', bg: '#E3F5EE', fg: '#0E7F63', cham: '#12A37F' },
  { ma: 'nhan_viec', ten: 'Nhận việc', bg: '#17111A', fg: '#FFFFFF', cham: '#17111A' },
  { ma: 'du_bi', ten: 'Dự bị', bg: '#EEF1F5', fg: '#475A70', cham: '#7A8CA3', cu: true },
  { ma: 'khong_dat', ten: 'Không đạt', bg: '#F4F1F5', fg: '#8C8494', cham: '#B9B2BF' },
  { ma: 'rut', ten: 'Rút hồ sơ', bg: '#F4F1F5', fg: '#8C8494', cham: '#B9B2BF' }
]
export const GD = Object.fromEntries(GIAI_DOAN.map((g) => [g.ma, g]))
export const GD_DANG_XU_LY = ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat']
export const GD_COT = ['moi', 'hen_pv', 'dat', 'nhan_viec']
export const GD_KET_THUC = ['khong_dat', 'rut']
export const GD_SANG_LOC = ['moi', 'sang_loc']
// Còn mở: có thể bấm Phỏng vấn / Loại
export const GD_MO = ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat', 'du_bi']
export const GD_PHONG_VAN = ['hen_pv', 'da_pv', 'de_xuat']
export const NV_TT = {
  thu_viec: { ten: 'Thử việc', bg: '#FDF3E3', fg: '#8A5410' },
  chinh_thuc: { ten: 'Chính thức', bg: '#E3F5EE', fg: '#0E7F63' },
  nghi_viec: { ten: 'Nghỉ việc', bg: '#F4F1F5', fg: '#8C8494' }
}
export const GT_TT = {
  chua_nop: { ten: 'Chưa nộp', bg: '#F4F1F5', fg: '#8C8494' },
  da_nop: { ten: 'Đã nộp', bg: '#EAF0FD', fg: '#2E5BC9' },
  da_duyet: { ten: 'Đã duyệt', bg: '#E3F5EE', fg: '#0E7F63' },
  can_bo_sung: { ten: 'Cần bổ sung', bg: '#FDECEC', fg: '#B93838' }
}

export const VAI_TRO = {
  quan_tri: 'Quản trị',
  tuyen_dung: 'Tuyển dụng',
  phong_van: 'Phỏng vấn',
  xem: 'Chỉ xem'
}

export const LICH_TT = {
  cho_xac_nhan: { ten: 'Chờ xác nhận', bg: '#FDF3E3', fg: '#8A5410' },
  da_xac_nhan: { ten: 'Đã xác nhận', bg: '#E3F5EE', fg: '#0E7F63' },
  xin_doi: { ten: 'Xin đổi lịch', bg: '#FDECEC', fg: '#B93838' },
  da_dien_ra: { ten: 'Đã phỏng vấn', bg: '#EFE8FB', fg: '#5B2A9E' },
  vang_mat: { ten: 'Vắng mặt', bg: '#F4F1F5', fg: '#8C8494' },
  huy: { ten: 'Đã hủy', bg: '#F4F1F5', fg: '#8C8494' }
}
export const HINH_THUC = { truc_tiep: 'Trực tiếp', online: 'Online', dien_thoai: 'Điện thoại' }
export const KET_LUAN = {
  dat: { ten: 'Đạt', bg: '#E3F5EE', fg: '#0E7F63' },
  du_bi: { ten: 'Dự bị', bg: '#EEF1F5', fg: '#475A70' },
  khong_dat: { ten: 'Không đạt', bg: '#FDECEC', fg: '#B93838' }
}

// Trạng thái công khai cho ứng viên
export const CONG_KHAI = {
  xet_duyet: { buoc: 2, tieu_de: ['Hồ sơ đang', 'được xét duyệt'], mo_ta: 'Nón Sơn đã nhận hồ sơ và đang xem xét. Chúng tôi sẽ liên hệ bạn sớm nhất.' },
  phong_van: { buoc: 3, tieu_de: ['Hồ sơ của bạn', 'đang phỏng vấn'], mo_ta: 'Bộ phận tuyển dụng Nón Sơn sẽ gọi điện hoặc Zalo để phỏng vấn online. Bạn để ý điện thoại nhé.' },
  cho_ket_qua: { buoc: 4, tieu_de: ['Đã phỏng vấn,', 'chờ kết quả'], mo_ta: 'Cảm ơn bạn đã tham gia phỏng vấn. Kết quả sẽ có trong thời gian sớm nhất.' },
  trung_tuyen: { buoc: 5, tieu_de: ['Chúc mừng,', 'bạn đã trúng tuyển!'], mo_ta: 'Nón Sơn sẽ liên hệ để hướng dẫn ngày nhận việc.' },
  nhan_viec: { buoc: 5, tieu_de: ['Chào mừng bạn', 'đến với Nón Sơn!'], mo_ta: 'Hẹn gặp bạn tại nơi làm việc.' },
  chua_phu_hop: { buoc: 5, tieu_de: ['Cảm ơn bạn', 'đã ứng tuyển'], mo_ta: 'Rất tiếc lần này hồ sơ chưa phù hợp. Nón Sơn sẽ lưu hồ sơ và liên hệ khi có vị trí phù hợp hơn.' },
  da_rut: { buoc: 5, tieu_de: ['Hồ sơ', 'đã được rút'], mo_ta: 'Bạn có thể nộp lại hồ sơ bất cứ lúc nào.' }
}
