import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download, Film, Play, Mic, Store, Image as ImageIc, Layers, LayoutList, Search, Star, UserCheck, X, Check, ArrowRight, Maximize2, Trash2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { dsTep, rpc, xoaTep } from '../lib/api'
import { useAsync, useDebounced, useLS, useMedia, usePhim } from '../lib/hooks'
import { congNgay, fmtGiay, fmtNgayGio, fmtSdt, fmtThoiDiem, ngayVN } from '../lib/format'
import { GIAI_DOAN, GD, GD_MO } from '../lib/stages'
import { xuatExcel } from '../lib/excel'
import { AnhKho, AnhNho, Avatar, Btn, Diem, Empty, Field, IconBtn, Menu, Segment, Skeleton, StageTag, useToast, useXacNhan, Bao } from '../components/ui'
import { useStaff } from './context'
import LichModal from './LichModal'
import { HoSoChiTiet, TrinhPhat } from './Profile'
import ChonNgay, { tinhKhoang } from './ChonNgay'
import { tenNgan } from './Dashboard'
import { HanhDongBuoc, MenuGiaiDoan, useDoiGiaiDoan } from './stageActions'
import { TagLan } from './LichSuUngTuyen'

function CotSX({ nhan, khoa, sapXep, setSapXep, className = '' }) {
  const on = khoa.includes(sapXep)
  const tiep = khoa.length > 1 ? (sapXep === khoa[0] ? khoa[1] : khoa[0]) : khoa[0]
  const xuong = sapXep === 'moi_nhat' || sapXep === 'diem'
  return (
    <button type="button" className={'cot-sx ' + className + (on ? ' on' : '')} onClick={() => setSapXep(on && khoa.length === 1 ? 'moi_nhat' : tiep)} title="Sắp xếp">
      {nhan}{on ? (xuong ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowUpDown size={12} className="mo" />}
    </button>
  )
}

const SAP_XEP = [{ v: 'moi_nhat', t: 'Mới nhất' }, { v: 'cu_nhat', t: 'Cũ nhất' }, { v: 'diem', t: 'Điểm cao' }, { v: 'ten', t: 'Tên A–Z' }, { v: 'tuoi', t: 'Trẻ nhất' }, { v: 'cap_nhat', t: 'Vừa cập nhật' }]

export const COT_EXCEL = [
  { k: 'ma', ten: 'Mã hồ sơ', w: 16 }, { k: 'lan_thu', ten: 'Lần ứng tuyển', w: 10, lay: (r) => (r.so_lan > 1 ? r.lan_thu + '/' + r.so_lan : 1) }, { k: 'nop_luc', ten: 'Thời gian nộp', w: 18, lay: (r) => fmtNgayGio(r.nop_luc) },
  { k: 'trang_thai', ten: 'Giai đoạn', w: 13, lay: (r) => GD[r.trang_thai]?.ten }, { k: 'ho_ten', ten: 'Họ và tên', w: 24 },
  { k: 'sdt', ten: 'Số điện thoại', w: 14 }, { k: 'email', ten: 'Email', w: 24 }, { k: 'ngay_sinh', ten: 'Ngày sinh', w: 12 },
  { k: 'tuoi', ten: 'Tuổi', w: 6 }, { k: 'chieu_cao', ten: 'Chiều cao (cm)', w: 9 }, { k: 'can_nang', ten: 'Cân nặng (kg)', w: 9 },
  { k: 'cho_o', ten: 'Chỗ ở hiện tại', w: 28 }, { k: 'vi_tri', ten: 'Vị trí ứng tuyển', w: 22 }, { k: 'khu_vuc_mong_muon', ten: 'Khu vực mong muốn', w: 18 },
  { k: 'hoc_van', ten: 'Trình độ học vấn', w: 16 }, { k: 'kinh_nghiem', ten: 'Kinh nghiệm làm việc', w: 40 }, { k: 'an_tuong', ten: 'Ấn tượng về Nón Sơn', w: 36 },
  { k: 'thu_nhap_mong_muon', ten: 'Thu nhập mong muốn', w: 14 }, { k: 'dinh_huong', ten: 'Ổn định / Linh hoạt', w: 16 }, { k: 'nguon', ten: 'Nguồn thông tin', w: 30 },
  { k: 'ma_nguon', ten: 'Kênh (mã QR)', w: 12 }, { k: 'sdt_gioi_thieu', ten: 'SĐT người giới thiệu', w: 14 }, { k: 'diem_tb', ten: 'Điểm PV', w: 8 },
  { k: 'so_danh_gia', ten: 'Số phiếu chấm', w: 8 }, { k: 'phu_trach_ten', ten: 'Phụ trách', w: 18 }, { k: 'the_gan', ten: 'Thẻ', w: 18 },
  { k: 'ly_do_loai', ten: 'Lý do không đạt', w: 24 }, { k: 'ngay_nhan_viec', ten: 'Ngày nhận việc', w: 12 }, { k: 'noi_lam_viec', ten: 'Nơi làm việc', w: 20 }
]


const LOC_TRONG = { vi_tri_id: '', khu_vuc: '', tuoi: '', danh_gia: '', hoc_van: '', ma_nguon: '', phu_trach: '', ngay: '', khoang: { v: '' }, co_video: '', uu_tien: false, lan: '' }
const TUOI = [{ v: '', t: 'Mọi độ tuổi' }, { v: '18-22', t: '18 – 22 tuổi' }, { v: '23-27', t: '23 – 27 tuổi' }, { v: '28-35', t: '28 – 35 tuổi' }, { v: '36-99', t: 'Trên 35 tuổi' }]
const DANH_GIA = [{ v: '', t: 'Tất cả' }, { v: 'chua', t: 'Chưa chấm điểm' }, { v: 'da', t: 'Đã chấm điểm' }, { v: 'cao', t: 'Điểm từ 7 trở lên' }, { v: 'thap', t: 'Điểm dưới 5' }]
const VIDEO = [{ v: '', t: 'Tất cả' }, { v: 'co', t: 'Có video' }, { v: 'khong', t: 'Chưa có video' }]
const NHOM = [{ v: '', t: 'Không nhóm' }, { v: 'gd', t: 'Theo giai đoạn' }, { v: 'vi_tri', t: 'Theo vị trí' }, { v: 'khu_vuc', t: 'Theo khu vực' }, { v: 'ngay', t: 'Theo ngày nộp' }]
const MOI_TRANG = 60

// Một nút lọc dạng viên thuốc: chưa chọn = trắng, đã chọn = đen kèm giá trị + nút bỏ
export function NutLoc({ nhan, giaTri, ds, chon, rong = 230, children, tim }) {
  const [q, setQ] = useState('')
  const coGiaTri = giaTri !== '' && giaTri != null
  const hien = coGiaTri ? (ds?.find((x) => String(x.v) === String(giaTri))?.t ?? giaTri) : nhan
  const loc = tim && q ? ds.filter((x) => x.v === '' || x.t.toLowerCase().includes(q.toLowerCase())) : ds
  return (
    <span className={'nut-loc' + (coGiaTri ? ' on' : '')}>
      <Menu canh="trai" rong={rong} nut={<button type="button" className="nl-chinh">{coGiaTri && <i className="nl-nhan">{nhan}</i>}<span className="cat">{hien}</span>{!coGiaTri && <ChevronDown size={14} />}</button>}>
        {(dong) => <>
          {tim && <div style={{ padding: '4px 4px 8px' }}><input autoFocus className="o-tim-menu" placeholder="Tìm…" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {(loc || []).map((x) => (
              <button key={String(x.v)} className={String(giaTri) === String(x.v) ? 'on' : ''} onClick={() => { chon(x.v); dong() }}>
                <span className="gian cat">{x.t}</span>{x.n != null && <span className="nho muted so">{x.n}</span>}{String(giaTri) === String(x.v) && <Check size={15} />}
              </button>
            ))}
          </div>
          {children && children(dong)}
        </>}
      </Menu>
      {coGiaTri && <button type="button" className="nl-bo" onClick={() => chon('')} aria-label={'Bỏ lọc ' + nhan}><X size={13} strokeWidth={2.6} /></button>}
    </span>
  )
}

// Tải danh sách theo trang (cuộn tới đâu tải tới đó) — chịu được hàng nghìn hồ sơ
function useDanhSach(p, nhip) {
  const [st, setSt] = useState({ dong: [], tong: 0, dem: {}, dangTai: true, het: false })
  const khoa = JSON.stringify(p)
  const lan = useRef(0)
  const soDaTai = useRef(0)
  const tai = useCallback(async (kieu) => {
    const id = ++lan.current
    const them = kieu === 'them'
    const bo_qua = them ? soDaTai.current : 0
    const so_dong = kieu === 'lam_moi' ? Math.max(MOI_TRANG, soDaTai.current) : MOI_TRANG
    if (kieu !== 'lam_moi') setSt((x) => ({ ...x, dangTai: true }))
    try {
      const r = await rpc('td_ds_ho_so', { p: { ...p, bo_qua, so_dong } })
      if (id !== lan.current) return
      setSt((x) => {
        const dong = them ? [...x.dong, ...r.dong] : r.dong
        soDaTai.current = dong.length
        return { dong, tong: r.tong, dem: r.dem || {}, dangTai: false, het: dong.length >= r.tong }
      })
    } catch (e) { if (id === lan.current) setSt((x) => ({ ...x, dangTai: false, loi: e })) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoa])
  useEffect(() => { soDaTai.current = 0; tai('dau') }, [tai])
  useEffect(() => { if (nhip) tai('lam_moi') }, [nhip]) // eslint-disable-line react-hooks/exhaustive-deps
  const sua = useCallback((f) => setSt((x) => ({ ...x, dong: f(x.dong) })), [])
  return { ...st, taiThem: () => !st.het && !st.dangTai && tai('them'), lamMoi: () => tai('lam_moi'), sua }
}

function NutVideo({ v, onClick }) {
  return (
    <button type="button" className="dg-vid" onClick={onClick} title="Bấm để xem video" aria-label="Xem video">
      {v.duong_dan_nho ? <AnhKho path={v.duong_dan_nho} alt="" /> : null}
      <span className="dv-play"><Play size={13} fill="currentColor" /></span>
      {v.thoi_luong != null && <span className="dv-tg">{fmtGiay(v.thoi_luong)}</span>}
    </button>
  )
}

const keyNhom = (r, nhom) => {
  if (nhom === 'gd') return GD[r.trang_thai]?.ten || r.trang_thai
  if (nhom === 'vi_tri') return r.vi_tri || '—'
  if (nhom === 'khu_vuc') return (r.khu_vuc_mong_muon || 'Chưa ghi khu vực').trim().replace(/\s+/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase())
  if (nhom === 'ngay') { const s = ngayVN(r.nop_luc); return s === ngayVN() ? 'Hôm nay' : s === congNgay(ngayVN(), -1) ? 'Hôm qua' : s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) }
  return ''
}

const TAB_PV = [
  { v: '', t: 'Cần phỏng vấn', ds: ['moi', 'sang_loc', 'hen_pv'] },
  { v: 'dang_pv', t: 'Đang phỏng vấn', ds: ['hen_pv'] },
  { v: 'can_nhac', t: 'Cân nhắc thêm', ds: ['can_nhac'] },
  { v: 'chua_lien_lac', t: 'Chưa liên lạc được', ds: ['chua_lien_lac'] },
  { v: 'cho_chot', t: 'Đã chấm · chờ chốt', ds: ['da_pv', 'de_xuat', 'du_bi'] },
  { v: 'dat', t: 'Trúng tuyển · chờ nhận việc', ds: ['dat'] }
]

export default function Candidates({ cheDo }) {
  const pv = cheDo === 'pv'
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const xacNhan = useXacNhan()
  const rongLon = useMedia('(min-width: 1280px)')
  const [qs, setQs] = useSearchParams()
  const [kieu, setKieu] = useLS('ns-td-kieu-xem', 'bang')
  const [anCT, setAnCT] = useLS('ns-td-an-chi-tiet', false)
  const [tim, setTim] = useState(qs.get('tim') || '')
  const timTre = useDebounced(tim, 300)
  const gd = qs.get('gd') || ''
  const [loc, setLoc] = useLS('ns-td-loc-v2', LOC_TRONG)
  const [sapXep, setSapXep] = useLS('ns-td-sap-xep', 'moi_nhat')
  const [nhom, setNhom] = useLS('ns-td-nhom', '')
  const [chon, setChon] = useState([])
  const [xemId, setXemId] = useState(qs.get('xem') || null)
  const [moTo, setMoTo] = useState(null)
  const [xemVideo, setXemVideo] = useState(null)
  const [henCho, setHenCho] = useState(null)
  const [dangXuat, setDangXuat] = useState(false)
  const [nhipCT, setNhipCT] = useState(0)
  const timRef = useRef(null)
  const chanRef = useRef(null)
  const { data: goiY } = useAsync(() => rpc('td_goi_y_loc').catch(() => ({ khu_vuc: [], hoc_van: [] })), [])

  const khoangNgay = useMemo(() => tinhKhoang(loc.khoang), [JSON.stringify(loc.khoang)]) // eslint-disable-line react-hooks/exhaustive-deps
  const [tuoiTu, tuoiDen] = loc.tuoi ? loc.tuoi.split('-').map(Number) : [null, null]
  const p = useMemo(() => ({
    tim: timTre.trim() || null, trang_thai: pv ? (TAB_PV.find((x) => x.v === gd) || TAB_PV[0]).ds : gd ? (gd === 'dang_xu_ly' ? ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat', 'can_nhac', 'chua_lien_lac'] : [gd]) : null,
    vi_tri_id: loc.vi_tri_id || null, khu_vuc: loc.khu_vuc || null, tuoi_tu: tuoiTu, tuoi_den: tuoiDen, danh_gia: loc.danh_gia || null,
    hoc_van: loc.hoc_van || null, ma_nguon: loc.ma_nguon || null, phu_trach: loc.phu_trach || null, uu_tien: loc.uu_tien ? true : null,
    co_video: loc.co_video === 'co' ? true : loc.co_video === 'khong' ? false : null, ung_tuyen_lai: loc.lan === 'lai' ? true : loc.lan === 'dau' ? false : null, tu: khoangNgay[0], den: khoangNgay[1], sap_xep: sapXep
  }), [timTre, gd, loc, khoangNgay, sapXep, tuoiTu, tuoiDen, pv])
  const L = useDanhSach(p, s.nhip)
  const ds = L.dong
  const dem = L.dem
  const tongTatCa = Object.values(dem).reduce((a, b) => a + b, 0)
  const dangXuLy = ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat', 'can_nhac', 'chua_lien_lac'].reduce((a, k) => a + (dem[k] || 0), 0)
  const coBan = rongLon && kieu === 'bang' && !pv
  const banLam = coBan && !anCT

  useEffect(() => { setChon([]) }, [JSON.stringify(p)])
  useEffect(() => { try { sessionStorage.setItem('ns-td-thu-tu', JSON.stringify(ds.map((r) => r.id))) } catch (e) { /* bỏ qua */ } }, [ds])
  // Bàn làm việc: luôn có 1 hồ sơ đang xem (mặc định hồ sơ đầu tiên)
  useEffect(() => { if (banLam && ds.length && (!xemId || !ds.some((r) => r.id === xemId))) setXemId(ds[0].id) }, [banLam, ds, xemId])
  useEffect(() => { const q = new URLSearchParams(qs); if (banLam && xemId) q.set('xem', xemId); else q.delete('xem'); if (q.toString() !== qs.toString()) setQs(q, { replace: true }) }, [xemId, banLam]) // eslint-disable-line react-hooks/exhaustive-deps
  // Cuộn tới cuối danh sách thì tải thêm
  useEffect(() => {
    const el = chanRef.current
    if (!el) return
    const ob = new IntersectionObserver((e) => { if (e[0].isIntersecting) L.taiThem() }, { rootMargin: '400px' })
    ob.observe(el)
    return () => ob.disconnect()
  })

  const [doiGD, giaoDienGD] = useDoiGiaiDoan({ xong: (ids, tt) => { L.sua((d) => d.map((r) => (ids.includes(r.id) ? { ...r, trang_thai: tt } : r))); setChon([]); L.lamMoi(); s.taiDem(); setNhipCT((n) => n + 1) }, henPV: (r) => setHenCho(r) })

  const datGD = (v) => { const q = new URLSearchParams(qs); if (v) q.set('gd', v); else q.delete('gd'); q.delete('tim'); setQs(q, { replace: true }) }
  const mo = (r) => {
    if (pv) return nav('/quantri/ung-vien/' + r.id + (GD_MO.includes(r.trang_thai) || r.trang_thai === 'dat' ? '/cham' : ''))
    if (coBan) {
      if (banLam && xemId === r.id) return setAnCT(true) // bấm lại hồ sơ đang xem → thu gọn chi tiết
      setXemId(r.id); return setAnCT(false)
    }
    if (rongLon) return setMoTo(r.id)
    nav('/quantri/ung-vien/' + r.id)
  }
  const viTriXem = ds.findIndex((r) => r.id === xemId)
  const dichChuyen = (b) => {
    if (!ds.length) return
    const i = Math.max(0, Math.min(ds.length - 1, (viTriXem < 0 ? -1 : viTriXem) + b))
    if (banLam) setXemId(ds[i].id)
    document.querySelector('[data-id="' + ds[i].id + '"]')?.scrollIntoView({ block: 'nearest' })
    if (i >= ds.length - 5) L.taiThem()
  }
  usePhim(['/'], (e) => { e.preventDefault(); timRef.current?.focus() })
  usePhim(['Escape'], () => setXemVideo(null), !!xemVideo)
  usePhim(['ArrowDown', 'ArrowUp', 'j', 'k', 'x'], (e) => {
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); dichChuyen(1) }
    if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); dichChuyen(-1) }
    if (e.key === 'x' && xemId && s.coSua) setChon((c) => (c.includes(xemId) ? c.filter((y) => y !== xemId) : [...c, xemId]))
  }, banLam && !moTo && !henCho && !xemVideo)

  async function doiSao(r) {
    const v = !r.uu_tien
    L.sua((d) => d.map((x) => (x.id === r.id ? { ...x, uu_tien: v } : x)))
    try { await rpc('td_cap_nhat_ho_so', { p_id: r.id, p: { uu_tien: v } }); bao(v ? 'Đã đánh dấu ưu tiên ' + r.ho_ten : 'Đã bỏ ưu tiên'); if (xemId === r.id) setNhipCT((n) => n + 1) }
    catch (e) { L.sua((d) => d.map((x) => (x.id === r.id ? { ...x, uu_tien: !v } : x))); bao(e.message, 'loi') }
  }

  async function xoaNhieu() {
    const ds2 = ds.filter((r) => chon.includes(r.id))
    const ok = await xacNhan({
      tieuDe: 'Xóa vĩnh viễn ' + chon.length + ' hồ sơ?',
      moTa: ds2.slice(0, 3).map((r) => r.ho_ten).join(', ') + (ds2.length > 3 ? ' và ' + (ds2.length - 3) + ' người khác' : ''),
      noiDung: <Bao kieu="loi">Toàn bộ thông tin, ảnh, video, lịch, phiếu chấm và email của các hồ sơ này sẽ bị xóa, không khôi phục được. Bản sao vẫn được lưu trong Nhật ký.</Bao>,
      nut: 'Xóa vĩnh viễn', nguyHiem: true
    })
    if (!ok) return
    try {
      const n = await rpc('td_xoa_ho_so', { p_ids: chon })
      for (const id of chon) { try { await xoaTep(await dsTep(id)) } catch { /* bỏ qua */ } }
      bao('Đã xóa ' + n + ' hồ sơ')
      setChon([]); L.lamMoi(); s.taiDem()
    } catch (e) { bao(e.message, 'loi') }
  }

  async function xuat(chiChon) {
    setDangXuat(true)
    try {
      const r = await rpc('td_ds_ho_so', { p: { ...p, so_dong: 5000, xuat: true } })
      const dong = chiChon ? r.dong.filter((x) => chon.includes(x.id)) : r.dong
      await xuatExcel('NS-tuyen-dung-' + new Date().toISOString().slice(0, 10) + '.xlsx', [{ ten: 'Ứng viên', cot: COT_EXCEL, dong }])
      bao('Đã xuất ' + dong.length + ' hồ sơ')
    } catch (e) { bao(e.message, 'loi') }
    setDangXuat(false)
  }

  const datLoc = (k) => (v) => setLoc((l) => ({ ...l, [k]: v }))
  const soLoc = ['vi_tri_id', 'khu_vuc', 'tuoi', 'danh_gia', 'hoc_van', 'ma_nguon', 'phu_trach', 'co_video', 'uu_tien', 'lan'].filter((k) => loc[k]).length + (loc.khoang?.v ? 1 : 0)
  const tatCaChon = ds.length > 0 && ds.every((r) => chon.includes(r.id))

  // Gom nhóm (theo dữ liệu đã tải)
  const nhomDs = useMemo(() => {
    if (!nhom) return [{ ten: '', ds }]
    const m = new Map()
    const thuTuGD = Object.fromEntries(GIAI_DOAN.map((g, i) => [g.ten, i]))
    ds.forEach((r) => { const k = keyNhom(r, nhom); if (!m.has(k)) m.set(k, []); m.get(k).push(r) })
    let arr = [...m.entries()].map(([ten, d]) => ({ ten, ds: d }))
    if (nhom === 'gd') arr.sort((a, b) => (thuTuGD[a.ten] ?? 99) - (thuTuGD[b.ten] ?? 99))
    if (nhom === 'vi_tri' || nhom === 'khu_vuc') arr.sort((a, b) => b.ds.length - a.ds.length)
    return arr
  }, [ds, nhom])

  const dongUV = (r) => {
    const daChon = chon.includes(r.id)
    const dangXem = banLam && xemId === r.id
    return (
      <div key={r.id} data-id={r.id} className={'dg' + (daChon ? ' chon' : '') + (dangXem ? ' dang-xem' : '')} onClick={() => mo(r)}>
        {s.coSua ? <button className={'o-chon' + (daChon ? ' on' : '')} onClick={(e) => { e.stopPropagation(); setChon((c) => (daChon ? c.filter((y) => y !== r.id) : [...c, r.id])) }} aria-label={'Chọn ' + r.ho_ten}>{daChon && <Check size={13} strokeWidth={3} />}</button> : <span />}
        <div className="dg-giua">
          <b className="cat">{r.ho_ten}{s.coSua
            ? <button type="button" className={'nut-sao' + (r.uu_tien ? ' on' : '')} onClick={(e) => { e.stopPropagation(); doiSao(r) }} title={r.uu_tien ? 'Bỏ ưu tiên' : 'Đánh dấu ưu tiên'} aria-label="Ưu tiên"><Star size={14} fill={r.uu_tien ? 'currentColor' : 'none'} /></button>
            : r.uu_tien && <Star size={12} className="uu-tien-sao" fill="currentColor" />}</b>
          {r.so_lan > 1
            ? <div className="dg-meta"><TagLan r={r} onMo={(x) => mo({ id: x.id, trang_thai: x.tt })} /><span className="cat">{tenNgan(r.vi_tri)} · {r.tuoi} tuổi · {r.chieu_cao}cm/{r.can_nang}kg</span></div>
            : <span className="cat">{tenNgan(r.vi_tri)} · {r.tuoi} tuổi · {r.chieu_cao}cm/{r.can_nang}kg</span>}
          <span className="cat dg-kv">{r.khu_vuc_mong_muon || r.cho_o || '—'}</span>
        </div>
        <div className="dg-anh" onClick={(e) => e.stopPropagation()}>
          {(r.anh_ds?.length ? r.anh_ds : r.anh ? [r.anh] : []).slice(0, 2).map((a, k) => <AnhNho key={k} path={a} alt={r.ho_ten + ' ' + (k + 1)} onClick={() => mo(r)} />)}
          {!(r.anh_ds?.length || r.anh) && <Avatar ten={r.ho_ten} co="lg" />}
        </div>
        {r.video ? <NutVideo v={r.video} onClick={(e) => { e.stopPropagation(); setXemVideo({ v: r.video, ten: r.ho_ten }) }} /> : <span className="dg-vid trong" title="Chưa có video"><Film size={15} /></span>}
        <span className="dg-x dg-sdt">{fmtSdt(r.sdt)}</span>
        <span className="dg-x dg-kvx cat" title={r.cho_o || ''}>{r.khu_vuc_mong_muon || r.cho_o || '—'}</span>
        <span className="dg-x dg-pt cat">{r.phu_trach_ten || <i className="muted">—</i>}</span>
        <div className="dg-phai">
          <span className="dg-gd"><StageTag ma={r.trang_thai} /></span>
          <span className="dg-gio" title={fmtNgayGio(r.nop_luc)}>{fmtThoiDiem(r.nop_luc)}</span>
          <span className={'dg-diem' + (r.diem_tb == null ? ' trong' : '')}>{r.diem_tb != null ? <Diem v={r.diem_tb} /> : '—'}</span>
        </div>
        <div className="dg-nhanh" onClick={(e) => e.stopPropagation()}>
          {s.coCham && GD_MO.includes(r.trang_thai) && <button type="button" className="nut-pv-nho" title="Phỏng vấn ngay — mở phiếu" onClick={() => nav('/quantri/ung-vien/' + r.id + '/cham')}><Mic size={15} /><span className="chu">{['da_pv', 'de_xuat', 'du_bi', 'can_nhac'].includes(r.trang_thai) ? 'Phiếu' : r.trang_thai === 'chua_lien_lac' ? 'Gọi lại' : 'Phỏng vấn'}</span></button>}
          {s.coSua && GD_MO.includes(r.trang_thai) && <button type="button" className="nut-loai-nho" title="Loại hồ sơ" aria-label="Loại" onClick={() => doiGD([r.id], 'khong_dat', [r])}><X size={14} strokeWidth={3} /></button>}
          {r.trang_thai === 'dat' && s.coSua && <button type="button" className="nut-pv-nho xanh" title="Xác nhận nhận việc" onClick={() => doiGD([r.id], 'nhan_viec', [r])}><Store size={15} /><span className="chu">Nhận việc</span></button>}
        </div>
      </div>
    )
  }

  const danhSach = L.dangTai && !ds.length ? (
    <div className="ds-gon" style={{ padding: 14 }}><div className="cot">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={70} />)}</div></div>
  ) : !ds.length ? (
    <div className="card"><Empty icon={Search} tieuDe="Không có hồ sơ phù hợp">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</Empty></div>
  ) : kieu === 'the' ? (
    <div className="luoi-the">
      {ds.map((r) => (
        <div key={r.id} className="the-uv" data-id={r.id} onClick={() => mo(r)}>
          <div className="anh">
            {r.anh ? <AnhKho path={r.anh} alt={r.ho_ten} /> : <div className="hang" style={{ height: '100%', justifyContent: 'center' }}><Avatar ten={r.ho_ten} co="xl" /></div>}
            <div className="tren"><StageTag ma={r.trang_thai} />{r.diem_tb != null && <Diem v={r.diem_tb} />}<span onClick={(e) => e.stopPropagation()}><TagLan r={r} onMo={(x) => mo({ id: x.id, trang_thai: x.tt })} /></span></div>
            <div className="duoi"><b className="cat" style={{ display: 'block' }}>{r.ho_ten} {r.uu_tien && <Star size={13} fill="#F5A524" color="#F5A524" />}</b><span>{r.tuoi} tuổi · {r.chieu_cao}cm · {r.khu_vuc_mong_muon || r.cho_o}</span></div>
          </div>
          <div className="chan">
            <span className="nho cat gian" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{tenNgan(r.vi_tri)}</span>
            {r.video_giay != null && <span className="tag"><Film size={12} />{fmtGiay(r.video_giay)}</span>}
            <span className="nho muted">{fmtThoiDiem(r.nop_luc)}</span>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className={'ds-gon' + (!banLam && rongLon && kieu === 'bang' ? ' rong-het' : '')}>
      <div className="ds-dau dg-dau">
        {s.coSua ? <button className={'o-chon' + (tatCaChon ? ' on' : '')} onClick={() => setChon(tatCaChon ? [] : ds.map((r) => r.id))} aria-label="Chọn tất cả đã tải">{tatCaChon && <Check size={13} strokeWidth={3} />}</button> : <span />}
        <CotSX nhan={<>Ứng viên <em>{ds.length}/{L.tong}</em></>} khoa={['ten']} sapXep={sapXep} setSapXep={setSapXep} />
        <span className="h-anh">Ảnh</span>
        <span className="h-vid">Video</span>
        <span className="dg-x">Điện thoại</span>
        <span className="dg-x">Khu vực</span>
        <span className="dg-x">Phụ trách</span>
        <span className="h-gd">{banLam ? 'Trạng thái' : 'Giai đoạn'}</span>
        <CotSX className="h-gio" nhan="Nộp lúc" khoa={['moi_nhat', 'cu_nhat']} sapXep={sapXep} setSapXep={setSapXep} />
        <CotSX className="h-diem" nhan="Điểm" khoa={['diem']} sapXep={sapXep} setSapXep={setSapXep} />
        <span className="h-tt">{banLam ? '' : 'Thao tác'}</span>
      </div>
      {nhomDs.map((g) => (
        <div key={g.ten || 'tat-ca'}>
          {g.ten && <div className="ds-nhom"><span>{g.ten}</span><i>{g.ds.length}</i></div>}
          {g.ds.map(dongUV)}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">{pv ? 'Phỏng vấn' : 'Ứng viên'}</span>
          <h1><span><b>{L.tong}</b> {pv ? (TAB_PV.find((x) => x.v === gd) || TAB_PV[0]).t.toLowerCase() : 'hồ sơ'}</span>{pv ? <Link to="/quantri/phong-van/lich" className="dem-phu" style={{ textDecoration: 'none', background: 'var(--soft)', color: 'var(--ink-2)' }}>Lịch hẹn (tùy chọn) →</Link> : <><span className="dem-phu"><i />{gd ? (gd === 'dang_xu_ly' ? 'Đang xử lý' : GD[gd]?.ten) : (dem.moi || 0) + ' chờ xử lý'}</span></>}</h1>
        </div>
        {coBan && <button type="button" className={'nut-chi-tiet' + (anCT ? '' : ' on')} onClick={() => setAnCT(!anCT)} title={anCT ? 'Hiện khung chi tiết bên phải' : 'Thu gọn chi tiết — danh sách toàn màn hình'}>
          {anCT ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}<span>{anCT ? 'Hiện chi tiết' : 'Thu gọn chi tiết'}</span>
        </button>}
        <Segment trang ds={[{ v: 'bang', t: 'Danh sách', icon: LayoutList }, { v: 'the', t: 'Thẻ ảnh', icon: ImageIc }]} giaTri={kieu} onChon={setKieu} />
        {s.vaiTro !== 'phong_van' && <Btn kieu="den" orb="trai" icon={Download} loading={dangXuat} onClick={() => xuat(false)}>Xuất Excel</Btn>}
      </header>

      <div className="loc-hang">
        <label className="input-tron">
          <Search size={17} />
          <input ref={timRef} aria-label="Tìm ứng viên" placeholder="Tên, SĐT, mã hồ sơ, địa chỉ, khu vực…" value={tim} onChange={(e) => setTim(e.target.value)} />
          {tim ? <button className="icon-btn xs mem" onClick={() => setTim('')} aria-label="Xóa tìm"><X size={13} /></button> : <kbd>/</kbd>}
        </label>
        <Menu canh="trai" rong={210} nut={<Btn kieu="trang" co="md" icon={ArrowUpDown}>{SAP_XEP.find((x) => x.v === sapXep)?.t}</Btn>}>
          {(dong) => SAP_XEP.map((x) => <button key={x.v} className={sapXep === x.v ? 'on' : ''} onClick={() => { setSapXep(x.v); dong() }}>{x.t}{sapXep === x.v && <Check size={15} style={{ marginLeft: 'auto' }} />}</button>)}
        </Menu>
        <Menu canh="trai" rong={210} nut={<Btn kieu={nhom ? 'den' : 'trang'} co="md" icon={Layers}>{nhom ? NHOM.find((x) => x.v === nhom)?.t : 'Nhóm'}</Btn>}>
          {(dong) => NHOM.map((x) => <button key={x.v} className={nhom === x.v ? 'on' : ''} onClick={() => { setNhom(x.v); dong() }}>{x.t}{nhom === x.v && <Check size={15} style={{ marginLeft: 'auto' }} />}</button>)}
        </Menu>
      </div>

      <div className="loc-cuon thanh-loc" aria-label="Bộ lọc">
        <NutLoc nhan="Vị trí" giaTri={loc.vi_tri_id} chon={datLoc('vi_tri_id')} ds={[{ v: '', t: 'Tất cả vị trí' }, ...s.dm.viTri.map((v) => ({ v: String(v.id), t: v.ten }))]} />
        <NutLoc nhan="Khu vực" giaTri={loc.khu_vuc} chon={datLoc('khu_vuc')} tim rong={260} ds={[{ v: '', t: 'Mọi khu vực' }, ...(goiY?.khu_vuc || []).map((k) => ({ v: k.ten, t: k.ten, n: k.n }))]} />
        <NutLoc nhan="Tuổi" giaTri={loc.tuoi} chon={datLoc('tuoi')} ds={TUOI} />
        <NutLoc nhan="Đánh giá" giaTri={loc.danh_gia} chon={datLoc('danh_gia')} ds={DANH_GIA} />
        <ChonNgay giaTri={loc.khoang} onDoi={(v) => setLoc((l) => ({ ...l, khoang: v }))} />
        <NutLoc nhan="Số lần nộp" giaTri={loc.lan || ''} chon={datLoc('lan')} ds={[{ v: '', t: 'Tất cả' }, { v: 'lai', t: 'Ứng tuyển lại (≥ 2 lần)' }, { v: 'dau', t: 'Nộp lần đầu' }]} />
        <NutLoc nhan="Video" giaTri={loc.co_video} chon={datLoc('co_video')} ds={VIDEO} />
        <NutLoc nhan="Học vấn" giaTri={loc.hoc_van} chon={datLoc('hoc_van')} ds={[{ v: '', t: 'Mọi trình độ' }, ...(goiY?.hoc_van || []).map((k) => ({ v: k.ten, t: k.ten, n: k.n }))]} />
        <NutLoc nhan="Kênh" giaTri={loc.ma_nguon} chon={datLoc('ma_nguon')} rong={260} ds={[{ v: '', t: 'Mọi kênh / mã QR' }, ...s.dm.nguon.map((n) => ({ v: n.ma, t: n.ten }))]} />
        <NutLoc nhan="Phụ trách" giaTri={loc.phu_trach} chon={datLoc('phu_trach')} ds={[{ v: '', t: 'Tất cả' }, { v: 'toi', t: 'Của tôi' }, { v: 'chua', t: 'Chưa phân công' }, ...s.dm.nhanSu.filter((n) => n.hoat_dong).map((n) => ({ v: n.id, t: n.ho_ten }))]} />
        <button type="button" className={'nut-loc nl-don' + (loc.uu_tien ? ' on' : '')} onClick={() => setLoc((l) => ({ ...l, uu_tien: !l.uu_tien }))}><Star size={14} fill={loc.uu_tien ? 'currentColor' : 'none'} />Ưu tiên</button>
        {soLoc > 0 && <button type="button" className="nl-xoa" onClick={() => setLoc(LOC_TRONG)}><X size={14} />Xóa {soLoc} bộ lọc</button>}
      </div>

      {pv ? (
        <div className="loc-cuon" role="tablist" aria-label="Nhóm phỏng vấn">
          {TAB_PV.map((t) => (
            <button key={t.v} role="tab" aria-selected={gd === t.v} className={'chip trang' + (gd === t.v ? ' on' : '')} onClick={() => datGD(t.v)}>
              {t.t}<span className="dem">{t.ds.reduce((a, k) => a + (dem[k] || 0), 0)}</span>
            </button>
          ))}
        </div>
      ) : (
      <div className="quy-trinh-loc" role="tablist" aria-label="Quy trình tuyển dụng">
        <div className="qt-trai">
          <button role="tab" aria-selected={gd === ''} className={'qt-nho' + (gd === '' ? ' on' : '')} onClick={() => datGD('')}><span>Tất cả</span><b>{tongTatCa}</b></button>
          <button role="tab" aria-selected={gd === 'dang_xu_ly'} className={'qt-nho' + (gd === 'dang_xu_ly' ? ' on' : '')} onClick={() => datGD('dang_xu_ly')}><span>Đang xử lý</span><b>{dangXuLy}</b></button>
        </div>
        <div className="qt-buoc">
          {['moi', 'hen_pv', 'dat', 'nhan_viec'].map((m, i) => (
            <button key={m} role="tab" aria-selected={gd === m} className={'qt-o' + (gd === m ? ' on' : '') + (i === 0 ? ' dau' : '')} style={{ '--mau': GD[m].cham }} onClick={() => datGD(gd === m ? '' : m)}>
              <span className="qt-so">{i + 1}</span>
              <span className="qt-ten"><i>Bước {i + 1}</i>{GD[m].ten}</span>
              <b className="qt-dem">{dem[m] || 0}</b>
            </button>
          ))}
        </div>
        <div className="qt-ket">
          {['khong_dat', 'rut', ...(dem.du_bi ? ['du_bi'] : [])].map((m) => (
            <button key={m} role="tab" aria-selected={gd === m} className={'qt-ket-o' + (gd === m ? ' on' : '')} onClick={() => datGD(gd === m ? '' : m)}>
              <i style={{ background: GD[m].cham }} />{GD[m].ten}<b>{dem[m] || 0}</b>
            </button>
          ))}
        </div>
      </div>
      )}

      <div className={banLam ? 'ban-lam' : ''}>
        <div className={banLam ? 'ban-trai' : ''}>
          {danhSach}
          <div ref={chanRef} className="chan-bang">{L.dangTai && ds.length > 0 ? <span className="nho muted">Đang tải thêm…</span> : !L.het && ds.length > 0 ? <Btn kieu="trang" co="sm" onClick={L.taiThem}>Tải thêm ({L.tong - ds.length})</Btn> : ds.length > 0 ? <span className="nho muted">Đã hiện hết {L.tong} hồ sơ</span> : null}</div>
        </div>
        {banLam && (
          <div className="ban-phai">
            {xemId ? <HoSoChiTiet key={xemId} id={xemId} nhung nhip={nhipCT} onDoi={() => { L.lamMoi(); s.taiDem() }}
              phai={<><IconBtn icon={Maximize2} nhan="Mở trang riêng" kieu="kinh" onClick={() => nav('/quantri/ung-vien/' + xemId)} /><IconBtn icon={PanelRightClose} nhan="Thu gọn chi tiết — xem danh sách toàn màn hình" kieu="kinh" onClick={() => setAnCT(true)} /></>} /> : <div className="card"><Empty icon={Search} tieuDe="Chọn một ứng viên ở danh sách" /></div>}
          </div>
        )}
      </div>

      {chon.length > 0 && (
        <div className="thanh-chon" role="toolbar" aria-label="Thao tác hàng loạt">
          <b>Đã chọn {chon.length}</b>
          <MenuGiaiDoan nut={<Btn kieu="trang" co="sm" icon={ArrowRight}>Chuyển giai đoạn</Btn>} chon={(tt) => doiGD(chon, tt, ds.filter((r) => chon.includes(r.id)))} />
          <Menu canh="trai" rong={240} nut={<Btn kieu="trang" co="sm" icon={UserCheck}>Phân công</Btn>}>
            {(dong) => <>
              <div className="tieu">Người phụ trách</div>
              {s.dm.nhanSu.filter((n) => n.hoat_dong).map((n) => (
                <button key={n.id} onClick={async () => { dong(); try { for (const id of chon) await rpc('td_cap_nhat_ho_so', { p_id: id, p: { nguoi_phu_trach: n.id } }); bao('Đã phân công ' + chon.length + ' hồ sơ cho ' + n.ho_ten); setChon([]); L.lamMoi() } catch (e) { bao(e.message, 'loi') } }}>{n.ho_ten}</button>
              ))}
            </>}
          </Menu>
          {s.vaiTro !== 'phong_van' && <Btn kieu="trang" co="sm" icon={Download} onClick={() => xuat(true)}>Excel</Btn>}
          {s.laToiCao && <Btn kieu="trang" co="sm" icon={Trash2} className="nut-xoa-hs" onClick={xoaNhieu}>Xóa</Btn>}
          <button className="icon-btn sm kinh" onClick={() => setChon([])} aria-label="Bỏ chọn"><X size={16} /></button>
        </div>
      )}

      {moTo && (
        <div className="man-ho-so" onMouseDown={(e) => { if (e.target === e.currentTarget) setMoTo(null) }}>
          <div className="mhs-hop">
            <HoSoChiTiet key={moTo} id={moTo} nhung nhip={nhipCT} onDoi={() => { L.lamMoi(); s.taiDem() }} phai={<IconBtn icon={X} nhan="Đóng" kieu="kinh" onClick={() => setMoTo(null)} />} />
          </div>
        </div>
      )}
      {xemVideo && (
        <div className="man-video" onMouseDown={(e) => { if (e.target === e.currentTarget) setXemVideo(null) }}>
          <div className="mv-hop">
            <div className="hang" style={{ marginBottom: 10 }}><b className="gian" style={{ color: '#fff', fontSize: 15 }}>Video · {xemVideo.ten}</b><IconBtn icon={X} nhan="Đóng" kieu="kinh" onClick={() => setXemVideo(null)} /></div>
            <TrinhPhat v={xemVideo.v} tuChay />
          </div>
        </div>
      )}
      {giaoDienGD}
      {henCho && <LichModal hoSo={henCho} dong={() => setHenCho(null)} xong={() => { setHenCho(null); L.lamMoi(); s.taiDem(); setNhipCT((n) => n + 1) }} />}
    </>
  )
}
