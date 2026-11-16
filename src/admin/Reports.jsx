import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CalendarDays, CalendarRange, Check, ChevronDown, Filter, ChevronLeft, ChevronRight, MapPin, TrendingUp, Download, Lock, Search, Store, Users, X } from 'lucide-react'
import { docBang, rpc } from '../lib/api'
import { useAsync, useDebounced, useLS, usePhim } from '../lib/hooks'
import { congNgay, fmtDiem, fmtSdt, khongDau, ngayVN, phanTram, thu } from '../lib/format'
import { xuatExcel } from '../lib/excel'
import { doanKhuVuc, KV_CHINH, KV_CHUA_RO, tenKV } from '../lib/khuVuc'
import { GD } from '../lib/stages'
import { Avatar, Btn, Empty, IconBtn, Menu, Skeleton, useToast } from '../components/ui'
import { useStaff } from './context'
import { HoSoChiTiet } from './Profile'

/* ---------- Nhóm trạng thái dùng chung cho toàn bộ báo cáo ----------
   cho   : chưa có kết quả cuối (mới, phỏng vấn, chờ kết quả, cân nhắc, chưa liên lạc…)
   duyet : trúng tuyển — đã duyệt, CHƯA xác nhận nhận việc (có ngày nhận việc dự kiến)
   nhan  : đã thực tế nhận việc (đã bấm “Nhận việc”, có hồ sơ nhân viên)
   khong : không đạt · rut: ứng viên rút hồ sơ */
export const NHOM = {
  cho: { ten: 'Chờ xử lý', mau: '#E0820B', bg: '#FFF3E0', fg: '#8A4B00' },
  duyet: { ten: 'Đã duyệt · chờ nhận việc', ngan: 'Đã duyệt', mau: '#3B6FE0', bg: '#EAF0FD', fg: '#2E5BC9' },
  nhan: { ten: 'Đã nhận việc', mau: '#12A37F', bg: '#E3F5EE', fg: '#0E7F63' },
  khong: { ten: 'Không đạt', mau: '#E05252', bg: '#FDECEC', fg: '#B42318' },
  rut: { ten: 'Rút hồ sơ', mau: '#CFC9D4', bg: '#F4F1F5', fg: '#6F6777' }
}
const THU_TU = ['cho', 'duyet', 'nhan', 'khong', 'rut']
const nhomCua = (tt) => (tt === 'nhan_viec' ? 'nhan' : tt === 'dat' ? 'duyet' : tt === 'khong_dat' ? 'khong' : tt === 'rut' ? 'rut' : 'cho')

const KHOANG = [
  { v: 'hom_nay', t: 'Hôm nay' }, { v: '7', t: '7 ngày' }, { v: 'thang', t: 'Tháng này' }, { v: 'thang_truoc', t: 'Tháng trước' },
  { v: '30', t: '30 ngày' }, { v: '90', t: '90 ngày' }, { v: 'nam', t: 'Năm nay' }, { v: 'tuy_chon', t: 'Tự chọn' }
]
function khoang(ma, hn) {
  const [y, m] = hn.split('-').map(Number)
  const dau = (yy, mm) => yy + '-' + String(mm).padStart(2, '0') + '-01'
  if (ma === 'hom_nay') return [hn, hn]
  if (ma === '7') return [congNgay(hn, -6), hn]
  if (ma === '30') return [congNgay(hn, -29), hn]
  if (ma === '90') return [congNgay(hn, -89), hn]
  if (ma === 'nam') return [y + '-01-01', hn]
  if (ma === 'thang_truoc') { const yy = m === 1 ? y - 1 : y, mm = m === 1 ? 12 : m - 1; return [dau(yy, mm), congNgay(dau(y, m), -1)] }
  return [dau(y, m), hn]
}
const dm = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '—')
const dmy = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '')

function TagNhom({ n, quaHan }) {
  const x = NHOM[n]
  if (quaHan) return <span className="bc-tt qua-han"><AlertTriangle size={11} strokeWidth={2.6} />Quá hẹn</span>
  return <span className="bc-tt" style={{ background: x.bg, color: x.fg }}><i style={{ background: x.mau }} />{x.ngan || x.ten}</span>
}

// Gắn khu vực, cửa hàng, nhóm trạng thái cho mỗi dòng
function lamGiau(ds, chMap, hn) {
  return (ds || []).map((r) => {
    const ch = r.ch ? chMap.get(r.ch) : null
    const kv = ch?.khu_vuc || doanKhuVuc(r.kvm) || doanKhuVuc(r.o) || KV_CHUA_RO
    const nhom = nhomCua(r.tt)
    const ngayNV = r.tn || r.dk || null
    return { ...r, kv, chTen: ch?.ten || r.ch || null, nhom, ngayNV, quaHan: nhom === 'duyet' && !!r.dk && r.dk < hn, duKien: nhom === 'duyet' && !!r.dk && r.dk >= hn }
  })
}
// Mỗi người (SĐT) chỉ giữ hồ sơ mới nhất trong tập
function motNguoi(ds) {
  const m = new Map()
  for (const r of ds) { const c = m.get(r.sdt); if (!c || r.lan > c.lan) m.set(r.sdt, r) }
  return [...m.values()]
}
const demNhom = (ds) => ds.reduce((a, r) => { a[r.nhom] = (a[r.nhom] || 0) + 1; return a }, {})

