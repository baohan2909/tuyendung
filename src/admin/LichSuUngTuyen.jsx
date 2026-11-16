import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, ChevronRight, UserSearch } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { fmtNgay, fmtSdt } from '../lib/format'
import { GD } from '../lib/stages'
import { StageTag } from '../components/ui'

// Kết quả của 1 lần ứng tuyển → 4 nhóm màu dễ nhận diện
export const KQ_LAN = {
  dat: { ten: 'Được duyệt', mau: '#12A37F' },
  khong: { ten: 'Không duyệt', mau: '#E05252' },
  rut: { ten: 'Đã rút', mau: '#B9B2BF' },
  dang: { ten: 'Đang xét', mau: '#E0820B' }
}
export const nhomKQ = (tt) => (['dat', 'nhan_viec'].includes(tt) ? 'dat' : tt === 'khong_dat' ? 'khong' : tt === 'rut' ? 'rut' : 'dang')

function Cham({ tt, dang }) {
  const k = KQ_LAN[nhomKQ(tt)]
  return <i className={'lan-cham' + (dang ? ' dang' : '')} style={{ background: k.mau, '--vong': k.mau }} />
}

// Tag "Lần 3 ●●○" trên dòng ứng viên — bấm để xem nhanh các lần
export function TagLan({ r, onMo }) {
  const [mo, setMo] = useState(false)
  const [vt, setVt] = useState(null)
  const nut = useRef(null)
  const hop = useRef(null)
  useLayoutEffect(() => {
    if (!mo || !nut.current) return
    const b = nut.current.getBoundingClientRect()
    const rong = Math.min(320, window.innerWidth - 24)
    const trai = Math.max(12, Math.min(b.left, window.innerWidth - rong - 12))
    const duoi = window.innerHeight - b.bottom > 260
    setVt({ left: trai, width: rong, ...(duoi ? { top: b.bottom + 6 } : { bottom: window.innerHeight - b.top + 6 }) })
  }, [mo])
  useEffect(() => {
    if (!mo) return
    const dong = (e) => { if (!hop.current?.contains(e.target) && !nut.current?.contains(e.target)) setMo(false) }
    const cuon = () => setMo(false)
    document.addEventListener('pointerdown', dong)
    window.addEventListener('scroll', cuon, true)
    window.addEventListener('resize', cuon)
    return () => { document.removeEventListener('pointerdown', dong); window.removeEventListener('scroll', cuon, true); window.removeEventListener('resize', cuon) }
  }, [mo])
  if (!r?.so_lan || r.so_lan < 2) return null
  const ds = r.lan_ds || []
  const moiNhat = ds[ds.length - 1]
  return (
    <>
      <button ref={nut} type="button" className={'tag-lan' + (mo ? ' on' : '')}
        title={`Ứng tuyển lần ${r.lan_thu}/${r.so_lan} — bấm xem lịch sử`}
        onClick={(e) => { e.stopPropagation(); setMo((x) => !x) }}>
        <b>Lần {r.lan_thu}</b>
        <em className="lan-chams">{ds.map((x) => <Cham key={x.id} tt={x.tt} dang={x.id === r.id} />)}</em>
      </button>
      {mo && vt && (
        <div ref={hop} className="lan-pop" style={vt} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Lịch sử ứng tuyển">
          <div className="lan-pop-dau">
            <History size={15} />
            <b>Ứng tuyển {r.so_lan} lần</b>
            <small>cùng số điện thoại</small>
          </div>
          {ds.slice().reverse().map((x) => {
            const k = KQ_LAN[nhomKQ(x.tt)]
            const day = x.id === r.id
            return (
              <button key={x.id} type="button" className={'lan-pop-dong' + (day ? ' day' : '')} disabled={day}
                onClick={() => { setMo(false); onMo?.(x) }}>
                <Cham tt={x.tt} />
                <div className="lan-pop-giua">
                  <b>Lần {x.lan}{day && <small> · đang xem</small>}</b>
                  <small>{fmtNgay(x.ngay)} · {x.vt}</small>
                </div>
                <em className="lan-kq" style={{ color: k.mau }}>{GD[x.tt]?.ten || k.ten}</em>
                {!day && <ChevronRight size={14} className="muted" />}
              </button>
            )
          })}
          {moiNhat && moiNhat.id !== r.id && <div className="lan-pop-chan">Ứng viên đã có hồ sơ mới hơn (lần {moiNhat.lan}).</div>}
        </div>
      )}
    </>
  )
}

