import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, CalendarPlus, Check, ClipboardCheck, Search, Store, ThumbsDown, ThumbsUp, UserCheck, X } from 'lucide-react'
import { docBang, rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { khongDau, ngayVN } from '../lib/format'
import { GIAI_DOAN, GD, GD_PHONG_VAN, GD_SANG_LOC } from '../lib/stages'
import { Bao, Btn, Chips, Field, Menu, Modal, Spinner, useToast } from '../components/ui'
import { useStaff } from './context'

const LY_DO_SL = ['Hồ sơ chưa đủ ảnh/video', 'Chưa phù hợp ngoại hình, tác phong', 'Khu vực quá xa', 'Không đúng độ tuổi', 'Thông tin không rõ ràng', 'Trùng hồ sơ']
const LY_DO_PV = ['Giao tiếp chưa phù hợp', 'Thái độ chưa phù hợp', 'Không tham gia phỏng vấn', 'Không liên lạc được', 'Thu nhập không phù hợp', 'Ứng viên từ chối']

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
//  - từ Chờ sàng lọc: qua (→ PV online) / không qua (→ Không đạt) = kết quả SÀNG LỌC
//  - từ PV online: Trúng tuyển / Không đạt / Dự bị = CHỐT KẾT QUẢ phỏng vấn
//  - Trúng tuyển → Nhận việc: mở hộp phân công cửa hàng
export function useDoiGiaiDoan({ xong, henPV }) {
  const bao = useToast()
  const [hoi, setHoi] = useState(null)
  const [lyDo, setLyDo] = useState('')
  const [dang, setDang] = useState(false)
  const [nhanViec, setNhanViec] = useState(null)

  async function lam(ids, tt, rows, ghiChu) {
    setDang(true)
    try {
      const tu = rows?.[0]?.trang_thai
      let n = 0
      if (GD_SANG_LOC.includes(tu) && (tt === 'hen_pv' || tt === 'khong_dat')) {
        n = await rpc('td_sang_loc', { p_ids: ids, p_ket_qua: tt === 'hen_pv' ? 'qua' : 'khong_qua', p_ghi_chu: ghiChu || null })
        bao(tt === 'hen_pv' ? 'Qua sàng lọc → phỏng vấn online' + (n > 1 ? ' (' + n + ' hồ sơ)' : '') : 'Đã loại ở bước sàng lọc' + (n > 1 ? ' (' + n + ')' : ''))
      } else if (['dat', 'khong_dat', 'du_bi'].includes(tt) && rows?.every((r) => !GD_SANG_LOC.includes(r.trang_thai))) {
        for (const id of ids) { await rpc('td_chot_ket_qua', { p_id: id, p_ket_qua: tt, p_ghi_chu: ghiChu || null }); n++ }
        bao('Đã chốt kết quả: ' + GD[tt].ten + (n > 1 ? ' (' + n + ')' : ''))
      } else {
        n = await rpc('td_doi_trang_thai', { p_ids: ids, p_trang_thai: tt, p_ghi_chu: ghiChu || null })
        bao(n ? 'Đã chuyển sang ' + GD[tt].ten : 'Không có thay đổi')
      }
      xong && xong(ids, tt)
      if (tt === 'hen_pv' && ids.length === 1 && henPV && GD_SANG_LOC.includes(tu)) henPV({ ...(rows?.[0] || { id: ids[0] }), trang_thai: 'hen_pv' })
    } catch (e) { bao(e.message, 'loi') }
    setDang(false)
    setHoi(null)
  }

  function doi(ids, tt, rows) {
    if (!ids.length) return
    if (tt === 'nhan_viec') {
      if (ids.length > 1) return bao('Nhận việc từng người một để phân công cửa hàng', 'loi')
      return setNhanViec(rows?.[0] || { id: ids[0] })
    }
    if (tt === 'khong_dat' || tt === 'du_bi') { setLyDo(''); return setHoi({ ids, tt, rows }) }
    lam(ids, tt, rows)
  }

  const sangLoc = hoi && GD_SANG_LOC.includes(hoi.rows?.[0]?.trang_thai)
  const giaoDien = (
    <>
      <Modal mo={!!hoi} dong={() => setHoi(null)} tieuDe={hoi?.tt === 'du_bi' ? 'Đưa vào danh sách dự bị' : sangLoc ? 'Không qua sàng lọc' : 'Không đạt phỏng vấn'}
        moTa={(hoi && hoi.ids.length > 1 ? hoi.ids.length + ' hồ sơ · ' : '') + 'Lý do chỉ lưu nội bộ, ứng viên không thấy.'}
        chan={<><Btn kieu="trong" onClick={() => setHoi(null)}>Hủy</Btn><Btn kieu="den" loading={dang} onClick={() => lam(hoi.ids, hoi.tt, hoi.rows, lyDo)}>Xác nhận</Btn></>}>
        <div className="cot" style={{ gap: 12 }}>
          {hoi?.tt !== 'du_bi' && <Chips ds={sangLoc ? LY_DO_SL : LY_DO_PV} giaTri={lyDo} onChon={setLyDo} co="sm" />}
          <Field nhan="Ghi chú"><textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Có thể bỏ trống" /></Field>
        </div>
      </Modal>
      {nhanViec && <NhanViecModal hs={nhanViec} dong={() => setNhanViec(null)} xong={() => { const r = nhanViec; setNhanViec(null); xong && xong([r.id], 'nhan_viec') }} />}
    </>
  )
  return [doi, giaoDien]
}

// Hộp nhận việc + phân công cửa hàng
export function NhanViecModal({ hs, dong, xong }) {
  const bao = useToast()
  const { data: ch } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState(null)
  const [ngay, setNgay] = useState(ngayVN())
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

// Nút hành động theo bước của quy trình (dùng ở hồ sơ, xem nhanh, sàng lọc)
export function HanhDongBuoc({ h, doiGD, henPV, toi, sang }) {
  const s = useStaff()
  const tt = h.trang_thai
  const k = sang ? 'vien-sang' : 'trang'
  if (GD_SANG_LOC.includes(tt) && s.coSua) return (
    <>
      <Btn kieu="xanh" co="md" icon={ThumbsUp} onClick={() => doiGD([h.id], 'hen_pv', [h])}>Qua sàng lọc</Btn>
      <Btn kieu={sang ? 'vien-sang' : 'do'} co="md" icon={ThumbsDown} onClick={() => doiGD([h.id], 'khong_dat', [h])}>Loại</Btn>
    </>
  )
  if (GD_PHONG_VAN.includes(tt) || tt === 'du_bi') return (
    <>
      {s.coSua && henPV && <Btn kieu={k} co="md" icon={CalendarPlus} onClick={henPV}>Hẹn PV online</Btn>}
      {s.coCham && <Link to={'/quantri/ung-vien/' + h.id + '/cham'} className={'btn md ' + k} style={{ textDecoration: 'none' }}><ClipboardCheck size={16} />Phiếu chấm</Link>}
      {s.coCham && <Btn kieu="xanh" co="md" icon={Check} onClick={() => doiGD([h.id], 'dat', [h])}>Đạt</Btn>}
      {s.coCham && <Btn kieu={sang ? 'vien-sang' : 'do'} co="md" icon={X} onClick={() => doiGD([h.id], 'khong_dat', [h])}>Không đạt</Btn>}
    </>
  )
  if (tt === 'dat' && s.coSua) return <Btn kieu={sang ? 'trang' : 'den'} co="md" icon={Store} onClick={() => doiGD([h.id], 'nhan_viec', [h])}>Nhận việc & phân công</Btn>
  if (tt === 'nhan_viec' && s.vaiTro !== 'phong_van') return <Link to={'/quantri/nhan-vien/' + h.id} className={'btn md ' + k} style={{ textDecoration: 'none' }}><Briefcase size={16} />Hồ sơ nhân viên</Link>
  return toi || null
}