/* ---------- Chọn nhiều (kiểu bộ lọc Google Sheets) ---------- */
function ChonNhieu({ nhan, icon: Ic, ds, giaTri, onDoi, tim, rong = 290, nut, canh = 'phai' }) {
  const [q, setQ] = useState('')
  const loc = tim && q ? ds.filter((x) => khongDau(x.t).includes(khongDau(q))) : ds
  const co = giaTri.length > 0
  const ten1 = co ? (ds.find((x) => x.v === giaTri[0])?.t || giaTri[0]) : ''
  return (
    <Menu canh={canh} rong={rong} nut={nut ? nut(co) : (
      <button type="button" className={'bc-pill' + (co ? ' on' : '')}>
        {Ic && <Ic size={15} />}<span className="cat">{co ? (giaTri.length === 1 ? ten1 : nhan + ' · ' + giaTri.length) : nhan}</span><ChevronDown size={14} className="mui" />
      </button>)}>
      {(dong) => <>
        <div className="bc-cn-dau"><b>{nhan}</b>{co && <button type="button" className="bc-cn-bo" onClick={() => onDoi([])}>Bỏ chọn</button>}</div>
        {tim && <div className="bc-cn-tim"><input autoFocus className="o-tim-menu" placeholder="Tìm…" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
        <div className="bc-cn-ds">
          {loc.map((x) => {
            const on = giaTri.includes(x.v)
            return (
              <button key={x.v} type="button" className={'bc-cn-o' + (on ? ' on' : '') + (!x.n && !on ? ' mo' : '')} onClick={() => onDoi(on ? giaTri.filter((y) => y !== x.v) : [...giaTri, x.v])}>
                <i className="o-tick">{on && <Check size={12} strokeWidth={3} />}</i><span className="gian cat">{x.t}</span>{x.n != null && <em>{x.n}</em>}
              </button>
            )
          })}
          {!loc.length && <p className="nho muted" style={{ padding: 10 }}>Không có lựa chọn</p>}
        </div>
        <div className="bc-cn-chan"><button type="button" className="bc-cn-xong" onClick={dong}>Xong</button></div>
      </>}
    </Menu>
  )
}

/* ---------- Chọn kỳ báo cáo: khoảng thời gian + mốc tính ---------- */
function ChonKy({ ma, setMa, tuy, setTuy, tu, den, moc, setMoc }) {
  const nhan = KHOANG.find((k) => k.v === ma)?.t
  return (
    <Menu canh="phai" rong={330} nut={(
      <button type="button" className="bc-pill ky">
        <CalendarRange size={16} />
        <span className="bc-ky-chu"><b>{nhan}</b><small>{dm(tu)}{tu !== den ? ' – ' + dm(den) : ''} · theo {moc === 'nop' ? 'ngày nộp' : 'ngày nhận việc'}</small></span>
        <ChevronDown size={14} className="mui" />
      </button>)}>
      {(dong) => (
        <div className="bc-ky">
          <div className="tieu">Tính theo</div>
          <div className="bc-moc rong">
            <button type="button" className={moc === 'nop' ? 'on' : ''} onClick={() => setMoc('nop')}>Ngày nộp hồ sơ</button>
            <button type="button" className={moc === 'nhan_viec' ? 'on' : ''} onClick={() => setMoc('nhan_viec')}>Ngày nhận việc</button>
          </div>
          <div className="tieu">Khoảng thời gian</div>
          <div className="bc-ky-luoi">
            {KHOANG.filter((k) => k.v !== 'tuy_chon').map((k) => <button key={k.v} type="button" className={ma === k.v ? 'on' : ''} onClick={() => { setMa(k.v); dong() }}>{k.t}{ma === k.v && <Check size={13} strokeWidth={3} />}</button>)}
          </div>
          <div className="tieu">Tự chọn từ – đến</div>
          <div className="bc-ky-tu">
            <input type="date" value={(ma === 'tuy_chon' ? tuy[0] : tu) || ''} onChange={(e) => { setTuy([e.target.value, ma === 'tuy_chon' ? tuy[1] : den]); setMa('tuy_chon') }} aria-label="Từ ngày" />
            <span>→</span>
            <input type="date" value={(ma === 'tuy_chon' ? tuy[1] : den) || ''} onChange={(e) => { setTuy([ma === 'tuy_chon' ? tuy[0] : tu, e.target.value]); setMa('tuy_chon') }} aria-label="Đến ngày" />
          </div>
        </div>
      )}
    </Menu>
  )
}

/* ---------- Thanh tỉ lệ xếp chồng ---------- */
function ThanhTiLe({ dem, cao = 8 }) {
  const tong = THU_TU.reduce((a, k) => a + (dem[k] || 0), 0)
  if (!tong) return <div className="bc-thanh trong" style={{ height: cao }} />
  return (
    <div className="bc-thanh" style={{ height: cao }}>
      {THU_TU.filter((k) => dem[k]).map((k) => <i key={k} title={NHOM[k].ten + ': ' + dem[k]} style={{ flexGrow: dem[k], background: NHOM[k].mau }} />)}
    </div>
  )
}

/* ---------- Biểu đồ xu hướng: hồ sơ nộp & đạt theo ngày / tuần ---------- */
function XuHuong({ ds, tu, den }) {
  const [hv, setHv] = useState(null)
  const soNgay = Math.round((new Date(den) - new Date(tu)) / 864e5) + 1
  const theoTuan = soNgay > 62
  const cot = useMemo(() => {
    const m = new Map()
    const khoa = (ngay) => {
      if (!theoTuan) return ngay
      const d = new Date(ngay + 'T00:00:00Z'); const t = (d.getUTCDay() + 6) % 7
      return congNgay(ngay, -t)
    }
    for (let i = 0, n = theoTuan ? Math.ceil(soNgay / 7) + 1 : soNgay; i < n; i++) {
      const ng = theoTuan ? khoa(congNgay(tu, i * 7)) : congNgay(tu, i)
      if (ng > den) break
      if (!m.has(ng)) m.set(ng, { k: ng, nop: 0, dat: 0 })
    }
    for (const r of ds) {
      const o = m.get(khoa(r.nop)); if (!o) continue
      o.nop++; if (r.nhom === 'duyet' || r.nhom === 'nhan') o.dat++
    }
    return [...m.values()]
  }, [ds, tu, den, theoTuan, soNgay])
  const max = Math.max(1, ...cot.map((x) => x.nop))
  const buoc = Math.ceil(cot.length / 12)
  if (soNgay < 2) return <p className="nho muted" style={{ padding: '18px 0' }}>Chọn khoảng từ 2 ngày trở lên để xem xu hướng.</p>
  return (
    <div className="bc-xu">
      <div className="bc-xu-cot" onMouseLeave={() => setHv(null)}>
        {[0.5, 1].map((g) => <span key={g} className="bc-luoi" style={{ bottom: g * 100 + '%' }}><em>{Math.round(max * g)}</em></span>)}
        {cot.map((x, i) => (
          <div key={x.k} className={'c' + (hv === i ? ' hv' : '')} onMouseEnter={() => setHv(i)}>
            <span className="t nop" style={{ height: (x.nop / max) * 100 + '%' }} />
            <span className="t dat" style={{ height: (x.dat / max) * 100 + '%' }} />
            {hv === i && <span className="goi-y-bd">{theoTuan ? 'Tuần ' + dm(x.k) : thu(x.k, true) + ' ' + dm(x.k)}<br /><b>{x.nop}</b> hồ sơ · <b>{x.dat}</b> đạt</span>}
          </div>
        ))}
      </div>
      <div className="bc-xu-nhan">{cot.map((x, i) => <span key={x.k}>{i % buoc === 0 ? dm(x.k) : ''}</span>)}</div>
    </div>
  )
}

/* ---------- Lịch nhận việc ---------- */
function LichNhanViec({ thang, setThang, ds, hn, ngayChon, setNgayChon, dangTai }) {
  const [y, m] = thang.split('-').map(Number)
  const dau = thang + '-01'
  const lui = (new Date(dau + 'T00:00:00Z').getUTCDay() + 6) % 7
  const batDau = congNgay(dau, -lui)
  const soNgayThang = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const soO = Math.ceil((lui + soNgayThang) / 7) * 7
  const theoNgay = useMemo(() => {
    const g = new Map()
    for (const r of ds) { if (!r.ngayNV) continue; const o = g.get(r.ngayNV) || { n: 0, nhan: 0, du: 0, qua: 0 }; o.n++; if (r.nhom === 'nhan') o.nhan++; else if (r.quaHan) o.qua++; else o.du++; g.set(r.ngayNV, o) }
    return g
  }, [ds])
  const maxN = Math.max(1, ...[...theoNgay.values()].map((x) => x.n))
  const tongThang = [...theoNgay.entries()].filter(([k]) => k.startsWith(thang)).reduce((a, [, v]) => a + v.n, 0)
  const doiThang = (b) => { const d = new Date(Date.UTC(y, m - 1 + b, 1)); setThang(d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')); setNgayChon(null) }
  return (
    <section className="card bc-lich">
      <div className="bc-the-dau">
        <h2><CalendarDays size={17} />Lịch nhận việc</h2>
        <span className="bc-dem-nho">{tongThang} người trong tháng</span>
        <span className="gian" />
        <div className="bc-thang">
          <IconBtn icon={ChevronLeft} nhan="Tháng trước" co="sm" onClick={() => doiThang(-1)} />
          <b>Tháng {m}/{y}</b>
          <IconBtn icon={ChevronRight} nhan="Tháng sau" co="sm" onClick={() => doiThang(1)} />
          {thang !== hn.slice(0, 7) && <button type="button" className="bc-hom-nay" onClick={() => { setThang(hn.slice(0, 7)); setNgayChon(hn) }}>Hôm nay</button>}
        </div>
      </div>
      <div className="bc-lich-chu">
        <span><i style={{ background: NHOM.duyet.mau }} />Dự kiến</span>
        <span><i style={{ background: NHOM.nhan.mau }} />Đã nhận việc</span>
        <span><i style={{ background: NHOM.khong.mau }} />Quá hẹn chưa xác nhận</span>
      </div>
      <div className={'bc-lich-luoi' + (dangTai ? ' dang-tai' : '')}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((t) => <span key={t} className="bc-thu">{t}</span>)}
        {Array.from({ length: soO }, (_, i) => {
          const ng = congNgay(batDau, i)
          const o = theoNgay.get(ng)
          const ngoai = !ng.startsWith(thang)
          const muc = o ? 0.1 + 0.32 * (o.n / maxN) : 0
          return (
            <button key={ng} type="button" disabled={!o && ngoai}
              className={'bc-o' + (ngoai ? ' ngoai' : '') + (ng === hn ? ' hom-nay' : '') + (ngayChon === ng ? ' chon' : '') + (o ? ' co' : '') + (i % 7 >= 5 ? ' cuoi-tuan' : '')}
              style={o ? { '--muc': muc } : null}
              onClick={() => setNgayChon(ngayChon === ng ? null : ng)}
              aria-label={dm(ng) + (o ? ': ' + o.n + ' người nhận việc' : '')}>
              <span className="bc-o-ngay">{Number(ng.slice(8, 10))}</span>
              {o && <b className="bc-o-so">{o.n}</b>}
              {o && <span className="bc-o-cham">{o.du > 0 && <i style={{ background: NHOM.duyet.mau }} />}{o.nhan > 0 && <i style={{ background: NHOM.nhan.mau }} />}{o.qua > 0 && <i style={{ background: NHOM.khong.mau }} />}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DongNguoi({ r, onMo, hienNgay }) {
  return (
    <button type="button" className="bc-nguoi" onClick={() => onMo(r.id)}>
      <span className="bc-av" style={{ background: NHOM[r.nhom].bg, color: NHOM[r.nhom].fg }}>{String(r.ten || '?').trim().split(/\s+/).pop()[0]}</span>
      <span className="gian">
        <b className="cat">{r.ten}</b>
        <small className="cat">{r.chTen ? <><Store size={11} />{r.chTen}</> : 'Chưa có cửa hàng'} · {tenKV(r.kv)}</small>
      </span>
      <span className="bc-nguoi-phai">
        {hienNgay && <small>{thu(r.ngayNV, true)} {dm(r.ngayNV)}</small>}
        {r.gio && !hienNgay && <small>{r.gio}</small>}
        <TagNhom n={r.nhom} quaHan={r.quaHan} />
      </span>
    </button>
  )
}

/* ---------- Bảng danh sách chi tiết ---------- */
const COT = [
  { k: 'ten', t: 'Ứng viên', lay: (r) => khongDau(r.ten) },
  { k: 'sdt', t: 'Điện thoại' },
  { k: 'vt', t: 'Vị trí' },
  { k: 'kv', t: 'Khu vực' },
  { k: 'chTen', t: 'Cửa hàng' },
  { k: 'nop', t: 'Ngày nộp' },
  { k: 'nhom', t: 'Trạng thái', lay: (r) => THU_TU.indexOf(r.nhom) },
  { k: 'ngayNV', t: 'Nhận việc' },
  { k: 'diem', t: 'Điểm', lay: (r) => (r.diem == null ? -1 : Number(r.diem)) }
]

export default function Reports() {
  const s = useStaff()
  const bao = useToast()
  const hn = ngayVN()
  const [ma, setMa] = useState('thang')
  const [tuy, setTuy] = useState(() => khoang('30', hn))
  const [moc, setMoc] = useState('nop')
  const [kv, setKv] = useState([])
  const [ch, setCh] = useState([])
  const [vt, setVt] = useState([])
  const [xem, setXem] = useState('')
  const [tim, setTim] = useState('')
  const [moiNguoi, setMoiNguoi] = useState(true)
  const [sx, setSx] = useState({ k: 'nop', giam: true })
  const [soHien, setSoHien] = useState(60)
  const [thang, setThang] = useState(hn.slice(0, 7))
  const [ngayChon, setNgayChon] = useState(null)
  const [moHS, setMoHS] = useState(null)
  const [mo, setMo] = useLS('ns-td-bc-mo', '')
  const [nhip, setNhip] = useState(0)
  const timTre = useDebounced(tim, 200)
  const dsRef = useRef(null)
  const [tu, den] = ma === 'tuy_chon' ? tuy : khoang(ma, hn)

  const { data: chDs } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const chMap = useMemo(() => new Map((chDs || []).map((c) => [c.ma, c])), [chDs])
  const { data: d, loading } = useAsync(() => (tu && den ? rpc('td_bc_du_lieu', { p: { tu, den, moc } }) : null), [tu, den, moc, s.nhip, nhip])
  // Lịch: lấy theo ngày nhận việc của cả lưới tháng (độc lập với khoảng thời gian bên trên)
  const lichTu = useMemo(() => { const dau = thang + '-01'; return congNgay(dau, -((new Date(dau + 'T00:00:00Z').getUTCDay() + 6) % 7)) }, [thang])
  const { data: dl, loading: taiLich } = useAsync(() => rpc('td_bc_du_lieu', { p: { tu: lichTu, den: congNgay(lichTu, 41), moc: 'nhan_viec' } }), [lichTu, s.nhip, nhip])
  const { data: dq } = useAsync(() => rpc('td_bc_du_lieu', { p: { tu: congNgay(hn, -60), den: congNgay(hn, 30), moc: 'nhan_viec' } }), [hn, s.nhip, nhip])

  usePhim(['Escape'], () => setMoHS(null), !!moHS)
  useEffect(() => { setSoHien(60) }, [xem, kv, ch, vt, timTre, moiNguoi, tu, den, moc])

  const hop = (r, bo) => (bo === 'kv' || !kv.length || kv.includes(r.kv)) && (bo === 'ch' || !ch.length || ch.includes(r.ch)) && (bo === 'vt' || !vt.length || vt.includes(String(r.vt)))
  const loc = (ds) => ds.filter((r) => hop(r))
  const tatGoc = useMemo(() => lamGiau(d?.dong, chMap, hn), [d, chMap, hn])
  // Đếm số người theo từng lựa chọn (đã áp các bộ lọc khác) — hiện cạnh mỗi lựa chọn
  const demTheo = (bo, khoa) => { const m = new Map(); for (const r of motNguoi(tatGoc.filter((x) => hop(x, bo)))) { const k = khoa(r); if (k != null) m.set(k, (m.get(k) || 0) + 1) } return m }
  const tat = useMemo(() => loc(tatGoc), [tatGoc, kv, ch, vt]) // eslint-disable-line react-hooks/exhaustive-deps
  const nguoi = useMemo(() => motNguoi(tat), [tat])
  const lichDs = useMemo(() => loc(lamGiau(dl?.dong, chMap, hn)), [dl, chMap, hn, kv, ch, vt]) // eslint-disable-line react-hooks/exhaustive-deps
  const sapToi = useMemo(() => loc(lamGiau(dq?.dong, chMap, hn)), [dq, chMap, hn, kv, ch, vt]) // eslint-disable-line react-hooks/exhaustive-deps
  const dem = useMemo(() => demNhom(nguoi), [nguoi])
  const duKien = nguoi.filter((r) => r.duKien).length
  const quaHan = nguoi.filter((r) => r.quaHan).length
  const coKQ = (dem.duyet || 0) + (dem.nhan || 0) + (dem.khong || 0)

  // Khu vực
  const theoKV = useMemo(() => {
    const g = new Map()
    for (const r of nguoi) { const o = g.get(r.kv) || { kv: r.kv, n: 0, dem: {} }; o.n++; o.dem[r.nhom] = (o.dem[r.nhom] || 0) + 1; g.set(r.kv, o) }
    return [...g.values()].sort((a, b) => (a.kv === KV_CHUA_RO) - (b.kv === KV_CHUA_RO) || b.n - a.n)
  }, [nguoi])
  const maxKV = Math.max(1, ...theoKV.map((x) => x.n))
  // Cửa hàng có người nhận việc
  const theoCH = useMemo(() => {
    const g = new Map()
    for (const r of nguoi) { if (!r.ch || !['duyet', 'nhan'].includes(r.nhom)) continue; const o = g.get(r.ch) || { ma: r.ch, ten: r.chTen, kv: r.kv, duyet: 0, nhan: 0 }; o[r.nhom]++; g.set(r.ch, o) }
    return [...g.values()].sort((a, b) => b.duyet + b.nhan - (a.duyet + a.nhan)).slice(0, 8)
  }, [nguoi])

  // Danh sách chi tiết
  const ngayDs = useMemo(() => (ngayChon ? lichDs.filter((r) => r.ngayNV === ngayChon).sort((a, b) => (a.gio || '').localeCompare(b.gio || '')) : null), [ngayChon, lichDs])
  const nguon = ngayChon ? (moiNguoi ? motNguoi(ngayDs) : ngayDs) : moiNguoi ? nguoi : tat
  const tenVT = (id) => s.tenVT(Number(id))
  const dsXem = useMemo(() => {
    const q = khongDau(timTre.trim())
    let r = nguon.filter((x) => !xem || (xem === 'du_kien' ? x.duKien : xem === 'qua_han' ? x.quaHan : x.nhom === xem))
    if (q) { const so = q.replace(/\D/g, ''); r = r.filter((x) => khongDau(x.ten).includes(q) || (so.length >= 3 && x.sdt?.includes(so)) || khongDau(x.ma || '').includes(q) || khongDau(x.chTen || '').includes(q)) }
    const c = COT.find((x) => x.k === sx.k) || COT[5]
    const lay = c.lay || ((x) => (c.k === 'vt' ? tenVT(x.vt) : x[c.k] ?? ''))
    return [...r].sort((a, b) => { const A = lay(a), B = lay(b); const kq = A < B ? -1 : A > B ? 1 : 0; return sx.giam ? -kq : kq })
  }, [nguon, xem, timTre, sx]) // eslint-disable-line react-hooks/exhaustive-deps
  const thangN = lichDs.filter((r) => r.ngayNV?.startsWith(thang)).length

  const quaHanDs = useMemo(() => motNguoi(sapToi).filter((r) => r.quaHan).sort((a, b) => a.dk.localeCompare(b.dk)), [sapToi])
  const sapToiDs = useMemo(() => motNguoi(sapToi).filter((r) => r.ngayNV >= hn && r.ngayNV <= congNgay(hn, 13)).sort((a, b) => a.ngayNV.localeCompare(b.ngayNV) || (a.gio || '').localeCompare(b.gio || '')), [sapToi, hn])

  const sap7 = sapToiDs.filter((r) => r.ngayNV <= congNgay(hn, 6)).length
  const tomLich = thangN + ' người tháng ' + Number(thang.slice(5, 7)) + ' · ' + sap7 + ' người trong 7 ngày tới'

  if (s.vaiTro === 'phong_van') return <div className="card"><Empty icon={Lock} tieuDe="Báo cáo dành cho bộ phận tuyển dụng" /></div>

  const chonXem = (v) => { setXem(xem === v ? '' : v); setTimeout(() => dsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30) }
  const coLoc = kv.length + ch.length + vt.length > 0
  const dKV = demTheo('kv', (r) => r.kv), dCH = demTheo('ch', (r) => r.ch), dVT = demTheo('vt', (r) => String(r.vt))
  const kvDs = [...new Set([...KV_CHINH, ...(chDs || []).map((c) => c.khu_vuc).filter(Boolean), ...dKV.keys()])]
    .map((k) => ({ v: k, t: k === KV_CHUA_RO ? KV_CHUA_RO : tenKV(k), n: dKV.get(k) || 0 })).sort((a, b) => b.n - a.n || (a.v === KV_CHUA_RO) - (b.v === KV_CHUA_RO))
  const chLoc = (chDs || []).filter((c) => (c.hoat_dong || dCH.has(c.ma)) && (!kv.length || kv.includes(c.khu_vuc) || ch.includes(c.ma)))
    .map((c) => ({ v: c.ma, t: c.ten, n: dCH.get(c.ma) || 0 })).sort((a, b) => b.n - a.n || a.t.localeCompare(b.t))
  const vtDs = s.dm.viTri.map((v) => ({ v: String(v.id), t: v.ten, n: dVT.get(String(v.id)) || 0 }))
  const boLoc = () => { setKv([]); setCh([]); setVt([]) }
  const nhanKhoang = dmy(tu) + (tu !== den ? ' – ' + dmy(den) : '')

  async function xuat() {
    try {
      await xuatExcel('NS-bao-cao-tuyen-dung-' + tu + '_' + den + '.xlsx', [
        { ten: 'Tổng quan', cot: [{ k: 'a', ten: 'Chỉ số', w: 34 }, { k: 'b', ten: 'Giá trị', w: 16 }], dong: [
          { a: 'Khoảng thời gian', b: nhanKhoang }, { a: 'Tính theo', b: moc === 'nop' ? 'Ngày nộp hồ sơ' : 'Ngày nhận việc' },
          { a: 'Bộ lọc', b: [...kv.map(tenKV), ...ch.map((m) => chMap.get(m)?.ten || m), ...vt.map(tenVT)].join(' · ') || 'Không' },
          { a: 'Ứng viên (người, không trùng)', b: nguoi.length }, { a: 'Hồ sơ (kể cả nộp lại)', b: tat.length },
          ...THU_TU.map((k) => ({ a: NHOM[k].ten, b: dem[k] || 0 })),
          { a: 'Dự kiến nhận việc (từ hôm nay)', b: duKien }, { a: 'Quá hẹn chưa xác nhận nhận việc', b: quaHan },
          { a: 'Tỉ lệ đạt (đạt / đã có kết quả)', b: phanTram((dem.duyet || 0) + (dem.nhan || 0), coKQ) + '%' }] },
        { ten: 'Theo khu vực', cot: [{ k: 'kv', ten: 'Khu vực', w: 28 }, { k: 'n', ten: 'Ứng viên' }, ...THU_TU.map((k) => ({ k, ten: NHOM[k].ten, w: 14 }))],
          dong: theoKV.map((x) => ({ kv: x.kv, n: x.n, ...Object.fromEntries(THU_TU.map((k) => [k, x.dem[k] || 0])) })) },
        { ten: 'Danh sách', cot: [{ k: 'ma', ten: 'Mã hồ sơ', w: 16 }, { k: 'ten', ten: 'Họ tên', w: 24 }, { k: 'sdt', ten: 'Điện thoại', w: 13 }, { k: 'vtTen', ten: 'Vị trí', w: 20 },
          { k: 'kv', ten: 'Khu vực', w: 22 }, { k: 'chTen', ten: 'Cửa hàng', w: 24 }, { k: 'nopVN', ten: 'Ngày nộp', w: 12 }, { k: 'ttTen', ten: 'Trạng thái', w: 22 },
          { k: 'ttCT', ten: 'Giai đoạn chi tiết', w: 18 }, { k: 'dkVN', ten: 'Nhận việc dự kiến', w: 14 }, { k: 'tnVN', ten: 'Nhận việc thực tế', w: 14 }, { k: 'diem', ten: 'Điểm PV' }, { k: 'lanTxt', ten: 'Lần ứng tuyển' }, { k: 'ld', ten: 'Lý do không đạt', w: 30 }],
          dong: dsXem.map((r) => ({ ...r, vtTen: tenVT(r.vt), nopVN: dmy(r.nop), ttTen: r.quaHan ? 'Quá hẹn chưa xác nhận' : NHOM[r.nhom].ten, ttCT: GD[r.tt]?.ten, dkVN: dmy(r.dk), tnVN: dmy(r.tn), lanTxt: r.sl > 1 ? r.lan + '/' + r.sl : 1 })) },
        { ten: 'Lịch nhận việc', cot: [{ k: 'ngay', ten: 'Ngày', w: 12 }, { k: 'ten', ten: 'Họ tên', w: 24 }, { k: 'sdt', ten: 'Điện thoại', w: 13 }, { k: 'chTen', ten: 'Cửa hàng', w: 24 }, { k: 'kv', ten: 'Khu vực', w: 22 }, { k: 'gio', ten: 'Giờ' }, { k: 'ttTen', ten: 'Trạng thái', w: 22 }],
          dong: lichDs.filter((r) => r.ngayNV?.startsWith(thang)).sort((a, b) => a.ngayNV.localeCompare(b.ngayNV)).map((r) => ({ ...r, ngay: dmy(r.ngayNV), ttTen: r.quaHan ? 'Quá hẹn chưa xác nhận' : NHOM[r.nhom].ten })) }
      ])
    } catch (e) { bao(e.message, 'loi') }
  }

  const O = ({ k, nhan, so, phu, mau, on, tat: off }) => (
    <button type="button" className={'bc-chi-so' + (on ? ' on' : '') + (off ? ' tat' : '')} onClick={off ? undefined : () => chonXem(k)} disabled={off} style={{ '--mau': mau }}>
      <span className="bc-cs-nhan">{mau && <i />}{nhan}</span>
      <b>{so}</b>
      {phu && <small>{phu}</small>}
    </button>
  )

  return (
    <div className="bc">
      <header className="trang-dau bc-dau">
        <div className="tieu"><span className="eyebrow">Báo cáo</span><h1>Tình hình <b>tuyển dụng</b></h1></div>
        <div className="bc-cong-cu">
          <ChonKy ma={ma} setMa={setMa} tuy={tuy} setTuy={setTuy} tu={tu} den={den} moc={moc} setMoc={setMoc} />
          <ChonNhieu nhan="Khu vực" icon={MapPin} ds={kvDs} giaTri={kv} onDoi={(v) => { setKv(v); setCh((c) => c.filter((m) => !v.length || v.includes(chMap.get(m)?.khu_vuc))) }} rong={270} />
          <ChonNhieu nhan="Cửa hàng" icon={Store} ds={chLoc} giaTri={ch} onDoi={setCh} rong={310} tim />
          <ChonNhieu nhan="Vị trí" icon={Users} ds={vtDs} giaTri={vt} onDoi={setVt} rong={260} />
          <Btn kieu="den" orb="trai" icon={Download} onClick={xuat} disabled={!d}>Xuất Excel</Btn>
        </div>
      </header>
      {coLoc && (
        <div className="bc-chip-loc">
          <span className="muted"><Filter size={13} />Đang lọc:</span>
          {kv.map((k) => <button key={'kv' + k} type="button" onClick={() => setKv(kv.filter((x) => x !== k))}><MapPin size={12} />{k === KV_CHUA_RO ? k : tenKV(k)}<X size={12} /></button>)}
          {ch.map((m) => <button key={'ch' + m} type="button" onClick={() => setCh(ch.filter((x) => x !== m))}><Store size={12} />{chMap.get(m)?.ten || m}<X size={12} /></button>)}
          {vt.map((v) => <button key={'vt' + v} type="button" onClick={() => setVt(vt.filter((x) => x !== v))}><Users size={12} />{tenVT(v)}<X size={12} /></button>)}
          <button type="button" className="bo-het" onClick={boLoc}>Bỏ lọc tất cả</button>
        </div>
      )}

      {!d && loading ? <div className="card"><Skeleton h={90} /></div> : (
        <section className={'card bc-tong' + (loading ? ' dang-tai' : '')}>
          <div className="bc-tong-dau">
            <span><b>{nhanKhoang}</b> · {moc === 'nop' ? 'tính theo ngày nộp hồ sơ' : 'tính theo ngày nhận việc'}{coLoc ? ' · đang lọc' : ''}</span>
            <span className="muted" title="Một người nộp nhiều lần chỉ tính 1 lần, theo hồ sơ mới nhất">Mỗi người tính 1 lần · {tat.length} hồ sơ{tat.length > nguoi.length ? ' (' + (tat.length - nguoi.length) + ' nộp lại)' : ''}</span>
          </div>
          <div className="bc-chi-so-hang">
            <O k="" nhan={<><Users size={13} />Ứng viên</>} so={nguoi.length} phu={moc === 'nop' ? 'người đã đăng ký' : 'người có lịch nhận việc'} on={!xem} />
            <O k="cho" nhan="Chờ xử lý" mau={NHOM.cho.mau} so={dem.cho || 0} phu={phanTram(dem.cho || 0, nguoi.length) + '% chưa có kết quả'} on={xem === 'cho'} tat={moc !== 'nop'} />
            <O k="duyet" nhan="Đã duyệt" mau={NHOM.duyet.mau} so={dem.duyet || 0} phu={duKien + ' dự kiến' + (quaHan ? ' · ' + quaHan + ' quá hẹn' : '')} on={xem === 'duyet'} />
            <O k="nhan" nhan="Đã nhận việc" mau={NHOM.nhan.mau} so={dem.nhan || 0} phu="đã xác nhận đi làm" on={xem === 'nhan'} />
            <O k="khong" nhan="Không đạt" mau={NHOM.khong.mau} so={dem.khong || 0} phu={(dem.rut || 0) + ' rút hồ sơ'} on={xem === 'khong'} tat={moc !== 'nop'} />
            <div className="bc-chi-so ti-le">
              <span className="bc-cs-nhan">Tỉ lệ đạt</span>
              <b>{coKQ ? phanTram((dem.duyet || 0) + (dem.nhan || 0), coKQ) + '%' : '—'}</b>
              <small>{(dem.duyet || 0) + (dem.nhan || 0)}/{coKQ} người đã có kết quả</small>
            </div>
          </div>
          <ThanhTiLe dem={dem} cao={6} />
          <div className="bc-chu-giai">{THU_TU.map((k) => <span key={k}><i style={{ background: NHOM[k].mau }} />{NHOM[k].ten} <b>{dem[k] || 0}</b></span>)}</div>
        </section>
      )}

      <div className="bc-goc-nhin">
        <button type="button" className={'bc-gn' + (mo === 'lich' ? ' on' : '')} onClick={() => setMo(mo === 'lich' ? '' : 'lich')} aria-expanded={mo === 'lich'}>
          <span className="bc-gn-ic"><CalendarDays size={17} /></span>
          <span className="gian"><b>Lịch nhận việc</b><small>{tomLich}</small></span>
          {quaHanDs.length > 0 && <span className="bc-gn-do" title="Quá hẹn chưa xác nhận nhận việc"><AlertTriangle size={11} strokeWidth={2.6} />{quaHanDs.length}</span>}
          <ChevronDown size={16} className="bc-gn-mui" />
        </button>
        <button type="button" className={'bc-gn' + (mo === 'kv' ? ' on' : '')} onClick={() => setMo(mo === 'kv' ? '' : 'kv')} aria-expanded={mo === 'kv'}>
          <span className="bc-gn-ic"><MapPin size={17} /></span>
          <span className="gian"><b>Theo khu vực</b><small>{theoKV[0] ? 'Nhiều nhất: ' + (theoKV[0].kv === KV_CHUA_RO ? 'Chưa rõ' : tenKV(theoKV[0].kv)) + ' · ' + theoKV[0].n + ' người' : 'Chưa có dữ liệu'}</small></span>
          <ChevronDown size={16} className="bc-gn-mui" />
        </button>
        <button type="button" className={'bc-gn' + (mo === 'xh' ? ' on' : '')} onClick={() => setMo(mo === 'xh' ? '' : 'xh')} aria-expanded={mo === 'xh'}>
          <span className="bc-gn-ic"><TrendingUp size={17} /></span>
          <span className="gian"><b>Xu hướng & cửa hàng</b><small>{tat.length} hồ sơ · {theoCH.length} cửa hàng nhận người</small></span>
          <ChevronDown size={16} className="bc-gn-mui" />
        </button>
      </div>

      {mo === 'lich' && (
      <div className="bc-hai bc-xo">
        <LichNhanViec thang={thang} setThang={setThang} ds={lichDs} hn={hn} ngayChon={ngayChon} setNgayChon={setNgayChon} dangTai={taiLich} />
        <section className="card bc-ben">
          {ngayChon ? <>
            <div className="bc-the-dau">
              <h2>{thu(ngayChon)} · {dmy(ngayChon)}</h2>
              <span className="bc-dem-nho">{ngayDs.length} người</span>
              <span className="gian" />
              <IconBtn icon={X} nhan="Bỏ chọn ngày" co="sm" onClick={() => setNgayChon(null)} />
            </div>
            {ngayDs.length ? <div className="bc-ds-nguoi">{ngayDs.map((r) => <DongNguoi key={r.id} r={r} onMo={setMoHS} />)}</div>
              : <Empty icon={CalendarDays} tieuDe="Không có ai nhận việc ngày này" />}
          </> : <>
            {quaHanDs.length > 0 && <>
              <div className="bc-the-dau"><h2 className="do"><AlertTriangle size={16} />Quá hẹn · chưa xác nhận nhận việc</h2><span className="bc-dem-nho do">{quaHanDs.length}</span></div>
              <p className="nho muted bc-goi-y">Đã qua ngày nhận việc dự kiến nhưng chưa bấm “Nhận việc”. Mở hồ sơ để xác nhận hoặc cập nhật.</p>
              <div className="bc-ds-nguoi">{quaHanDs.slice(0, 5).map((r) => <DongNguoi key={r.id} r={r} onMo={setMoHS} hienNgay />)}</div>
              {quaHanDs.length > 5 && <button type="button" className="bc-them" onClick={() => chonXem('qua_han')}>Xem tất cả {quaHanDs.length} người →</button>}
            </>}
            <div className="bc-the-dau" style={quaHanDs.length ? { marginTop: 14 } : null}><h2>Sắp nhận việc · 14 ngày tới</h2><span className="bc-dem-nho">{sapToiDs.length}</span></div>
            {sapToiDs.length ? <div className="bc-ds-nguoi">{sapToiDs.map((r) => <DongNguoi key={r.id} r={r} onMo={setMoHS} hienNgay />)}</div>
              : <Empty icon={CalendarDays} tieuDe="Chưa có lịch nhận việc sắp tới">Bấm một ngày trên lịch để xem chi tiết.</Empty>}
          </>}
        </section>
      </div>

      )}
      {mo === 'kv' && (
        <div className="bc-xo">
        <section className="card">
          <div className="bc-the-dau"><h2>Theo khu vực</h2><span className="bc-dem-nho">bấm để lọc</span></div>
          <div className="bc-kv">
            <div className="bc-kv-dong dau"><span>Khu vực</span><span>Ứng viên</span><span>Tình trạng</span><span>Đạt</span><span>Nhận việc</span><span>Tỉ lệ đạt</span></div>
            {theoKV.map((x) => {
              const dat = (x.dem.duyet || 0) + (x.dem.nhan || 0); const kq = dat + (x.dem.khong || 0)
              return (
                <button key={x.kv} type="button" className={'bc-kv-dong' + (kv.includes(x.kv) ? ' on' : '')} onClick={() => { setKv(kv.length === 1 && kv[0] === x.kv ? [] : [x.kv]); setCh([]) }}>
                  <span className="cat">{x.kv === KV_CHUA_RO ? <i className="muted">{KV_CHUA_RO}</i> : tenKV(x.kv)}</span>
                  <b>{x.n}</b>
                  <span className="bc-kv-thanh"><span style={{ width: (x.n / maxKV) * 100 + '%' }}><ThanhTiLe dem={x.dem} cao={10} /></span></span>
                  <span>{dat || '—'}</span>
                  <span>{x.dem.nhan || '—'}</span>
                  <span className="bc-pt">{kq ? phanTram(dat, kq) + '%' : '—'}</span>
                </button>
              )
            })}
            {!theoKV.length && <p className="nho muted" style={{ padding: 12 }}>Chưa có dữ liệu.</p>}
          </div>
          <p className="nho muted bc-goi-y" style={{ marginTop: 10 }}>Người đã có cửa hàng tính theo khu vực cửa hàng; người chưa có cửa hàng tính theo khu vực mong muốn / nơi ở đã khai.</p>
        </section>
        </div>
      )}
      {mo === 'xh' && (
        <div className="bc-xo">
        <section className="card">
          {moc === 'nop' && <>
            <div className="bc-the-dau"><h2>Xu hướng hồ sơ</h2><span className="bc-chu-giai nho-gon"><span><i style={{ background: '#C9C2CF' }} />Hồ sơ nộp</span><span><i style={{ background: NHOM.duyet.mau }} />Đạt</span></span></div>
            <XuHuong ds={tat} tu={tu} den={den} />
          </>}
          <div className="bc-the-dau" style={moc === 'nop' ? { marginTop: 16 } : null}><h2>Cửa hàng nhận người</h2><span className="bc-dem-nho">bấm để lọc</span></div>
          {theoCH.length ? <div className="bc-ch">{theoCH.map((x) => (
            <button key={x.ma} type="button" className={'bc-ch-dong' + (ch.includes(x.ma) ? ' on' : '')} onClick={() => setCh(ch.length === 1 && ch[0] === x.ma ? [] : [x.ma])}>
              <span className="gian cat"><b>{x.ten}</b><small>{tenKV(x.kv)}</small></span>
              {x.duyet > 0 && <span className="bc-tt" style={{ background: NHOM.duyet.bg, color: NHOM.duyet.fg }}>{x.duyet} chờ nhận</span>}
              {x.nhan > 0 && <span className="bc-tt" style={{ background: NHOM.nhan.bg, color: NHOM.nhan.fg }}>{x.nhan} đã nhận</span>}
            </button>))}</div> : <p className="nho muted" style={{ padding: '6px 0' }}>Chưa có ứng viên đạt được phân về cửa hàng trong khoảng này.</p>}
        </section>
        </div>
      )}

      <section className="card bc-bang-the" ref={dsRef}>
        <div className="bc-the-dau wrap">
          <h2>Danh sách chi tiết</h2>
          <span className="bc-dem-nho">{dsXem.length} {moiNguoi ? 'người' : 'hồ sơ'}</span>
          {ngayChon && <button type="button" className="bc-chip-ngay" onClick={() => setNgayChon(null)} title="Bỏ lọc theo ngày"><CalendarDays size={13} />Nhận việc {thu(ngayChon, true)} {dmy(ngayChon)}<X size={13} /></button>}
          <span className="gian" />
          <label className="bc-tim"><Search size={15} /><input placeholder="Tìm tên, SĐT, mã, cửa hàng…" value={tim} onChange={(e) => setTim(e.target.value)} />{tim && <button type="button" onClick={() => setTim('')} aria-label="Xóa tìm"><X size={13} /></button>}</label>
          <button type="button" className={'bc-cong-tac' + (moiNguoi ? ' on' : '')} onClick={() => setMoiNguoi(!moiNguoi)} title="Bật: mỗi người 1 dòng (hồ sơ mới nhất). Tắt: hiện mọi lần nộp."><i />Mỗi người 1 dòng</button>
        </div>
        <div className="bc-tab">
          {[['', 'Tất cả', nguon.length], ['cho', 'Chờ xử lý', nguon.filter((r) => r.nhom === 'cho').length], ['duyet', 'Đã duyệt', nguon.filter((r) => r.nhom === 'duyet').length],
            ['du_kien', 'Dự kiến nhận việc', nguon.filter((r) => r.duKien).length], ['qua_han', 'Quá hẹn', nguon.filter((r) => r.quaHan).length], ['nhan', 'Đã nhận việc', nguon.filter((r) => r.nhom === 'nhan').length],
            ['khong', 'Không đạt', nguon.filter((r) => r.nhom === 'khong').length], ['rut', 'Rút hồ sơ', nguon.filter((r) => r.nhom === 'rut').length]]
            .filter(([v, , n]) => !v || n || xem === v).map(([v, t, n]) => (
              <button key={v || 'tat'} type="button" className={xem === v ? 'on' : ''} onClick={() => setXem(v)} style={v && NHOM[v] ? { '--mau': NHOM[v].mau } : v === 'du_kien' ? { '--mau': NHOM.duyet.mau } : v === 'qua_han' ? { '--mau': NHOM.khong.mau } : null}>
                {v && <i />}{t}<b>{n}</b>
              </button>
            ))}
        </div>
        <div className="bc-bang cuon-mong">
          <table>
            <thead><tr><th className="c-stt">#</th>{COT.map((c) => (
              <th key={c.k} className={'c-' + c.k}>
                <span className="th-o">
                  <button type="button" className={sx.k === c.k ? 'on' : ''} onClick={() => setSx(sx.k === c.k ? { k: c.k, giam: !sx.giam } : { k: c.k, giam: ['nop', 'ngayNV', 'diem'].includes(c.k) })}>
                    {c.t}{sx.k === c.k && (sx.giam ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                  </button>
                  {c.k === 'vt' && <ChonNhieu nhan="Lọc vị trí" ds={vtDs} giaTri={vt} onDoi={setVt} canh="trai" rong={260} nut={(co) => <button type="button" className={'th-loc' + (co ? ' on' : '')} aria-label="Lọc vị trí"><Filter size={12} /></button>} />}
                  {c.k === 'kv' && <ChonNhieu nhan="Lọc khu vực" ds={kvDs} giaTri={kv} onDoi={setKv} canh="trai" rong={270} nut={(co) => <button type="button" className={'th-loc' + (co ? ' on' : '')} aria-label="Lọc khu vực"><Filter size={12} /></button>} />}
                  {c.k === 'chTen' && <ChonNhieu nhan="Lọc cửa hàng" ds={chLoc} giaTri={ch} onDoi={setCh} canh="trai" rong={310} tim nut={(co) => <button type="button" className={'th-loc' + (co ? ' on' : '')} aria-label="Lọc cửa hàng"><Filter size={12} /></button>} />}
                  {c.k === 'nhom' && <Menu canh="trai" rong={250} nut={<button type="button" className={'th-loc' + (xem ? ' on' : '')} aria-label="Lọc trạng thái"><Filter size={12} /></button>}>
                    {(dong) => <>
                      <div className="tieu">Lọc trạng thái</div>
                      {[['', 'Tất cả'], ...THU_TU.map((k) => [k, NHOM[k].ten]), ['du_kien', 'Dự kiến nhận việc'], ['qua_han', 'Quá hẹn chưa xác nhận']].map(([v, t]) => (
                        <button key={v || 'tat'} type="button" className={xem === v ? 'on' : ''} onClick={() => { setXem(v); dong() }}>
                          <i className="bc-cham" style={{ background: v ? (NHOM[v]?.mau || (v === 'du_kien' ? NHOM.duyet.mau : NHOM.khong.mau)) : 'transparent' }} /><span className="gian">{t}</span>{xem === v && <Check size={14} />}
                        </button>))}
                    </>}
                  </Menu>}
                </span>
              </th>))}</tr></thead>
            <tbody>
              {dsXem.slice(0, soHien).map((r, i) => (
                <tr key={r.id} onClick={() => setMoHS(r.id)}>
                  <td className="c-stt so">{i + 1}</td>
                  <td className="c-ten"><span className="bc-ten-o"><span onClick={(e) => e.stopPropagation()}><Avatar ten={r.ten} path={r.anh} co="sm" phong /></span><b className="cat">{r.ten}</b>{r.sl > 1 && <span className="bc-lan" title={'Ứng tuyển lần ' + r.lan + '/' + r.sl}>Lần {r.lan}</span>}</span></td>
                  <td className="c-sdt so">{fmtSdt(r.sdt)}</td>
                  <td className="c-vt cat">{tenVT(r.vt)}</td>
                  <td className="c-kv cat">{r.kv === KV_CHUA_RO ? <span className="muted">—</span> : tenKV(r.kv)}</td>
                  <td className="c-chTen cat">{r.chTen || <span className="muted">—</span>}</td>
                  <td className="c-nop so">{dmy(r.nop)}</td>
                  <td className="c-nhom"><TagNhom n={r.nhom} quaHan={r.quaHan} />{r.nhom === 'cho' && r.tt !== 'moi' && <small className="bc-gd">{GD[r.tt]?.ngan || GD[r.tt]?.ten}</small>}</td>
                  <td className="c-ngayNV so">{r.ngayNV ? <>{dmy(r.ngayNV)}<small>{r.tn ? 'thực tế' : 'dự kiến'}</small></> : <span className="muted">—</span>}</td>
                  <td className="c-diem so">{r.diem != null ? fmtDiem(r.diem) : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dsXem.length && <Empty icon={Search} tieuDe="Không có ứng viên phù hợp">Thử đổi khoảng thời gian hoặc bỏ bớt bộ lọc.</Empty>}
        </div>
        {dsXem.length > soHien && <div className="bc-chan"><Btn kieu="trang" co="sm" onClick={() => setSoHien(soHien + 100)}>Hiện thêm ({dsXem.length - soHien})</Btn></div>}
      </section>

      {moHS && (
        <div className="man-ho-so" onMouseDown={(e) => { if (e.target === e.currentTarget) setMoHS(null) }}>
          <div className="mhs-hop">
            <HoSoChiTiet key={moHS} id={moHS} nhung onDoi={() => setNhip((n) => n + 1)} phai={<IconBtn icon={X} nhan="Đóng" kieu="kinh" onClick={() => setMoHS(null)} />} />
          </div>
        </div>
      )}
    </div>
  )
}
