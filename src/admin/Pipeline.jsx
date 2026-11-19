import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronLeft, ChevronRight, ChevronUp, Film, LogOut, MoreHorizontal, Search, Star, Store, UserX, X } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync, useDebounced, useLS } from '../lib/hooks'
import { fmtGiay, fmtGio, fmtNgayNgan, thu } from '../lib/format'
import { GD } from '../lib/stages'
import { Avatar, Diem, Empty, Segment, Skeleton } from '../components/ui'
import ChonNgay, { tinhKhoang } from './ChonNgay'
import { useStaff } from './context'
import LichModal from './LichModal'
import { tenNgan } from './Dashboard'
import { MenuGiaiDoan, useDoiGiaiDoan } from './stageActions'
import { NGHI_SOM } from './NghiViec'

const MOI_LAN = 60
// Thứ tự trên thanh quy trình — giai đoạn cũ (cu) chỉ hiện khi còn hồ sơ
const NHOM_QT = [
  { t: 'Đang tuyển', ds: ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat', 'du_bi', 'can_nhac', 'chua_lien_lac'] },
  { t: 'Sau tuyển', ds: ['dat', 'nhan_viec', 'nghi_viec', 'khong_den'] },
  { t: 'Kết thúc', ds: ['khong_dat', 'rut'] }
]
const dm = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '')

function ThongTinThem({ r }) {
  const tt = r.trang_thai
  if ((tt === 'dat' || tt === 'khong_den') && (r.ngay_nhan_viec || r.noi_lam_viec)) return (
    <div className={'qt-them' + (tt === 'khong_den' ? ' do' : '')}>{tt === 'khong_den' ? <UserX size={13} /> : <Store size={13} />}
      <span className="cat">{tt === 'khong_den' ? 'Hẹn ' : ''}{r.ngay_nhan_viec ? thu(r.ngay_nhan_viec + 'T12:00:00+07:00', true) + ' ' + dm(r.ngay_nhan_viec) : ''}{r.noi_lam_viec ? ' · ' + r.noi_lam_viec : ''}</span></div>
  )
  if (tt === 'nhan_viec' && r.noi_lam_viec) return <div className="qt-them"><Store size={13} /><span className="cat">{r.noi_lam_viec}{r.ngay_nhan_viec ? ' · từ ' + dm(r.ngay_nhan_viec) : ''}</span></div>
  if (tt === 'nghi_viec') return (
    <div className={'qt-them' + (r.so_ngay_lam != null && r.so_ngay_lam <= NGHI_SOM ? ' do' : '')}><LogOut size={13} />
      <span className="cat">Làm {r.so_ngay_lam ?? '—'} ngày{r.ngay_nghi_viec ? ' · nghỉ ' + dm(r.ngay_nghi_viec) : ''}{r.noi_lam_viec ? ' · ' + r.noi_lam_viec : ''}</span></div>
  )
  return null
}