// Thẻ "Lịch sử ứng tuyển" trong hồ sơ chi tiết — chỉ hiện khi ứng viên có từ 2 lần trở lên hoặc nghi trùng
export function LichSuUngTuyen({ id, nhip }) {
  const { data: d } = useAsync(() => rpc('td_lich_su_ung_tuyen', { p_id: id }).catch(() => null), [id, nhip])
  if (!d) return null
  const ds = d.ds || []
  const nt = d.nghi_trung || []
  if (ds.length < 2 && !nt.length) return null
  const dem = ds.reduce((a, x) => { const k = nhomKQ(x.tt); a[k] = (a[k] || 0) + 1; return a }, {})
  return (
    <section className="card the-lich-su">
      <div className="dau-the">
        <h2>Lịch sử ứng tuyển</h2>
        {ds.length > 1 && <span className="ls-so">{ds.length} lần</span>}
      </div>

      {ds.length > 1 && <>
        <div className="ls-thanh" aria-hidden="true">
          {ds.map((x) => <i key={x.id} className={x.hien_tai ? 'dang' : ''} style={{ background: KQ_LAN[nhomKQ(x.tt)].mau }} />)}
        </div>
        <div className="ls-tom">
          {['dat', 'khong', 'dang', 'rut'].filter((k) => dem[k]).map((k) => (
            <span key={k}><i style={{ background: KQ_LAN[k].mau }} />{dem[k]} {KQ_LAN[k].ten.toLowerCase()}</span>
          ))}
        </div>

        <ol className="ls-dong-thoi-gian">
          {ds.slice().reverse().map((x) => {
            const k = KQ_LAN[nhomKQ(x.tt)]
            const noiDung = (
              <>
                <div className="ls-dau">
                  <b>Lần {x.lan}</b>
                  {x.hien_tai && <span className="ls-dang-xem">Đang xem</span>}
                  <span className="gian" />
                  <StageTag ma={x.tt} />
                </div>
                <div className="ls-phu">Nộp {fmtNgay(x.nop_luc)} · {x.vi_tri}{x.ma ? ' · ' + x.ma : ''}</div>
                {(x.ly_do || x.diem != null || x.cua_hang || x.nguoi_chot) && (
                  <div className="ls-chi-tiet">
                    {x.diem != null && <span>Điểm PV <b>{Number(x.diem).toFixed(1)}</b></span>}
                    {x.cua_hang && <span>Nhận việc tại <b>{x.cua_hang}</b>{x.ngay_nhan_viec ? ' · ' + fmtNgay(x.ngay_nhan_viec) : ''}</span>}
                    {x.ly_do && <span>Lý do: {x.ly_do}</span>}
                    {x.nguoi_chot && <span>Chốt bởi {x.nguoi_chot}{x.chot_luc ? ' · ' + fmtNgay(x.chot_luc) : ''}</span>}
                  </div>
                )}
              </>
            )
            return (
              <li key={x.id} className={x.hien_tai ? 'hien-tai' : ''} style={{ '--mau': k.mau }}>
                <i className="ls-nut" />
                {!x.hien_tai && x.xem
                  ? <Link to={'/quantri/ung-vien/' + x.id} className="ls-than co-link">{noiDung}<ChevronRight size={15} className="ls-mui" /></Link>
                  : <div className="ls-than">{noiDung}</div>}
              </li>
            )
          })}
        </ol>
      </>}

      {nt.length > 0 && (
        <div className="ls-nghi-trung">
          <div className="ls-nt-dau"><UserSearch size={15} /><b>Có thể là cùng một người</b></div>
          {nt.map((x) => (
            <Link key={x.id} to={'/quantri/ung-vien/' + x.id} className="ls-nt-dong">
              <div className="gian">
                <b>{x.ho_ten}</b>
                <small>{x.sdt ? fmtSdt(x.sdt) + ' · ' : ''}{x.ly_do === 'email' ? 'trùng email' : 'trùng họ tên + ngày sinh'} · {x.so_lan} hồ sơ</small>
              </div>
              <StageTag ma={x.tt} />
              <ChevronRight size={14} className="muted" />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
