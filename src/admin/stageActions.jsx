import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, Check, ClipboardCheck, LogOut, Mic, RotateCcw, Search, Store, ThumbsDown, UserCheck, UserX } from 'lucide-react'
import { docBang, rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { khongDau, ngayVN } from '../lib/format'
import { GIAI_DOAN, GD, GD_MO, GD_SANG_LOC } from '../lib/stages'
import { Bao, Btn, Chips, Field, Menu, Modal, Spinner, Switch, useToast } from '../components/ui'
import { useStaff } from './context'
import { GuiThuModal } from './Email'
import { LY_DO_NHOM, LyDoTuChoi } from './LyDo'
import { KhongDenModal, NghiViecModal } from './NghiViec'

export const LY_DO_LOAI = LY_DO_NHOM.flatMap((n) => n.ds)

export function MenuGiaiDoan({ nut, chon, hienTai }) {
  return (
    <Menu canh="trai" rong={230} nut={nut}>
      {(dong) => <>
        <div className="tieu">Chuyển sang</div>
        {GIAI_DOAN.filter((g) => !g.cu || g.ma === hienTai).map((g) => (
          <button key={g.ma} className={hienTai === g.ma ? 'on' : ''} onClick={() => { dong(); chon(g.ma) }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.cham, flex: 'none' }} />{g.ten}
            {hienTai === g.ma && <Check size={15} style={{ marginLeft: 'auto' }} />}
          </button>
        ))}
      </>}
    </Menu>
  )
}

