import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Copy, MessageCircle, MessageSquare, Search, X } from 'lucide-react'
import { rpc } from '../lib/api'
import { useDebounced } from '../lib/hooks'
import { congNgay, fmtGio, fmtNgay, isoTuVN, ngayVN, thu } from '../lib/format'
import { APP_URL } from '../config'
import { Avatar, Bao, Btn, Chips, Field, Modal, Spinner, StageTag, useToast } from '../components/ui'
import { useStaff } from './context'

const MAC_DINH_TIN = 'Chào {ten}, Nón Sơn mời bạn phỏng vấn vị trí {vi_tri} lúc {gio} {thu} ngày {ngay}{dia_diem}. Bạn vui lòng xác nhận tham gia tại: {link}'

export function tinMoi(mau, hs, lich) {
  const ma = hs.ma || ''
  return (mau || MAC_DINH_TIN)
    .replaceAll('{ten}', hs.ho_ten || '')
    .replaceAll('{vi_tri}', hs.vi_tri || '')
    .replaceAll('{gio}', fmtGio(lich.bat_dau))
    .replaceAll('{thu}', thu(lich.bat_dau).toLowerCase())
    .replaceAll('{ngay}', fmtNgay(lich.bat_dau))
    .replaceAll('{dia_diem}', lich.dia_diem ? (lich.hinh_thuc === 'online' ? ' (online: ' + lich.dia_diem + ')' : lich.hinh_thuc === 'dien_thoai' ? ' (qua điện thoại)' : ' tại ' + lich.dia_diem) : '')
    .replaceAll('{link}', APP_URL + '#/tra-cuu?ma=' + encodeURIComponent(ma))
}

