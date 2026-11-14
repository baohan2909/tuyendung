import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { History, Lock, X } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { fmtNgayGio, tuongDoi } from '../lib/format'
import { GD, LICH_TT, NV_TT, GT_TT } from '../lib/stages'
import { Avatar, Btn, Empty, Field, Skeleton } from '../components/ui'
import { useStaff } from './context'

const BANG = { ho_so: 'Hồ sơ ứng viên', lich_pv: 'Lịch phỏng vấn', danh_gia: 'Phiếu chấm', nhan_vien: 'Nhân viên', phan_cong: 'Phân công cửa hàng', giay_to: 'Giấy tờ', moc_hoi_nhap: 'Hội nhập', nhan_su: 'Tài khoản nhân sự', vi_tri: 'Vị trí tuyển', tieu_chi: 'Tiêu chí', cua_hang: 'Cửa hàng' }
const HD = { insert: 'Tạo', update: 'Sửa', delete: 'Xóa' }
const COT = {
  trang_thai: 'Trạng thái', nguoi_phu_trach: 'Phụ trách', uu_tien: 'Ưu tiên', the_gan: 'Thẻ', ho_ten: 'Họ tên', sdt: 'SĐT', email: 'Email', ngay_sinh: 'Ngày sinh',
  chieu_cao: 'Chiều cao', can_nang: 'Cân nặng', cho_o: 'Chỗ ở', khu_vuc_mong_muon: 'Khu vực mong muốn', vi_tri_id: 'Vị trí', ly_do_loai: 'Lý do không đạt',
  ngay_nhan_viec: 'Ngày nhận việc', noi_lam_viec: 'Nơi làm việc', nguoi_sang_loc: 'Người mở phỏng vấn', sang_loc_luc: 'Lúc mở phỏng vấn', nguoi_chot: 'Người chốt KQ',
  chot_luc: 'Lúc chốt', diem_tb: 'Điểm TB', so_danh_gia: 'Số phiếu', bat_dau: 'Giờ PV', hinh_thuc: 'Hình thức', dia_diem: 'Địa điểm/link', cua_hang_ma: 'Cửa hàng',
  tu_ngay: 'Từ ngày', den_ngay: 'Đến ngày', ly_do: 'Lý do', ma_nv: 'Mã NV', vai_tro: 'Vai trò', hoat_dong: 'Hoạt động', diem_tong: 'Điểm', ket_luan: 'Kết luận',
  nhan_xet: 'Nhận xét', da_gui: 'Đã gửi', hoan_thanh: 'Hoàn thành', duong_dan: 'Tệp', ghi_chu: 'Ghi chú', ngay_chinh_thuc: 'Ngày chính thức', ngay_nghi: 'Ngày nghỉ',
  ten: 'Tên', dang_tuyen: 'Đang tuyển', nguoi_thuc_hien: 'Người thực hiện', nguoi_cham: 'Người chấm', nguoi_xac_nhan: 'Người xác nhận', cap_nhat_boi: 'Người cập nhật'
}
const AN = ['id', 'ho_so_id', 'nhan_vien_id', 'lich_pv_id', 'hoan_thanh_luc', 'gui_luc', 'phan_hoi_luc', 'dang_nhap_cuoi', 'nop_luc', 'thiet_bi', 'tra_loi_them', 'diem', 'tao_boi']