// Chuyển giai đoạn theo đúng quy trình 2 bước:
//  - Chờ xử lý → Phỏng vấn (mở phiếu) / Loại
//  - từ PV online: Trúng tuyển / Không đạt / Dự bị = CHỐT KẾT QUẢ phỏng vấn
//  - Trúng tuyển → Nhận việc: mở hộp phân công cửa hàng
export function useDoiGiaiDoan({ xong, henPV }) {
  const bao = useToast()
  const nav = useNavigate()
  const [hoi, setHoi] = useState(null)
  const [lyDo, setLyDo] = useState('')
  const [dang, setDang] = useState(false)
  const [nhanViec, setNhanViec] = useState(null)
  const [guiEmail, setGuiEmail] = useState(true)
  const [moThu, setMoThu] = useState(null)
  const [nghi, setNghi] = useState(null)
  const [khongDen, setKhongDen] = useState(null)
  const s = useStaff()

  async function lam(ids, tt, rows, ghiChu) {
    setDang(true)
    try {
      let n = 0
      if (['dat', 'khong_dat', 'du_bi'].includes(tt)) {
        // Kết quả (kể cả loại ngay từ "Chờ xử lý") — một đường duy nhất, có ghi nhận ai/khi nào
        for (const id of ids) { await rpc('td_ket_qua_pv', { p_id: id, p: { ket_qua: tt, ghi_chu: ghiChu || null, ly_do: tt === 'khong_dat' ? ghiChu || null : null } }); n++ }
        bao((tt === 'khong_dat' ? 'Đã loại' : 'Đã chốt: ' + GD[tt].ten) + (n > 1 ? ' (' + n + ' hồ sơ)' : ''))
      } else if (tt === 'hen_pv' && rows?.every((r) => GD_SANG_LOC.includes(r.trang_thai))) {
        for (const id of ids) { await rpc('td_bat_dau_pv', { p_id: id }); n++ }
        bao('Đã chuyển sang Phỏng vấn' + (n > 1 ? ' (' + n + ')' : ''))
      } else {
        n = await rpc('td_doi_trang_thai', { p_ids: ids, p_trang_thai: tt, p_ghi_chu: ghiChu || null })
        bao(n ? 'Đã chuyển sang ' + GD[tt].ten : 'Không có thay đổi')
      }
      xong && xong(ids, tt)
      if (tt === 'khong_dat' && guiEmail) {
        if (ids.length === 1) setMoThu({ id: ids[0], ten: rows?.[0]?.ho_ten })
        else {
          let ok = 0, loi = 0
          for (const id of ids) { try { await rpc('td_thu_tao', { p_ho_so_id: id, p_loai: 'khong_dat' }); ok++ } catch (e) { loi++ } }
          bao('Đã xếp ' + ok + ' email thông báo (gửi theo chế độ mặc định)' + (loi ? ' · ' + loi + ' hồ sơ không gửi được (thiếu email)' : ''), loi && !ok ? 'loi' : undefined)
        }
      }
    } catch (e) { bao(e.message, 'loi') }
    setDang(false)
    setHoi(null)
  }

  async function huy(fn, id, tt, tb) {
    try { await rpc(fn, { p_id: id, p: { huy: true } }); bao(tb); xong && xong([id], tt) } catch (e) { bao(e.message, 'loi') }
  }

  function doi(ids, tt, rows) {
    if (!ids.length) return
    const r0 = rows?.[0] || { id: ids[0] }
    const mot = (tb) => (ids.length > 1 ? (bao(tb, 'loi'), true) : false)
    if (tt === 'nghi_viec') {
      if (mot('Cập nhật nghỉ việc từng người một (cần ngày nghỉ và lý do)')) return
      if (r0.trang_thai && !['nhan_viec', 'nghi_viec'].includes(r0.trang_thai)) return bao('Chỉ nhân sự Đang làm việc mới chuyển sang Đã nghỉ việc', 'loi')
      return setNghi(r0)
    }
    if (tt === 'khong_den') {
      if (mot('Đánh dấu không đến nhận việc từng người một')) return
      if (r0.trang_thai && !['dat', 'khong_den'].includes(r0.trang_thai)) return bao('Chỉ ứng viên Chờ nhận việc mới chuyển sang Không đến nhận việc', 'loi')
      return setKhongDen(r0)
    }
    if (tt === 'nhan_viec' && r0.trang_thai === 'nghi_viec' && ids.length === 1) return huy('td_nghi_viec', r0.id, 'nhan_viec', 'Đã hủy nghỉ việc — quay lại Đang làm việc')
    if (tt === 'dat' && r0.trang_thai === 'khong_den' && ids.length === 1) return huy('td_khong_den', r0.id, 'dat', 'Đã trả về Chờ nhận việc')
    if (tt === 'nhan_viec') {
      if (ids.length > 1) return bao('Nhận việc từng người một để phân công cửa hàng', 'loi')
      return setNhanViec(rows?.[0] || { id: ids[0] })
    }
    if (tt === 'dat') {
      // Đạt phải kèm cửa hàng + ngày + giờ nhận việc → chốt trong phiếu phỏng vấn
      if (ids.length > 1) return bao('Chốt Đạt từng người trong phiếu phỏng vấn để chọn cửa hàng, ngày giờ nhận việc', 'loi')
      return nav('/quantri/ung-vien/' + ids[0] + '/cham')
    }
    if (tt === 'khong_dat' || tt === 'du_bi') { setLyDo(''); return setHoi({ ids, tt, rows }) }
    lam(ids, tt, rows)
  }

  const giaoDien = (
    <>
      <Modal mo={!!hoi} dong={() => setHoi(null)} tieuDe={hoi?.tt === 'du_bi' ? 'Đưa vào danh sách dự bị' : 'Loại hồ sơ'}
        moTa={hoi && hoi.ids.length > 1 ? hoi.ids.length + ' hồ sơ được chọn' : (hoi?.rows?.[0]?.ho_ten || '')}
        chan={<><Btn kieu="trong" onClick={() => setHoi(null)}>Hủy</Btn><Btn kieu="den" loading={dang} onClick={() => lam(hoi.ids, hoi.tt, hoi.rows, lyDo)}>Xác nhận</Btn></>}>
        <div className="cot" style={{ gap: 12 }}>
          {hoi && (hoi.tt !== 'du_bi'
            ? <LyDoTuChoi key={hoi.ids.join()} giaTri={lyDo} onDoi={setLyDo} />
            : <Field nhan="Ghi chú"><textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Có thể bỏ trống" /></Field>)}
          {hoi?.tt === 'khong_dat' && s.coCham && (
            <label className="hang gui-email-loai"><Switch on={guiEmail} nhan="Gửi email" onDoi={setGuiEmail} /><span className="gian"><b>Gửi email thông báo “Chưa phù hợp”</b><small>{hoi.ids.length > 1 ? 'Tự xếp hàng theo chế độ mặc định (có thể hủy trong mục Email từng hồ sơ)' : 'Bước tiếp theo: xem lại nội dung và chọn gửi ngay / gửi sau'}</small></span></label>
          )}
        </div>
      </Modal>
      {moThu && <GuiThuModal hoSoId={moThu.id} loai="khong_dat" ten={moThu.ten} dong={() => setMoThu(null)} />}
      {nghi && <NghiViecModal h={nghi} dong={() => setNghi(null)} xong={() => { const r = nghi; setNghi(null); xong && xong([r.id], 'nghi_viec') }} />}
      {khongDen && <KhongDenModal h={khongDen} dong={() => setKhongDen(null)} xong={() => { const r = khongDen; setKhongDen(null); xong && xong([r.id], 'khong_den') }} />}
      {nhanViec && <NhanViecModal hs={nhanViec} dong={() => setNhanViec(null)} xong={() => { const r = nhanViec; setNhanViec(null); xong && xong([r.id], 'nhan_viec') }} />}
    </>
  )
  return [doi, giaoDien]
}

// Hộp nhận việc + phân công cửa hàng
export function NhanViecModal({ hs, dong, xong }) {
  const bao = useToast()
  const { data: ch, reload: reloadCh } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState(null)
  const [ngay, setNgay] = useState(hs.ngay_nhan_viec || ngayVN())
  useEffect(() => { if (ch && hs.cua_hang_du_kien && !chon) setChon(ch.find((c) => c.ma === hs.cua_hang_du_kien) || null) }, [ch]) // eslint-disable-line react-hooks/exhaustive-deps
  const [maNv, setMaNv] = useState('')
  const [ghi, setGhi] = useState('')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const ds = useMemo(() => {
    const q = khongDau(tim).trim()
    const tat = (ch || []).filter((c) => c.hoat_dong)
    if (!q) return tat.slice(0, 40)
    const t = q.split(/\s+/)
    return tat.filter((c) => { const s = khongDau(c.ten + ' ' + c.ma + ' ' + (c.dia_chi || '') + ' ' + (c.khu_vuc || '')); return t.every((w) => s.includes(w)) }).slice(0, 40)
  }, [ch, tim])
  async function luu() {
    setLoi(null)
    if (!chon) return setLoi('Chọn cửa hàng nhận việc')
    setDang(true)
    try {
      await rpc('td_nhan_viec', { p_ho_so_id: hs.id, p: { cua_hang_ma: chon.ma, ngay_nhan_viec: ngay, ma_nv: maNv, ghi_chu: ghi } })
      bao('Đã nhận việc · ' + chon.ten)
      xong()
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <Modal mo rong dong={dong} tieuDe="Nhận việc & phân công cửa hàng" moTa={(hs.ho_ten || '') + (hs.vi_tri ? ' · ' + hs.vi_tri : '')}
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={UserCheck} loading={dang} onClick={luu}>Xác nhận nhận việc</Btn></>}>
      <div className="cot" style={{ gap: 12 }}>
        <div className="luoi-2">
          <Field kieu="gon" nhan="Ngày nhận việc" type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
          <Field kieu="gon" nhan="Mã nhân viên (nếu đã có)" value={maNv} onChange={(e) => setMaNv(e.target.value.toUpperCase())} placeholder="Có thể bổ sung sau" />
        </div>
        <label className="input-tron" style={{ background: 'var(--soft)', boxShadow: 'none' }}><Search size={17} /><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm cửa hàng theo tên, mã, địa chỉ, khu vực…" /></label>
        {hs.khu_vuc_mong_muon && <div className="hang wrap nho muted" style={{ gap: 8 }}>Ứng viên muốn làm ở: <button type="button" className="chip sm" onClick={() => setTim(hs.khu_vuc_mong_muon)}>{hs.khu_vuc_mong_muon}</button>{hs.cho_o && <button type="button" className="chip sm" onClick={() => setTim(String(hs.cho_o).split(',')[0])}>{String(hs.cho_o).split(',')[0]}</button>}</div>}
        {hs.gio_nhan_viec && <Bao kieu="xanh">Đã hẹn nhận việc lúc <b>{String(hs.gio_nhan_viec).slice(0, 5)}</b>{hs.ghi_chu_nhan_viec ? ' · ' + hs.ghi_chu_nhan_viec : ''}</Bao>}
        {chon && <div className="bao ok"><Store size={17} /><div><b>{chon.ten}</b> · {chon.ma}{chon.dia_chi ? <><br />{chon.dia_chi}</> : null}</div></div>}
        <div className="cot cuon-mong" style={{ gap: 4, maxHeight: 260, overflow: 'auto' }}>
          {!ch ? <Spinner /> : ds.map((c) => (
            <button key={c.ma} type="button" className="dong-hs" style={{ border: 'none', background: chon?.ma === c.ma ? 'var(--soft)' : 'none', textAlign: 'left', width: '100%', padding: '8px 10px' }} onClick={() => setChon(c)}>
              <span className="orb xs"><Store size={13} /></span>
              <span className="gian"><b className="cat">{c.ten}</b><span className="cat" style={{ display: 'block' }}>{c.ma} · {c.khu_vuc || ''}{c.dia_chi ? ' · ' + c.dia_chi : ''}</span></span>
              {chon?.ma === c.ma && <Check size={16} />}
            </button>
          ))}
          {ch && !ds.length && <p className="nho muted" style={{ padding: 8 }}>Không tìm thấy cửa hàng.</p>}
        </div>
        <Field kieu="gon" nhan="Ghi chú" value={ghi} onChange={(e) => setGhi(e.target.value)} placeholder="Ca làm, người hướng dẫn…" />
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}

// Nút hành động chính: Phỏng vấn (mở phiếu ngay) · Loại · Xác nhận nhận việc
export function HanhDongBuoc({ h, doiGD, toi, sang }) {
  const s = useStaff()
  const tt = h.trang_thai
  const k = sang ? 'vien-sang' : 'trang'
  if (GD_MO.includes(tt)) return (
    <>
      {s.coCham && <Link to={'/quantri/ung-vien/' + h.id + '/cham'} className={'btn md ' + (sang ? 'trang' : 'den') + ' nut-pv'} style={{ textDecoration: 'none' }}><Mic size={16} />{['da_pv', 'de_xuat', 'du_bi'].includes(tt) ? 'Mở phiếu phỏng vấn' : 'Phỏng vấn'}</Link>}
      {s.coSua && <Btn kieu={sang ? 'vien-sang' : 'do'} co="md" icon={ThumbsDown} onClick={() => doiGD([h.id], 'khong_dat', [h])}>Loại</Btn>}
    </>
  )
  if (tt === 'dat' || tt === 'khong_den') return (
    <>
      {s.coSua && <Btn kieu={sang ? 'trang' : 'den'} co="md" icon={Store} onClick={() => doiGD([h.id], 'nhan_viec', [h])}>Xác nhận nhận việc</Btn>}
      {s.coSua && tt === 'dat' && <Btn kieu={k} co="md" icon={UserX} onClick={() => doiGD([h.id], 'khong_den', [h])}>Không đến</Btn>}
      {s.coSua && tt === 'khong_den' && <Btn kieu={k} co="md" icon={RotateCcw} onClick={() => doiGD([h.id], 'dat', [h])}>Trả về chờ nhận việc</Btn>}
      {s.coCham && tt === 'dat' && <Link to={'/quantri/ung-vien/' + h.id + '/cham'} className={'btn md ' + k} style={{ textDecoration: 'none' }}><ClipboardCheck size={16} />Phiếu phỏng vấn</Link>}
    </>
  )
  if ((tt === 'nhan_viec' || tt === 'nghi_viec') && s.vaiTro !== 'phong_van') return (
    <>
      {s.coSua && tt === 'nhan_viec' && <Btn kieu={k} co="md" icon={LogOut} onClick={() => doiGD([h.id], 'nghi_viec', [h])}>Nghỉ việc</Btn>}
      {s.coSua && tt === 'nghi_viec' && <Btn kieu={k} co="md" icon={RotateCcw} onClick={() => doiGD([h.id], 'nhan_viec', [h])}>Hủy nghỉ việc</Btn>}
      <Link to={'/quantri/nhan-vien/' + h.id} className={'btn md ' + k} style={{ textDecoration: 'none' }}><Briefcase size={16} />Hồ sơ nhân viên</Link>
    </>
  )
  return toi || null
}

// Chọn cửa hàng (tìm theo tên, mã, địa chỉ, khu vực) — dùng trong phiếu phỏng vấn
export const banDo = (c) => (c?.lat != null && c?.lng != null ? 'https://www.google.com/maps/search/?api=1&query=' + c.lat + ',' + c.lng : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c?.dia_chi || ''))

function BoSungDiaChi({ ma, xong }) {
  const bao = useToast()
  const [v, setV] = useState('')
  const [dang, setDang] = useState(false)
  async function luu() {
    setDang(true)
    try { await rpc('td_cua_hang_dia_chi', { p_ma: ma, p_dia_chi: v }); bao('Đã lưu địa chỉ cửa hàng'); xong() } catch (e) { bao(e.message, 'loi') }
    setDang(false)
  }
  return (
    <div className="cot" style={{ gap: 6, padding: 10, borderRadius: 18, background: 'var(--warn-bg)' }}>
      <span className="nho" style={{ color: 'var(--warn)', fontWeight: 700 }}>Cửa hàng chưa có địa chỉ — email trúng tuyển cần địa chỉ. Bổ sung 1 lần, dùng cho mọi lần sau.</span>
      <div className="hang" style={{ gap: 6 }}><Field kieu="gon" className="gian" value={v} onChange={(e) => setV(e.target.value)} placeholder="Số nhà, đường, phường, tỉnh/thành" /><Btn kieu="den" co="sm" loading={dang} onClick={luu}>Lưu</Btn></div>
    </div>
  )
}

export function ChonCuaHang({ giaTri, onChon, goiY = [] }) {
  const { data: ch, reload: reloadCh } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const [tim, setTim] = useState('')
  const [mo, setMo] = useState(!giaTri)
  const chon = (ch || []).find((c) => c.ma === giaTri)
  const ds = useMemo(() => {
    const q = khongDau(tim).trim()
    const tat = (ch || []).filter((c) => c.hoat_dong)
    if (!q) return tat.slice(0, 30)
    const t = q.split(/\s+/)
    return tat.filter((c) => { const x = khongDau(c.ten + ' ' + c.ma + ' ' + (c.dia_chi || '') + ' ' + (c.khu_vuc || '')); return t.every((w) => x.includes(w)) }).slice(0, 30)
  }, [ch, tim])
  if (chon && !mo) return (
    <div className="cot" style={{ gap: 8 }}>
      <button type="button" className="ch-da-chon" onClick={() => setMo(true)}>
        <span className="orb xs"><Store size={13} /></span>
        <span className="gian"><b className="cat">{chon.ten}</b><span className="cat">{chon.ma}{chon.dia_chi ? ' · ' + chon.dia_chi : ' · chưa có địa chỉ'}</span></span>
        <span className="nho" style={{ color: 'var(--pink-deep)', fontWeight: 700 }}>Đổi</span>
      </button>
      {(chon.lat || chon.dia_chi) && <a className="link-ban-do" href={banDo(chon)} target="_blank" rel="noreferrer"><MapPin size={14} />Xem vị trí cửa hàng trên bản đồ</a>}
      {!chon.dia_chi && <BoSungDiaChi ma={chon.ma} xong={() => reloadCh(true)} />}
    </div>
  )
  return (
    <div className="cot" style={{ gap: 8 }}>
      <label className="input-tron" style={{ background: 'var(--soft)', boxShadow: 'none', height: 44 }}><Search size={16} /><input autoFocus={!!giaTri} value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm cửa hàng: tên, mã, địa chỉ, khu vực…" /></label>
      {goiY.filter(Boolean).length > 0 && <div className="hang wrap nho muted" style={{ gap: 6 }}>Gợi ý: {goiY.filter(Boolean).map((g) => <button key={g} type="button" className="chip sm" onClick={() => setTim(g)}>{g}</button>)}</div>}
      <div className="cot cuon-mong" style={{ gap: 2, maxHeight: 220, overflow: 'auto' }}>
        {!ch ? <Spinner /> : ds.map((c) => (
          <button key={c.ma} type="button" className="dong-hs" style={{ border: 'none', background: giaTri === c.ma ? 'var(--soft)' : 'none', textAlign: 'left', width: '100%', padding: '7px 10px' }} onClick={() => { onChon(c.ma); setMo(false) }}>
            <span className="orb xs"><Store size={13} /></span>
            <span className="gian"><b className="cat">{c.ten}</b><span className="cat" style={{ display: 'block' }}>{c.ma} · {c.khu_vuc || ''}{c.dia_chi ? ' · ' + c.dia_chi : ''}</span></span>
            {giaTri === c.ma && <Check size={16} />}
          </button>
        ))}
        {ch && !ds.length && <p className="nho muted" style={{ padding: 8 }}>Không tìm thấy cửa hàng.</p>}
      </div>
    </div>
  )
}