export default function Pipeline() {
  const s = useStaff()
  const nav = useNavigate()
  const [vt, setVt] = useState('')
  const [khoang, setKhoang] = useState({ v: '90' })
  const [tuNgay, denNgay] = tinhKhoang(khoang)
  const [chon, setChon] = useLS('ns-td-qt-chon', 'moi')
  const [tim, setTim] = useState('')
  const timTre = useDebounced(tim, 300)
  const [soHien, setSoHien] = useState(MOI_LAN)
  const [keo, setKeo] = useState(null)
  const [tha, setTha] = useState(null)
  const [henCho, setHenCho] = useState(null)
  useEffect(() => { setSoHien(MOI_LAN) }, [chon, vt, tuNgay, denNgay, timTre])
  const p = { so_dong: chon ? soHien : 1, trang_thai: chon || '__khong', vi_tri_id: vt || null, tu: tuNgay, den: denNgay, sap_xep: 'cap_nhat', tim: chon ? timTre || null : null }
  const { data, loading, reload } = useAsync(() => rpc('td_ds_ho_so', { p }), [chon, soHien, vt, tuNgay, denNgay, timTre, s.nhip])
  const dem = data?.dem || {}
  const ds = chon ? data?.dong || [] : []
  const [doiGD, giaoDienGD] = useDoiGiaiDoan({ xong: () => { reload(true); s.taiDem() }, henPV: (r) => setHenCho(r) })
  const coKeo = s.coSua

  // Thanh cuộn ngang: mũi tên trái/phải + lăn chuột dọc thành ngang
  const ray = useRef(null)
  const [mep, setMep] = useState({ trai: false, phai: false })
  const doMep = () => { const el = ray.current; if (el) setMep({ trai: el.scrollLeft > 4, phai: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }) }
  useLayoutEffect(() => {
    const el = ray.current
    if (!el) return undefined
    doMep()
    const lan = (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) { e.preventDefault(); el.scrollLeft += e.deltaY } }
    el.addEventListener('wheel', lan, { passive: false })
    const ro = new ResizeObserver(doMep); ro.observe(el)
    return () => { el.removeEventListener('wheel', lan); ro.disconnect() }
  }, [data])
  const truot = (h) => ray.current?.scrollBy({ left: h * ray.current.clientWidth * 0.7, behavior: 'smooth' })
  const daCanh = useRef(false)
  useEffect(() => { // đưa ô đang chọn vào giữa thanh (lần đầu: tức thì, sau đó: mượt)
    const r = ray.current, el = r?.querySelector('.qt-the.on')
    if (!r || !el || !data) return
    const x = el.getBoundingClientRect().left - r.getBoundingClientRect().left + r.scrollLeft
    const dich = x - (r.clientWidth - el.offsetWidth) / 2
    if (!daCanh.current) { r.scrollLeft = dich; daCanh.current = true; doMep() }
    else if (x < r.scrollLeft || x + el.offsetWidth > r.scrollLeft + r.clientWidth) r.scrollTo({ left: dich, behavior: 'smooth' })
  }, [chon, !!data]) // eslint-disable-line react-hooks/exhaustive-deps

  const vung = (tt) => coKeo ? {
    onDragOver: (e) => { if (keo) { e.preventDefault(); setTha(tt) } },
    onDragLeave: () => setTha((x) => (x === tt ? null : x)),
    onDrop: (e) => { e.preventDefault(); const r = keo; setKeo(null); setTha(null); if (r && r.trang_thai !== tt) doiGD([r.id], tt, [r]) }
  } : {}
  const tong = Object.values(dem).reduce((a, n) => a + n, 0)
  const g = chon ? GD[chon] : null

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">Quy trình</span>
          <h1>Toàn cảnh <b>quy trình</b></h1>
        </div>
        <Segment trang ds={[{ v: '', t: 'Tất cả vị trí' }, ...s.dm.viTri.map((v) => ({ v: String(v.id), t: tenNgan(v.ten) }))]} giaTri={vt} onChon={setVt} />
        <ChonNgay giaTri={khoang} onDoi={setKhoang} canh="phai" />
      </header>

      <section className="qt-thanh" aria-label="Các trạng thái hồ sơ">
        <div className="qt-thanh-dau">
          <b>{tong} hồ sơ</b><span>Bấm một trạng thái để mở danh sách · bấm lại để thu gọn{coKeo ? ' · kéo thẻ hồ sơ thả vào trạng thái để chuyển' : ''}</span>
        </div>
        <div className={'qt-ray-boc' + (mep.trai ? ' t' : '') + (mep.phai ? ' p' : '')}>
          {mep.trai && <button type="button" className="qt-mui trai" onClick={() => truot(-1)} aria-label="Cuộn sang trái"><ChevronLeft size={18} /></button>}
          <div className="qt-ray" ref={ray} onScroll={doMep}>
            {NHOM_QT.map((n) => {
              const ma = n.ds.filter((m) => !GD[m]?.cu || dem[m] > 0 || chon === m)
              return (
                <div key={n.t} className="qt-nhom">
                  <span className="qt-nhom-ten">{n.t}</span>
                  <div className="qt-nhom-ds">
                    {ma.map((m) => (
                      <button key={m} type="button" className={'qt-the' + (chon === m ? ' on' : '') + (tha === m ? ' tha' : '') + (!dem[m] ? ' rong' : '')}
                        style={{ '--cham': GD[m].cham }} aria-pressed={chon === m} onClick={() => setChon(chon === m ? '' : m)} {...vung(m)}>
                        <span className="qt-ten"><i />{GD[m].ten}</span>
                        <span className="qt-so">{loading && !data ? '·' : dem[m] || 0}<small>hồ sơ</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {mep.phai && <button type="button" className="qt-mui phai" onClick={() => truot(1)} aria-label="Cuộn sang phải"><ChevronRight size={18} /></button>}
        </div>
      </section>

      {g && (
        <section className="qt-bang" key={chon} style={{ '--cham': g.cham }}>
          <div className="qt-bang-dau">
            <span className="qt-bang-ten"><i /><b>{g.ten}</b><span className="sl">{dem[chon] || 0}</span>{g.mo_ta && <small>{g.mo_ta}</small>}</span>
            <label className="qt-tim"><Search size={15} /><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm tên, SĐT, mã…" />{tim && <button type="button" onClick={() => setTim('')} aria-label="Xóa tìm"><X size={13} /></button>}</label>
            <Link to={'/quantri/ung-vien?gd=' + chon} className="qt-link">Mở trong Ứng viên<ChevronRight size={14} /></Link>
            <button type="button" className="qt-thu" onClick={() => setChon('')} aria-label="Thu gọn danh sách"><ChevronUp size={16} /></button>
          </div>
          {loading && !ds.length ? (
            <div className="qt-luoi">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={96} />)}</div>
          ) : !ds.length ? (
            <Empty tieuDe={tim ? 'Không tìm thấy hồ sơ phù hợp' : 'Chưa có hồ sơ ở trạng thái này'}>{tim ? 'Thử từ khóa khác.' : 'Trong khoảng thời gian và vị trí đang chọn.'}</Empty>
          ) : (
            <div className="qt-luoi">
              {ds.map((r) => (
                <div key={r.id} className={'the-kb' + (keo?.id === r.id ? ' keo' : '')} draggable={coKeo}
                  onDragStart={(e) => { setKeo(r); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.id) }}
                  onDragEnd={() => { setKeo(null); setTha(null) }}
                  onClick={() => nav('/quantri/ung-vien/' + r.id)}>
                  <div className="hang">
                    <Avatar ten={r.ho_ten} path={r.anh} co="sm" />
                    <div className="gian"><b className="cat" style={{ display: 'block' }}>{r.ho_ten} {r.uu_tien && <Star size={11} fill="#F5A524" color="#F5A524" />}</b><div className="meta cat">{r.tuoi} tuổi · {r.khu_vuc_mong_muon || r.cho_o}</div></div>
                    {coKeo && <span onClick={(e) => e.stopPropagation()}><MenuGiaiDoan hienTai={r.trang_thai} nut={<button className="icon-btn xs mem" aria-label="Chuyển trạng thái"><MoreHorizontal size={15} /></button>} chon={(tt) => doiGD([r.id], tt, [r])} /></span>}
                  </div>
                  <ThongTinThem r={r} />
                  <div className="hang wrap" style={{ gap: 6 }}>
                    {r.video_giay != null && <span className="tag" style={{ paddingLeft: 4 }}><span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Film size={10} /></span>{fmtGiay(r.video_giay)}</span>}
                    <span className="tag cat" style={{ maxWidth: 140 }}>{tenNgan(r.vi_tri)}</span>
                    {r.lich_toi && <span className="tag" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><CalendarClock size={12} />{fmtGio(r.lich_toi)} {fmtNgayNgan(r.lich_toi)}</span>}
                    {r.diem_tb != null && <span style={{ marginLeft: 'auto' }}><Diem v={r.diem_tb} /></span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {ds.length > 0 && ds.length < (data?.tong || 0) && (
            <button type="button" className="btn md trang qt-them-nut" onClick={() => setSoHien((n) => n + MOI_LAN)} disabled={loading}>Xem thêm {Math.min(MOI_LAN, data.tong - ds.length)} hồ sơ · còn {data.tong - ds.length}</button>
          )}
        </section>
      )}
      {giaoDienGD}
      {henCho && <LichModal hoSo={henCho} dong={() => setHenCho(null)} xong={() => { setHenCho(null); reload(true); s.taiDem() }} />}
    </>
  )
}
