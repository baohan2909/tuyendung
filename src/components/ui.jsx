import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Info, X, AlertCircle, Sparkles, Inbox } from 'lucide-react'
import { GD, KET_LUAN, LICH_TT } from '../lib/stages'
import { chuCai, fmtDiem, mauAv } from '../lib/format'
import { useSignedUrl } from '../lib/hooks'

// Biểu tượng chiếc nón
export function NonIcon({ size = 18, stroke = 1.9 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 15c0-5 4-9 9-9s9 4 9 9" /><path d="M2 15h20" /><path d="M12 6V3.5" />
    </svg>
  )
}

export function Brand({ toi = true, nho }) {
  return (
    <div className="hang" style={{ gap: 9 }}>
      <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: toi ? 'rgba(255,255,255,.12)' : 'var(--ink)', border: toi ? '1px solid rgba(255,255,255,.22)' : 'none', color: '#fff' }}>
        <NonIcon />
      </span>
      <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '.18em', color: toi ? '#fff' : 'var(--ink)' }}>{nho || 'NÓN SƠN'}</span>
    </div>
  )
}

export function Spinner({ size = 22 }) { return <span className="spin" style={{ width: size, height: size }} aria-label="Đang tải" /> }

export function Btn({ kieu, co, orb, loading, icon: Icon, children, className = '', ...p }) {
  const cls = ['btn', kieu, co, orb ? 'co-orb' : '', orb === 'trai' ? 'trai' : '', className].filter(Boolean).join(' ')
  const qua = (
    <span className={'orb' + (co === 'lg' ? '' : ' sm')}>
      {loading ? <Spinner size={16} /> : Icon ? <Icon size={16} strokeWidth={2.6} /> : <ArrowRight size={17} strokeWidth={2.6} />}
    </span>
  )
  return (
    <button type="button" className={cls} disabled={loading || p.disabled} {...p}>
      {orb === 'trai' && qua}
      {!orb && loading && <Spinner size={16} />}
      {!orb && !loading && Icon && <Icon size={17} strokeWidth={2.2} />}
      {children}
      {orb && orb !== 'trai' && qua}
    </button>
  )
}

export function IconBtn({ icon: Icon, nhan, kieu = '', co = '', size = 18, className = '', children, ...p }) {
  return (
    <button type="button" className={['icon-btn', kieu, co, className].join(' ')} aria-label={nhan} title={nhan} {...p}>
      <Icon size={size} strokeWidth={2} />
      {children}
    </button>
  )
}

export function Field({ nhan, batBuoc, loi, goiY, kieu, className = '', children, ...p }) {
  return (
    <div>
      <label className={['field', kieu, loi ? 'loi' : '', className].join(' ')}>
        <span className="nhan">{nhan}{batBuoc && <i>*</i>}</span>
        {children || <input {...p} />}
        {goiY && <div className="goi-y">{goiY}</div>}
      </label>
      {loi && typeof loi === 'string' && <div className="loi-chu">{loi}</div>}
    </div>
  )
}