export default function LichModal({ hoSo, lich, dong, xong }) {
  const s = useStaff()
  const bao = useToast()
  const [hs, setHs] = useState(hoSo || null)
  const [tim, setTim] = useState('')
  const timTre = useDebounced(tim, 250)
  const [kqTim, setKqTim] = useState(null)
  const bd = lich?.bat_dau
  const [ngay, setNgay] = useState(bd ? ngayVN(bd) : congNgay(ngayVN(), 1))
  const [gio, setGio] = useState(bd ? fmtGio(bd) : '09:00')
  const [thoiLuong, setThoiLuong] = useState(lich?.thoi_luong || 30)
  const [hinhThuc, setHinhThuc] = useState(lich?.hinh_thuc || 'online')
  const [diaDiem, setDiaDiem] = useState(lich?.dia_diem || '')
  const [ghiChu, setGhiChu] = useState(lich?.ghi_chu || '')
  const [nguoi, setNguoi] = useState(() => lich?.nguoi?.map((n) => n.id) || (s.vaiTro !== 'xem' ? [s.toi.id] : []))
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const [daLuu, setDaLuu] = useState(null)

  const diaDiemGoiY = Array.isArray(s.dm.caiDat.dia_diem) ? s.dm.caiDat.dia_diem : []
  const dsNguoi = useMemo(() => s.dm.nhanSu.filter((n) => n.hoat_dong && n.vai_tro !== 'xem').map((n) => ({ v: n.id, t: n.ho_ten })), [s.dm.nhanSu])

  useEffect(() => {
    if (hs || !timTre.trim()) { setKqTim(null); return }
    let song = true
    rpc('td_ds_ho_so', { p: { tim: timTre, so_dong: 8 } }).then((r) => { if (song) setKqTim(r.dong) }).catch(() => {})
    return () => { song = false }
  }, [timTre, hs])

  async function luu() {
    setLoi(null)
    if (!hs) return setLoi('Chọn ứng viên')
    if (!ngay || !gio) return setLoi('Chọn ngày và giờ phỏng vấn')
    setDang(true)
    try {
      const batDau = isoTuVN(ngay, gio)
      await rpc('td_luu_lich', { p: { id: lich?.id || null, ho_so_id: hs.id, bat_dau: batDau, thoi_luong: thoiLuong, hinh_thuc: hinhThuc, dia_diem: diaDiem, ghi_chu: ghiChu, nguoi } })
      setDaLuu({ bat_dau: batDau, hinh_thuc: hinhThuc, dia_diem: diaDiem })
      bao(lich ? 'Đã cập nhật lịch phỏng vấn' : 'Đã hẹn phỏng vấn ' + hs.ho_ten)
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }

  if (daLuu) {
    const tin = tinMoi(s.dm.caiDat.mau_tin_hen, hs, daLuu)
    const sdt = hs.sdt || ''
    return (
      <Modal mo dong={xong} tieuDe="Gửi lời mời cho ứng viên" moTa="Sao chép tin nhắn rồi gửi qua Zalo hoặc SMS."
        chan={<Btn kieu="den" onClick={xong}>Xong</Btn>}>
        <div className="bao ok" style={{ marginBottom: 14 }}><CalendarCheck size={17} /><div>Đã lưu lịch {fmtGio(daLuu.bat_dau)} {thu(daLuu.bat_dau)} {fmtNgay(daLuu.bat_dau)}. Ứng viên xác nhận được ngay trên trang tra cứu.</div></div>
        <div style={{ background: 'var(--soft)', borderRadius: 22, padding: '14px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{tin}</div>
        <div className="hang wrap" style={{ marginTop: 14, gap: 8 }}>
          <Btn kieu="den" co="md" icon={Copy} onClick={() => navigator.clipboard?.writeText(tin).then(() => bao('Đã sao chép tin nhắn'))}>Sao chép</Btn>
          {sdt && <Btn co="md" icon={MessageCircle} onClick={() => { navigator.clipboard?.writeText(tin); window.open('https://zalo.me/' + sdt, '_blank') }}>Mở Zalo</Btn>}
          {sdt && <a className="btn md" href={'sms:' + sdt + '?&body=' + encodeURIComponent(tin)}><MessageSquare size={17} />SMS</a>}
        </div>
      </Modal>
    )
  }

  return (
    <Modal mo dong={dong} tieuDe={lich ? 'Sửa lịch phỏng vấn' : 'Hẹn phỏng vấn'} moTa={hs ? hs.ho_ten + (hs.vi_tri ? ' · ' + hs.vi_tri : '') : 'Chọn ứng viên và thời gian'}
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={CalendarCheck} loading={dang} onClick={luu}>{lich ? 'Lưu thay đổi' : 'Tạo lịch'}</Btn></>}>
      <div className="cot" style={{ gap: 12 }}>
        {!hoSo && (hs ? (
          <div className="hang" style={{ background: 'var(--soft)', borderRadius: 22, padding: '10px 12px' }}>
            <Avatar ten={hs.ho_ten} path={hs.anh} co="sm" />
            <div className="gian"><b className="cat" style={{ display: 'block' }}>{hs.ho_ten}</b><span className="nho muted">{hs.vi_tri} · {hs.sdt}</span></div>
            <StageTag ma={hs.trang_thai} />
            <button className="icon-btn xs" onClick={() => setHs(null)} aria-label="Bỏ chọn"><X size={14} /></button>
          </div>
        ) : (
          <div>
            <label className="input-tron" style={{ background: 'var(--soft)', boxShadow: 'none' }}>
              <Search size={17} /><input autoFocus placeholder="Tìm ứng viên theo tên, SĐT, mã…" value={tim} onChange={(e) => setTim(e.target.value)} />
            </label>
            {kqTim && (
              <div className="cot" style={{ gap: 2, marginTop: 8, maxHeight: 260, overflow: 'auto' }}>
                {kqTim.map((r) => (
                  <button key={r.id} type="button" className="dong-hs" style={{ border: 'none', background: 'none', textAlign: 'left', width: '100%', padding: '8px 6px' }} onClick={() => setHs(r)}>
                    <Avatar ten={r.ho_ten} path={r.anh} co="sm" />
                    <span className="gian"><b className="cat">{r.ho_ten}</b><span>{r.vi_tri} · {r.sdt}</span></span>
                    <StageTag ma={r.trang_thai} />
                  </button>
                ))}
                {!kqTim.length && <p className="nho muted" style={{ padding: 10 }}>Không tìm thấy ứng viên.</p>}
              </div>
            )}
          </div>
        ))}
        <div className="luoi-2">
          <Field nhan="Ngày" type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
          <Field nhan="Giờ" type="time" value={gio} onChange={(e) => setGio(e.target.value)} step={300} />
        </div>
        <div>
          <span className="nhan-nhom">Thời lượng</span>
          <Chips ds={[15, 30, 45, 60, 90].map((m) => ({ v: m, t: m + ' phút' }))} giaTri={thoiLuong} onChon={setThoiLuong} co="sm" />
        </div>
        <div>
          <span className="nhan-nhom">Hình thức</span>
          <Chips ds={[{ v: 'truc_tiep', t: 'Trực tiếp' }, { v: 'online', t: 'Online' }, { v: 'dien_thoai', t: 'Điện thoại' }]} giaTri={hinhThuc} onChon={setHinhThuc} co="sm" />
        </div>
        <Field nhan={hinhThuc === 'online' ? 'Link họp (Zalo / Google Meet…)' : hinhThuc === 'dien_thoai' ? 'Ghi chú cuộc gọi' : 'Địa điểm'} value={diaDiem} onChange={(e) => setDiaDiem(e.target.value)} placeholder={hinhThuc === 'truc_tiep' ? 'VD: Cửa hàng Nón Sơn 123 Lê Lợi, Q.1' : ''} list="dia-diem-pv" />
        <datalist id="dia-diem-pv">{diaDiemGoiY.map((d) => <option key={d} value={d} />)}</datalist>
        {hinhThuc === 'truc_tiep' && diaDiemGoiY.length > 0 && <Chips ds={diaDiemGoiY.slice(0, 6)} giaTri={diaDiem} onChon={setDiaDiem} co="sm" />}
        <div>
          <span className="nhan-nhom">Người phỏng vấn</span>
          {dsNguoi.length ? <Chips ds={dsNguoi} giaTri={nguoi} onChon={setNguoi} nhieu tick co="sm" /> : <Spinner />}
        </div>
        <Field nhan="Ghi chú cho ứng viên (hiện trên trang tra cứu)">
          <textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="VD: Mang theo CCCD, mặc áo sáng màu" maxLength={1000} />
        </Field>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}
