import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Film, LogOut, MoreHorizontal, Star, Store, UserX } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync, useLS } from '../lib/hooks'
import { fmtGiay, fmtGio, fmtNgayNgan, thu } from '../lib/format'
import { GD } from '../lib/stages'
import { Avatar, Diem, Segment, Skeleton } from '../components/ui'
import ChonNgay, { tinhKhoang } from './ChonNgay'
import { useStaff } from './context'
import LichModal from './LichModal'
import { tenNgan } from './Dashboard'
import { MenuGiaiDoan, useDoiGiaiDoan } from './stageActions'
import { NGHI_SOM } from './NghiViec'

const GIOI_HAN = 40
// Cột chính theo thứ tự quy trình; "Chưa liên lạc được" / "Cân nhắc thêm" chỉ hiện khi có hồ sơ
const COT = ['moi', 'hen_pv', 'chua_lien_lac', 'can_nhac', 'dat', 'nhan_viec']
const PHU = ['chua_lien_lac', 'can_nhac']
const CHINH = COT.filter((m) => !PHU.includes(m))
// Nhóm kết thúc: ô gọn bên dưới, bấm để mở danh sách, bấm lại để thu gọn
const KET = ['khong_dat', 'khong_den', 'nghi_viec']
const dm = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '')

function ThongTinThem({ r }) {
  const tt = r.trang_thai
  if ((tt === 'dat' || tt === 'khong_den') && (r.ngay_nhan_viec || r.noi_lam_viec)) return (
    <div className={'qtk-them' + (tt === 'khong_den' ? ' do' : '')}>{tt === 'khong_den' ? <UserX size={13} /> : <Store size={13} />}
      <span className="cat">{tt === 'khong_den' ? 'Hẹn ' : ''}{r.ngay_nhan_viec ? thu(r.ngay_nhan_viec + 'T12:00:00+07:00', true) + ' ' + dm(r.ngay_nhan_viec) : ''}{r.noi_lam_viec ? ' · ' + r.noi_lam_viec : ''}</span></div>
  )
  if (tt === 'nhan_viec' && r.noi_lam_viec) return <div className="qtk-them"><Store size={13} /><span className="cat">{r.noi_lam_viec}{r.ngay_nhan_viec ? ' · từ ' + dm(r.ngay_nhan_viec) : ''}</span></div>
  if (tt === 'nghi_viec') return (
    <div className={'qtk-them' + (r.so_ngay_lam != null && r.so_ngay_lam <= NGHI_SOM ? ' do' : '')}><LogOut size={13} />
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
  const [moKet, setMoKet] = useLS('ns-td-qt-ket', '')
  const [keo, setKeo] = useState(null)
  const [tha, setTha] = useState(null)
  const [henCho, setHenCho] = useState(null)
  const p = { so_dong: 1500, vi_tri_id: vt || null, tu: tuNgay, den: denNgay, sap_xep: 'cap_nhat' }
  const { data, loading, reload, setData } = useAsync(() => rpc('td_ds_ho_so', { p }), [vt, tuNgay, denNgay, s.nhip])
  const nhom = useMemo(() => {
    const g = {}
    for (const r of data?.dong || []) (g[r.trang_thai] = g[r.trang_thai] || []).push(r)
    return g
  }, [data])
  const dem = (m) => (nhom[m] || []).length
  const [doiGD, giaoDienGD] = useDoiGiaiDoan({
    xong: (ids, tt) => { setData((d) => d && ({ ...d, dong: d.dong.map((r) => (ids.includes(r.id) ? { ...r, trang_thai: tt } : r)) })); reload(true); s.taiDem() },
    henPV: (r) => setHenCho(r)
  })
  const coKeo = s.coSua
  const cot = COT.filter((m) => !PHU.includes(m) || dem(m) > 0)

  // Bảng cuộn ngang: hiện mũi tên trái/phải khi bị tràn
  const bang = useRef(null)
  const [mep, setMep] = useState({ trai: false, phai: false })
  const doMep = () => { const el = bang.current; if (el) setMep({ trai: el.scrollLeft > 4, phai: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }) }
  useLayoutEffect(() => {
    const el = bang.current
    if (!el) return undefined
    doMep()
    const ro = new ResizeObserver(doMep); ro.observe(el)
    return () => ro.disconnect()
  }, [data, cot.length])
  const truot = (h) => bang.current?.scrollBy({ left: h * Math.min(bang.current.clientWidth * 0.8, 520), behavior: 'smooth' })

  function thaVao(tt) {
    const r = keo
    setKeo(null); setTha(null)
    if (!r || r.trang_thai === tt) return
    doiGD([r.id], tt, [r])
  }
  const vung = (tt) => coKeo ? {
    onDragOver: (e) => { if (keo) { e.preventDefault(); setTha(tt) } },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTha((x) => (x === tt ? null : x)) },
    onDrop: (e) => { e.preventDefault(); thaVao(tt) }
  } : {}

  const theHS = (r) => (
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
        <span className="tag cat" style={{ maxWidth: 120 }}>{tenNgan(r.vi_tri)}</span>
        {r.lich_toi && <span className="tag" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><CalendarClock size={12} />{fmtGio(r.lich_toi)} {fmtNgayNgan(r.lich_toi)}</span>}
        {r.diem_tb != null && <span style={{ marginLeft: 'auto' }}><Diem v={r.diem_tb} /></span>}
      </div>
    </div>
  )

  const dsKet = moKet ? nhom[moKet] || [] : []
  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">Quy trình</span>
          <h1>{coKeo ? <>Kéo thả để <b>chuyển giai đoạn</b></> : <>Toàn cảnh <b>quy trình</b></>}</h1>
        </div>
        <Segment trang ds={[{ v: '', t: 'Tất cả vị trí' }, ...s.dm.viTri.map((v) => ({ v: String(v.id), t: tenNgan(v.ten) }))]} giaTri={vt} onChon={setVt} />
        <ChonNgay giaTri={khoang} onDoi={setKhoang} canh="phai" />
      </header>

      <div className={'qtk-boc' + (mep.trai ? ' t' : '') + (mep.phai ? ' p' : '')}>
        {mep.trai && <button type="button" className="qtk-mui trai" onClick={() => truot(-1)} aria-label="Cuộn sang trái"><ChevronLeft size={18} /></button>}
        {loading && !data ? (
          <div className="kanban">{[0, 1, 2, 3].map((g) => <div key={g} className="cot-kb"><Skeleton h={22} w="50%" /><Skeleton h={90} /><Skeleton h={90} /></div>)}</div>
        ) : (
          <div className="kanban cuon-mong" ref={bang} onScroll={doMep}>
            {cot.map((ma) => {
              const g = GD[ma]
              const ds = nhom[ma] || []
              const phu = PHU.includes(ma)
              return (
                <section key={ma} className={'cot-kb' + (tha === ma ? ' tha' : '') + (phu ? ' phu' : '')} aria-label={g.ten} {...vung(ma)}>
                  <div className="dau-cot"><i style={{ background: g.cham }} /><span className="qtk-ten"><small>{phu ? 'Đang phỏng vấn' : 'Bước ' + (CHINH.indexOf(ma) + 1)}</small><b>{g.ten}</b></span><span className="sl">{ds.length}</span></div>
                  {ds.slice(0, GIOI_HAN).map(theHS)}
                  {ds.length > GIOI_HAN && <button className="btn sm trang" onClick={() => nav('/quantri/ung-vien?gd=' + ma)}>+{ds.length - GIOI_HAN} hồ sơ khác</button>}
                  {!ds.length && <p className="nho" style={{ color: '#B7B0BD', textAlign: 'center', padding: '20px 0' }}>{coKeo ? 'Thả hồ sơ vào đây' : 'Trống'}</p>}
                </section>
              )
            })}
          </div>
        )}
        {mep.phai && <button type="button" className="qtk-mui phai" onClick={() => truot(1)} aria-label="Cuộn sang phải"><ChevronRight size={18} /></button>}
      </div>

      <div className="qtk-ket">
        {KET.map((ma) => (
          <button key={ma} type="button" className={'qtk-o' + (moKet === ma ? ' on' : '') + (tha === ma ? ' tha' : '')} style={{ '--cham': GD[ma].cham }}
            aria-expanded={moKet === ma} onClick={() => setMoKet(moKet === ma ? '' : ma)} {...vung(ma)}>
            <i />{GD[ma].ten}<b>{dem(ma)}</b><ChevronDown size={16} className="mui" />
          </button>
        ))}
      </div>
      {moKet && (
        <section className="qtk-ds" key={moKet}>
          {dsKet.length ? (
            <div className="qtk-luoi">{dsKet.slice(0, 120).map(theHS)}</div>
          ) : <p className="nho muted" style={{ textAlign: 'center', padding: '18px 0' }}>Chưa có hồ sơ “{GD[moKet].ten}” trong khoảng thời gian đang chọn.</p>}
          {dsKet.length > 120 && <button className="btn sm trang" style={{ margin: '12px auto 0', display: 'flex' }} onClick={() => nav('/quantri/ung-vien?gd=' + moKet)}>Xem tất cả {dsKet.length} hồ sơ</button>}
        </section>
      )}
      {giaoDienGD}
      {henCho && <LichModal hoSo={henCho} dong={() => setHenCho(null)} xong={() => { setHenCho(null); reload(true); s.taiDem() }} />}
    </>
  )
}