export function Chips({ ds, giaTri, onChon, nhieu, tick, co = '', trang }) {
  const on = (v) => (nhieu ? (giaTri || []).includes(v) : giaTri === v)
  return (
    <div className="chips" role={nhieu ? 'group' : 'radiogroup'}>
      {ds.map((x) => {
        const v = typeof x === 'string' ? x : x.v
        const t = typeof x === 'string' ? x : x.t
        return (
          <button key={v} type="button" role={nhieu ? 'checkbox' : 'radio'} aria-checked={on(v)}
            className={['chip', co, tick ? 'tick' : '', trang ? 'trang' : '', on(v) ? 'on' : ''].join(' ')}
            onClick={() => onChon(nhieu ? (on(v) ? giaTri.filter((y) => y !== v) : [...(giaTri || []), v]) : v)}>
            {t}{x.dem != null && <span className="dem">{x.dem}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Segment({ ds, giaTri, onChon, trang }) {
  return (
    <div className={'phan-doan' + (trang ? ' trang' : '')} role="tablist">
      {ds.map((x) => (
        <button key={x.v} type="button" role="tab" aria-selected={giaTri === x.v} className={giaTri === x.v ? 'on' : ''} onClick={() => onChon(x.v)}>
          {x.icon && <x.icon size={15} strokeWidth={2.2} />}{x.t}
        </button>
      ))}
    </div>
  )
}

export function Switch({ on, onDoi, nhan }) {
  return <button type="button" role="switch" aria-checked={!!on} aria-label={nhan} className={'cong-tac' + (on ? ' on' : '')} onClick={() => onDoi(!on)} />
}

export function StageTag({ ma, lg }) {
  const g = GD[ma]
  if (!g) return null
  return <span className={'tag' + (lg ? ' lg' : '')} style={{ background: g.bg, color: g.fg }}>{g.ten}</span>
}
export function LichTag({ ma }) {
  const g = LICH_TT[ma]
  if (!g) return null
  return <span className="tag" style={{ background: g.bg, color: g.fg }}>{g.ten}</span>
}
export function KetLuanTag({ ma }) {
  const g = KET_LUAN[ma]
  if (!g) return null
  return <span className="tag" style={{ background: g.bg, color: g.fg }}>{g.ten}</span>
}
export function Diem({ v }) {
  if (v == null) return <span className="diem chua">—</span>
  const n = Number(v)
  return <span className={'diem ' + (n >= 8.5 ? 'cao' : n >= 7 ? 'kha' : 'thap')}>{fmtDiem(n)}</span>
}

export function Avatar({ ten, path, co = '', className = '' }) {
  const url = useSignedUrl(path)
  const [bg, fg] = mauAv(ten)
  return (
    <span className={['av', co, className].join(' ')} style={{ background: bg, color: fg }}>
      {url ? <img src={url} alt="" loading="lazy" /> : chuCai(ten)}
    </span>
  )
}

export function Ring({ pct, size = 92, day = 8, mau = 'var(--pink-3)', nen = 'rgba(255,255,255,.14)', trong = '#241520', children }) {
  const p = Math.max(0, Math.min(100, pct || 0))
  return (
    <div className="vong" style={{ width: size, height: size, background: `conic-gradient(${mau} 0 ${p}%, ${nen} ${p}% 100%)` }}>
      <div className="trong" style={{ inset: day, background: trong }}>{children}</div>
    </div>
  )
}

export function Glows({ ds }) {
  return ds.map((g, i) => (
    <div key={i} aria-hidden="true" className={'glow ' + (g.mau || 'hong')} style={{ width: g.s, height: g.s, opacity: g.o ?? 0.6, filter: `blur(${g.b ?? 70}px)`, left: g.l, right: g.r, top: g.t, bottom: g.bt }} />
  ))
}

export function Empty({ icon: Icon = Inbox, tieuDe, children }) {
  return (
    <div className="rong-trong">
      <span className="ic"><Icon size={28} /></span>
      {tieuDe && <b>{tieuDe}</b>}
      {children && <div className="nho">{children}</div>}
    </div>
  )
}

export function Bao({ kieu = 'xanh', children }) {
  const Ic = kieu === 'loi' ? AlertCircle : kieu === 'ok' ? Check : Info
  return <div className={'bao ' + kieu}><Ic size={17} /><div>{children}</div></div>
}

// ---------- Hộp thoại ----------
export function Modal({ mo, dong, tieuDe, moTa, rong, children, chan }) {
  useEffect(() => {
    if (!mo) return
    const f = (e) => { if (e.key === 'Escape') dong() }
    window.addEventListener('keydown', f)
    const cu = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = cu }
  }, [mo, dong])
  if (!mo) return null
  return createPortal(
    <div className="man-che" onMouseDown={(e) => { if (e.target === e.currentTarget) dong() }}>
      <div className={'hop' + (rong ? ' rong' : '')} role="dialog" aria-modal="true" aria-label={tieuDe}>
        <div className="hop-dau">
          <div className="gian"><h2>{tieuDe}</h2>{moTa && <p>{moTa}</p>}</div>
          <IconBtn icon={X} nhan="Đóng" kieu="mem" co="sm" onClick={dong} />
        </div>
        {children}
        {chan && <div className="hop-chan">{chan}</div>}
      </div>
    </div>,
    document.body
  )
}

// ---------- Menu nổi ----------
export function Menu({ nut, children, canh = 'phai', rong }) {
  const [mo, setMo] = useState(false)
  const [vt, setVt] = useState(null)
  const goc = useRef(null)
  const hop = useRef(null)
  useLayoutEffect(() => {
    if (!mo || !goc.current) return
    const r = goc.current.getBoundingClientRect()
    const w = rong || 240
    let left = canh === 'phai' ? r.right - w : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    let top = r.bottom + 6 + window.scrollY
    const h = hop.current ? hop.current.offsetHeight : 240
    if (r.bottom + h + 12 > window.innerHeight && r.top - h - 6 > 0) top = r.top - h - 6 + window.scrollY
    setVt({ left: left + window.scrollX, top, width: w })
  }, [mo, canh, rong])
  useEffect(() => {
    if (!mo) return
    const f = (e) => { if (!hop.current?.contains(e.target) && !goc.current?.contains(e.target)) setMo(false) }
    const k = (e) => { if (e.key === 'Escape') setMo(false) }
    document.addEventListener('mousedown', f)
    document.addEventListener('touchstart', f)
    window.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('touchstart', f); window.removeEventListener('keydown', k) }
  }, [mo])
  return (
    <>
      <span ref={goc} style={{ display: 'inline-flex' }} onClick={(e) => { e.stopPropagation(); setMo((x) => !x) }}>{nut}</span>
      {mo && createPortal(
        <div ref={hop} className="menu" style={{ position: 'absolute', ...(vt || { visibility: 'hidden' }) }} onClick={(e) => e.stopPropagation()}>
          {typeof children === 'function' ? children(() => setMo(false)) : children}
        </div>, document.body)}
    </>
  )
}

// ---------- Thông báo nhanh ----------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [ds, setDs] = useState([])
  const bao = useCallback((noiDung, kieu = 'ok', opt = {}) => {
    const id = Math.random().toString(36).slice(2)
    setDs((x) => [...x.slice(-2), { id, noiDung, kieu, ...opt }])
    setTimeout(() => setDs((x) => x.filter((t) => t.id !== id)), opt.ms || (kieu === 'loi' ? 5200 : 3200))
  }, [])
  return (
    <ToastCtx.Provider value={bao}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite">
          {ds.map((t) => (
            <div key={t.id} className={'toast ' + t.kieu}>
              <span className="ic">{t.kieu === 'loi' ? <AlertCircle size={16} /> : t.kieu === 'hong' ? <Sparkles size={15} /> : <Check size={16} strokeWidth={3} />}</span>
              <span>{t.noiDung}</span>
              {t.hanhDong && <button onClick={() => { t.hanhDong.lam(); setDs((x) => x.filter((y) => y.id !== t.id)) }}>{t.hanhDong.ten}</button>}
            </div>
          ))}
        </div>, document.body)}
    </ToastCtx.Provider>
  )
}

// ---------- Xác nhận ----------
const XacNhanCtx = createContext(null)
export const useXacNhan = () => useContext(XacNhanCtx)
export function XacNhanProvider({ children }) {
  const [hoi, setHoi] = useState(null)
  const xacNhan = useCallback((o) => new Promise((ok) => setHoi({ ...o, ok })), [])
  const xong = (v) => { hoi?.ok(v); setHoi(null) }
  return (
    <XacNhanCtx.Provider value={xacNhan}>
      {children}
      <Modal mo={!!hoi} dong={() => xong(false)} tieuDe={hoi?.tieuDe} moTa={hoi?.moTa}
        chan={<>
          <Btn kieu="trong" onClick={() => xong(false)}>Hủy</Btn>
          <Btn kieu={hoi?.nguyHiem ? 'do' : 'den'} onClick={() => xong(true)}>{hoi?.nut || 'Đồng ý'}</Btn>
        </>}>
        {hoi?.noiDung}
      </Modal>
    </XacNhanCtx.Provider>
  )
}

// ---------- Xem ảnh lớn ----------
export function Lightbox({ ds, chiSo, dong }) {
  const [i, setI] = useState(chiSo || 0)
  const url = useSignedUrl(ds[i])
  useEffect(() => {
    const f = (e) => {
      if (e.key === 'Escape') dong()
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % ds.length)
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + ds.length) % ds.length)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [ds.length, dong])
  return createPortal(
    <div className="lightbox" onClick={dong}>
      {url ? <img src={url} alt={'Ảnh ' + (i + 1)} onClick={(e) => e.stopPropagation()} /> : <Spinner size={30} />}
      <IconBtn className="dong" icon={X} nhan="Đóng" kieu="kinh" onClick={dong} />
      {ds.length > 1 && <>
        <span className="truoc"><IconBtn icon={ChevronLeft} nhan="Ảnh trước" kieu="kinh" onClick={(e) => { e.stopPropagation(); setI((x) => (x - 1 + ds.length) % ds.length) }} /></span>
        <span className="sau"><IconBtn icon={ChevronRight} nhan="Ảnh sau" kieu="kinh" onClick={(e) => { e.stopPropagation(); setI((x) => (x + 1) % ds.length) }} /></span>
        <span className="dem-anh">{i + 1} / {ds.length}</span>
      </>}
    </div>, document.body)
}

// Ảnh trong kho riêng tư
export function AnhKho({ path, alt = '', className, style, onClick }) {
  const url = useSignedUrl(path)
  if (!url) return <div className={'khung ' + (className || '')} style={style} />
  return <img src={url} alt={alt} className={className} style={style} onClick={onClick} loading="lazy" />
}

// ---------- Biểu đồ cột đơn (1 chuỗi) ----------
export function BieuDoCot({ ds, cao = 120, nhanMoi = 1, mau = 'var(--pink)', donVi = 'hồ sơ' }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...ds.map((x) => x.n))
  return (
    <div className="bieu-do">
      <div className="bd-cot" style={{ height: cao }} onMouseLeave={() => setHover(null)}>
        {ds.map((x, i) => (
          <div key={i} className="c" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={x.nhan + ': ' + x.n + ' ' + donVi}>
            {hover === i && <span className="goi-y-bd" style={{ left: '50%', top: `calc(${100 - (x.n / max) * 100}% - 4px)` }}>{x.nhanDai || x.nhan}: <b>{x.n}</b> {donVi}</span>}
            <span className="t" style={{ height: (x.n / max) * 100 + '%', background: x.mau || mau, opacity: hover == null || hover === i ? 1 : 0.55 }} />
          </div>
        ))}
      </div>
      <div className="bd-day" />
      <div className="hang" style={{ gap: 6, marginTop: 6 }}>
        {ds.map((x, i) => <span key={i} className="nho muted" style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10.5, whiteSpace: 'nowrap', visibility: (ds.length - 1 - i) % nhanMoi === 0 ? 'visible' : 'hidden' }}>{x.nhan}</span>)}
      </div>
    </div>
  )
}

export function Skeleton({ h = 16, w = '100%', tron, style }) {
  return <div className={'khung' + (tron ? ' tron' : '')} style={{ height: h, width: w, ...style }} />
}
