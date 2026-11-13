import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Film, MoreHorizontal, Star } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { congNgay, fmtGiay, fmtGio, fmtNgayNgan, ngayVN } from '../lib/format'
import { GD, GD_COT, GD_KET_THUC } from '../lib/stages'
import { Avatar, Diem, Segment, Skeleton, Switch } from '../components/ui'
import { useStaff } from './context'
import LichModal from './LichModal'
import { tenNgan } from './Dashboard'
import { MenuGiaiDoan, useDoiGiaiDoan } from './stageActions'

const GIOI_HAN = 40

export default function Pipeline() {
  const s = useStaff()
  const nav = useNavigate()
  const [vt, setVt] = useState('')
  const [tatCa, setTatCa] = useState(false)
  const [keo, setKeo] = useState(null)
  const [tha, setTha] = useState(null)
  const [henCho, setHenCho] = useState(null)
  const p = { so_dong: 1500, vi_tri_id: vt || null, tu: tatCa ? null : congNgay(ngayVN(), -90), sap_xep: 'cap_nhat' }
  const { data, loading, reload, setData } = useAsync(() => rpc('td_ds_ho_so', { p }), [vt, tatCa, s.nhip])
  const nhom = useMemo(() => {
    const g = {}
    for (const r of data?.dong || []) (g[r.trang_thai] = g[r.trang_thai] || []).push(r)
    return g
  }, [data])
  const [doiGD, giaoDienGD] = useDoiGiaiDoan({
    xong: (ids, tt) => { setData((d) => d && ({ ...d, dong: d.dong.map((r) => (ids.includes(r.id) ? { ...r, trang_thai: tt } : r)) })); reload(true); s.taiDem() },
    henPV: (r) => setHenCho(r)
  })
  const coKeo = s.coSua

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

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">Quy trình</span>
          <h1>{coKeo ? <>Kéo thả để <b>chuyển giai đoạn</b></> : <>Toàn cảnh <b>quy trình</b></>}</h1>
        </div>
        <Segment trang ds={[{ v: '', t: 'Tất cả vị trí' }, ...s.dm.viTri.map((v) => ({ v: String(v.id), t: tenNgan(v.ten) }))]} giaTri={vt} onChon={setVt} />
        <label className="hang nho" style={{ gap: 8, fontWeight: 600, color: 'var(--muted-2)' }}><Switch on={tatCa} onDoi={setTatCa} nhan="Mọi thời gian" />{tatCa ? 'Mọi thời gian' : '90 ngày gần đây'}</label>
      </header>

      {loading && !data ? (
        <div className="kanban">{GD_COT.map((g) => <div key={g} className="cot-kb"><Skeleton h={22} w="50%" /><Skeleton h={90} /><Skeleton h={90} /></div>)}</div>
      ) : (
        <div className="kanban cuon-mong">
          {GD_COT.map((ma) => {
            const g = GD[ma]
            const ds = nhom[ma] || []
            return (
              <section key={ma} className={'cot-kb' + (tha === ma ? ' tha' : '')} aria-label={g.ten} {...vung(ma)}>
                <div className="dau-cot"><i style={{ background: g.cham }} /><b>{g.ten}</b><span className="sl">{ds.length}</span></div>
                {ds.slice(0, GIOI_HAN).map((r) => (
                  <div key={r.id} className={'the-kb' + (keo?.id === r.id ? ' keo' : '')} draggable={coKeo}
                    onDragStart={(e) => { setKeo(r); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.id) }}
                    onDragEnd={() => { setKeo(null); setTha(null) }}
                    onClick={() => nav('/quan-tri/ung-vien/' + r.id)}>
                    <div className="hang">
                      <Avatar ten={r.ho_ten} path={r.anh} co="sm" />
                      <div className="gian"><b className="cat" style={{ display: 'block' }}>{r.ho_ten} {r.uu_tien && <Star size={11} fill="#F5A524" color="#F5A524" />}</b><div className="meta cat">{r.tuoi} tuổi · {r.khu_vuc_mong_muon || r.cho_o}</div></div>
                      {coKeo && <span onClick={(e) => e.stopPropagation()}><MenuGiaiDoan hienTai={r.trang_thai} nut={<button className="icon-btn xs mem" aria-label="Chuyển giai đoạn"><MoreHorizontal size={15} /></button>} chon={(tt) => doiGD([r.id], tt, [r])} /></span>}
                    </div>
                    <div className="hang wrap" style={{ gap: 6 }}>
                      {r.video_giay != null && <span className="tag" style={{ paddingLeft: 4 }}><span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Film size={10} /></span>{fmtGiay(r.video_giay)}</span>}
                      <span className="tag cat" style={{ maxWidth: 120 }}>{tenNgan(r.vi_tri)}</span>
                      {r.lich_toi && <span className="tag" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><CalendarClock size={12} />{fmtGio(r.lich_toi)} {fmtNgayNgan(r.lich_toi)}</span>}
                      {r.diem_tb != null && <span style={{ marginLeft: 'auto' }}><Diem v={r.diem_tb} /></span>}
                    </div>
                  </div>
                ))}
                {ds.length > GIOI_HAN && <button className="btn sm trang" onClick={() => nav('/quan-tri/ung-vien?gd=' + ma)}>+{ds.length - GIOI_HAN} hồ sơ khác</button>}
                {!ds.length && <p className="nho" style={{ color: '#B7B0BD', textAlign: 'center', padding: '20px 0' }}>{coKeo ? 'Thả hồ sơ vào đây' : 'Trống'}</p>}
              </section>
            )
          })}
        </div>
      )}

      <div className="vung-ket">
        {GD_KET_THUC.map((ma) => (
          <div key={ma} className={'o' + (tha === ma ? ' tha' : '')} {...vung(ma)} onClick={() => nav('/quan-tri/ung-vien?gd=' + ma)} role="button" tabIndex={0}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: GD[ma].cham }} />{GD[ma].ten}<span className="tag">{(nhom[ma] || []).length}</span>
          </div>
        ))}
      </div>
      {giaoDienGD}
      {henCho && <LichModal hoSo={henCho} dong={() => setHenCho(null)} xong={() => { setHenCho(null); reload(true); s.taiDem() }} />}
    </>
  )
}