function giaTri(k, v, s) {
  if (v == null || v === '') return '—'
  if (k === 'trang_thai') return GD[v]?.ten || LICH_TT[v]?.ten || NV_TT[v]?.ten || GT_TT[v]?.ten || v
  if (/^(nguoi_|cap_nhat_boi)/.test(k) && typeof v === 'string' && v.length === 36) return s.tenNS(v)
  if (k === 'vi_tri_id') return s.tenVT(v)
  if (typeof v === 'boolean') return v ? 'Có' : 'Không'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmtNgayGio(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function NhatKyDs({ loc, gon }) {
  const s = useStaff()
  const [soDong, setSoDong] = useState(loc.so_dong || 100)
  const { data, loading } = useAsync(() => rpc('td_nhat_ky', { p: { ...loc, so_dong: soDong } }), [JSON.stringify(loc), soDong, s.nhip])
  if (loading && !data) return <Skeleton h={160} />
  if (!data?.length) return <p className="nho muted">Chưa có thay đổi nào được ghi nhận.</p>
  return (
    <div className="cot" style={{ gap: 0 }}>
      {data.map((k) => {
        const ds = Object.entries(k.thay_doi || {}).filter(([c]) => !AN.includes(c))
        return (
          <div key={k.id} className="hang" style={{ alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--line)', gap: 12 }}>
            <Avatar ten={k.nguoi} co="sm" />
            <div className="gian">
              <div style={{ fontSize: 13.5 }}><b>{k.nguoi}</b>{k.ma_nv && <span className="muted"> · {k.ma_nv}</span>} <span className="muted-2">{HD[k.hanh_dong] || k.hanh_dong} {BANG[k.bang] || k.bang}</span>
                {!gon && k.ho_so && <> · <Link to={'/quantri/ung-vien/' + k.ho_so_id} style={{ fontWeight: 700 }}>{k.ho_so}</Link></>}</div>
              <div className="nho muted">{fmtNgayGio(k.tao_luc)} · {tuongDoi(k.tao_luc)}</div>
              {ds.length > 0 && (
                <div className="cot" style={{ gap: 3, marginTop: 6 }}>
                  {ds.slice(0, gon ? 4 : 12).map(([c, v]) => (
                    <div key={c} className="nho" style={{ background: 'var(--soft)', borderRadius: 10, padding: '4px 10px', wordBreak: 'break-word' }}>
                      <b>{COT[c] || c}:</b> {k.hanh_dong === 'update' && Array.isArray(v) && v.length === 2
                        ? <><span className="muted" style={{ textDecoration: 'line-through' }}>{giaTri(c, v[0], s)}</span> → <b style={{ color: 'var(--ink)' }}>{giaTri(c, v[1], s)}</b></>
                        : giaTri(c, v, s)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {data.length >= soDong && <div className="chan-bang"><Btn kieu="trang" co="sm" onClick={() => setSoDong((n) => n + 100)}>Xem thêm</Btn></div>}
    </div>
  )
}

export default function NhatKy() {
  const s = useStaff()
  const [qs, setQs] = useSearchParams()
  const [ns, setNs] = useState('')
  const [bang, setBang] = useState('')
  const [tu, setTu] = useState('')
  const [den, setDen] = useState('')
  const hoSo = qs.get('ho_so')
  if (!(s.vaiTro === 'quan_tri' || s.vaiTro === 'tuyen_dung')) return <div className="card"><Empty icon={Lock} tieuDe="Nhật ký dành cho quản trị & tuyển dụng" /></div>
  return (
    <>
      <header className="trang-dau">
        <div className="tieu"><span className="eyebrow">Truy vết</span><h1>Nhật ký <b>thao tác</b></h1><p className="phu">Ai làm gì, lúc nào, thay đổi nội dung gì — ghi tự động, không sửa xóa được</p></div>
      </header>
      <div className="loc-hang">
        <label className="input-tron"><History size={17} />
          <select value={ns} onChange={(e) => setNs(e.target.value)} aria-label="Người thực hiện"><option value="">Mọi nhân sự</option>{s.dm.nhanSu.map((n) => <option key={n.id} value={n.id}>{n.ho_ten} · {n.ma_nv}</option>)}</select></label>
        <label className="input-tron"><select value={bang} onChange={(e) => setBang(e.target.value)} aria-label="Loại dữ liệu"><option value="">Mọi loại dữ liệu</option>{Object.entries(BANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <Field kieu="gon" nhan="Từ ngày" type="date" value={tu} onChange={(e) => setTu(e.target.value)} />
        <Field kieu="gon" nhan="Đến ngày" type="date" value={den} onChange={(e) => setDen(e.target.value)} />
        {hoSo && <Btn kieu="den" co="md" icon={X} onClick={() => setQs({})}>Bỏ lọc hồ sơ</Btn>}
      </div>
      <section className="card"><NhatKyDs loc={{ nhan_su_id: ns || null, bang: bang || null, tu: tu || null, den: den || null, ho_so_id: hoSo || null }} /></section>
    </>
  )
}
