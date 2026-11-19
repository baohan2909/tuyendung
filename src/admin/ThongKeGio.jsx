import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Clock3, X } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { congNgay, ngayVN, phanTram, thu } from '../lib/format'
import { Segment, Skeleton } from '../components/ui'

/* ---------- Tiện ích chung ---------- */
function useRong() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setW(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}
// Trục Y "tròn số": chọn bước để có ≤ 4 vạch
function trucY(max) {
  const buoc = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find((t) => t * 4 >= max) || Math.ceil(max / 4)
  const dinh = Math.max(buoc, Math.ceil(max / buoc) * buoc)
  const vach = []
  for (let v = 0; v <= dinh; v += buoc) vach.push(v)
  return { dinh, vach }
}
const gioVN = () => Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })) % 24
const khung = (g) => g + 'h – ' + (g + 1) + 'h'
const dm = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '')
const tron1 = (v) => (Math.round(v * 10) / 10).toLocaleString('vi-VN')
// gom dòng {ng, g, n} → mảng 24 giờ
export function gom24(dong, loc) {
  const a = Array(24).fill(0)
  for (const r of dong || []) if (!loc || loc(r)) a[r.g] += r.n
  return a
}

/* ---------- Biểu đồ đường theo giờ (1 ngày, có đường so sánh) ---------- */
export function DuongGio({ a, b, tenA = 'Hồ sơ', tenB = 'Trung bình', cao = 168, catTai = null }) {
  const [ref, w] = useRong()
  const [hv, setHv] = useState(null)
  const T = 12, D = 24, L = 26, R = 10
  const { dinh, vach } = trucY(Math.max(1, ...a, ...(b || [])))
  const rong = Math.max(0, w - L - R)
  const x = (g) => L + (g * rong) / 23
  const y = (v) => T + (cao - T - D) * (1 - v / dinh)
  const den = catTai == null ? 23 : catTai
  const diemA = a.slice(0, den + 1).map((v, g) => [x(g), y(v)])
  const duong = (ds) => ds.map(([px, py], i) => (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1)).join(' ')
  const vung = diemA.length ? duong(diemA) + ` L${x(den).toFixed(1)} ${y(0)} L${x(0)} ${y(0)} Z` : ''
  const diemB = b ? b.map((v, g) => [x(g), y(v)]) : null
  const di = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHv(Math.max(0, Math.min(23, Math.round(((e.clientX - r.left - L) / rong) * 23))))
  }
  return (
    <div className="tkg-duong" ref={ref} style={{ height: cao }}>
      {w > 0 && <>
        <svg width={w} height={cao} onMouseMove={di} onMouseLeave={() => setHv(null)} role="img" aria-label={tenA + ' theo giờ'}>
          <defs>
            <linearGradient id="tkg-vung" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E0157E" stopOpacity=".22" /><stop offset="1" stopColor="#E0157E" stopOpacity="0" /></linearGradient>
          </defs>
          {vach.map((v) => <g key={v}><line x1={L} x2={w - R} y1={y(v)} y2={y(v)} className="tkg-luoi" /><text x={L - 7} y={y(v) + 3.5} className="tkg-so" textAnchor="end">{v}</text></g>)}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((g) => <text key={g} x={x(g)} y={cao - 6} className="tkg-so" textAnchor="middle">{g}h</text>)}
          {diemB && <path d={duong(diemB)} className="tkg-so-sanh" />}
          {vung && <path d={vung} fill="url(#tkg-vung)" />}
          {diemA.length > 0 && <path d={duong(diemA)} className="tkg-chinh" />}
          {hv != null && <line x1={x(hv)} x2={x(hv)} y1={T} y2={y(0)} className="tkg-ke" />}
          {hv != null && diemB && <circle cx={x(hv)} cy={y(b[hv])} r="3.5" className="tkg-cham-b" />}
          {hv != null && hv <= den && <circle cx={x(hv)} cy={y(a[hv])} r="4.5" className="tkg-cham" />}
          <rect x={L} y={0} width={rong} height={cao} fill="transparent" />
        </svg>
        {hv != null && (
          <div className="tkg-goi-y" style={{ left: Math.min(Math.max(x(hv), 70), w - 70), top: Math.max(0, Math.min(y(hv <= den ? a[hv] : 0), y(b ? b[hv] : 0)) - 10) }}>
            <b>{khung(hv)}</b>
            <span><i className="a" />{tenA}<em>{hv <= den ? a[hv] : '—'}</em></span>
            {b && <span><i className="b" />{tenB}<em>{tron1(b[hv])}</em></span>}
          </div>
        )}
      </>}
    </div>
  )
}

/* ---------- Biểu đồ cột 24 giờ (tổng một khoảng thời gian) ---------- */
export function CotGio({ a, soNgay }) {
  const [ref, w] = useRong()
  const cao = w && w < 600 ? 220 : 300
  const [hv, setHv] = useState(null)
  const T = 14, D = 24, L = 30, R = 4
  const tong = a.reduce((s, v) => s + v, 0)
  const max = Math.max(...a)
  const { dinh, vach } = trucY(Math.max(1, max))
  const o = Math.max(0, w - L - R) / 24
  const y = (v) => T + (cao - T - D) * (1 - v / dinh)
  const cot = Math.max(2, Math.min(28, o - 3))
  return (
    <div className="tkg-duong" ref={ref} style={{ height: cao || 300 }} onMouseLeave={() => setHv(null)}>
      {w > 0 && <>
        <svg width={w} height={cao} role="img" aria-label="Hồ sơ theo giờ nộp">
          {vach.map((v) => <g key={v}><line x1={L} x2={w - R} y1={y(v)} y2={y(v)} className="tkg-luoi" /><text x={L - 8} y={y(v) + 3.5} className="tkg-so" textAnchor="end">{v}</text></g>)}
          {a.map((v, g) => {
            const cx = L + o * g + o / 2, h = Math.max(v ? 2 : 0, y(0) - y(v))
            const r = Math.min(4, cot / 2, h)
            const xx = cx - cot / 2, yy = y(0) - h
            return (
              <g key={g} onMouseEnter={() => setHv(g)}>
                <rect x={L + o * g} y={T} width={o} height={cao - T - D} fill="transparent" />
                {h > 0 && <path className={'tkg-cot' + (v === max && max ? ' dinh' : '') + (hv != null && hv !== g ? ' mo' : '') + (hv === g ? ' hv' : '')}
                  d={`M${xx} ${y(0)} V${yy + r} Q${xx} ${yy} ${xx + r} ${yy} H${xx + cot - r} Q${xx + cot} ${yy} ${xx + cot} ${yy + r} V${y(0)} Z`} />}
                {g % 3 === 0 && <text x={cx} y={cao - 6} className="tkg-so" textAnchor="middle">{g}h</text>}
              </g>
            )
          })}
        </svg>
        {hv != null && (
          <div className="tkg-goi-y" style={{ left: Math.min(Math.max(L + o * hv + o / 2, 80), w - 80), top: Math.max(0, y(a[hv]) - 10) }}>
            <b>{khung(hv)}</b>
            <span><i className="a" />Hồ sơ<em>{a[hv]}</em></span>
            <span><i className="c" />Tỉ trọng<em>{phanTram(a[hv], tong)}%</em></span>
            {soNgay > 1 && <span><i className="b" />TB mỗi ngày<em>{tron1(a[hv] / soNgay)}</em></span>}
          </div>
        )}
      </>}
    </div>
  )
}

/* ---------- Bảng chi tiết 1 ngày (trong thẻ Hồ sơ 14 ngày) ---------- */
export function ChiTietNgay({ ngay, dong, soNgay, dong14 }) {
  const hn = ngayVN()
  const a = useMemo(() => gom24(dong, (r) => r.ng === ngay), [dong, ngay])
  const b = useMemo(() => gom24(dong14).map((v) => v / Math.max(1, soNgay)), [dong14, soNgay])
  const tong = a.reduce((s, v) => s + v, 0)
  const dinh = tong ? a.indexOf(Math.max(...a)) : null
  return (
    <div className="tkg-ngay">
      <div className="tkg-ngay-dau">
        <span><b>{thu(ngay + 'T12:00:00+07:00')} · {dm(ngay)}</b><small>{tong} hồ sơ{dinh != null ? ' · cao điểm ' + khung(dinh) : ''}</small></span>
      </div>
      <DuongGio a={a} b={b} tenA={'Ngày ' + dm(ngay)} tenB={'TB ' + soNgay + ' ngày'} catTai={ngay === hn ? gioVN() : null} />
      <div className="tkg-chu-giai">
        <span><i className="a" />Ngày {dm(ngay)}</span>
        <span><i className="b" />Trung bình {soNgay} ngày</span>
      </div>
    </div>
  )
}

/* ---------- Thẻ "Giờ nộp hồ sơ" theo khoảng thời gian ---------- */
const KY = [{ v: 'hom_nay', t: 'Hôm nay' }, { v: '7', t: '7 ngày' }, { v: '30', t: '30 ngày' }, { v: 'thang', t: 'Tháng này' }, { v: 'tat_ca', t: 'Tất cả' }, { v: 'tuy_chon', t: 'Tự chọn' }]
const BUOI = [['Đêm', 0, 6, '#C9B8D6'], ['Sáng', 6, 12, '#F6A8CB'], ['Chiều', 12, 18, '#E0157E'], ['Tối', 18, 24, '#8E1E8F']]

export function GioNopHoSo({ nhip }) {
  const hn = ngayVN()
  const [ky, setKy] = useState('30')
  const [tuy, setTuy] = useState([congNgay(hn, -6), hn])
  const [tu, den] = ky === 'hom_nay' ? [hn, hn] : ky === '7' ? [congNgay(hn, -6), hn] : ky === '30' ? [congNgay(hn, -29), hn]
    : ky === 'thang' ? [hn.slice(0, 8) + '01', hn] : ky === 'tuy_chon' ? tuy : ['', '']
  const { data, loading } = useAsync(() => rpc('td_hs_theo_gio', { p: { tu, den } }), [tu, den, nhip])
  const a = useMemo(() => gom24(data?.dong), [data])
  const tong = a.reduce((s, v) => s + v, 0)
  const tuThuc = data?.tu || tu, denThuc = data?.den || den
  const soNgay = tuThuc && denThuc ? Math.round((new Date(denThuc) - new Date(tuThuc)) / 864e5) + 1 : 1
  const xep = a.map((n, g) => ({ g, n })).filter((x) => x.n).sort((p, q) => q.n - p.n)
  const dinh = xep[0]
  const buoi = BUOI.map(([t, tu2, den2, mau]) => ({ t, mau, khung: tu2 + 'h–' + den2 + 'h', n: a.slice(tu2, den2).reduce((s, v) => s + v, 0) }))
  const buoiMax = buoi.reduce((m, x) => (x.n > m.n ? x : m), buoi[0])
  const ngoaiGio = a.reduce((s, v, g) => s + (g < 8 || g >= 18 ? v : 0), 0)
  return (
    <section className="card tkg-the" aria-label="Giờ nộp hồ sơ">
      <div className="dau-the" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="tkg-tieu"><h2><Clock3 size={18} />Giờ nộp hồ sơ</h2><small>{tuThuc ? (tuThuc === denThuc ? thu(tuThuc + 'T12:00:00+07:00') + ' ' + dm(tuThuc) : dm(tuThuc) + ' – ' + dm(denThuc)) + ' · ' : ''}{tong} hồ sơ</small></span>
        <div className="tkg-ky">
          <Segment ds={KY} giaTri={ky} onChon={setKy} />
          {ky === 'tuy_chon' && <span className="tkg-tuy">
            <input type="date" value={tuy[0]} max={tuy[1]} onChange={(e) => e.target.value && setTuy([e.target.value, tuy[1]])} aria-label="Từ ngày" />
            <span>→</span>
            <input type="date" value={tuy[1]} min={tuy[0]} onChange={(e) => e.target.value && setTuy([tuy[0], e.target.value])} aria-label="Đến ngày" />
          </span>}
        </div>
      </div>
      {loading && !data ? <Skeleton h={210} /> : (
        <div className="tkg-than">
          <div className="tkg-bieu-do">
            {tong ? <CotGio a={a} soNgay={soNgay} /> : <p className="tkg-trong">Chưa có hồ sơ nào trong khoảng này.</p>}
          </div>
          <div className="tkg-so-lieu">
            <div className="tkg-o dinh">
              <small>Giờ cao điểm</small>
              <b>{dinh ? khung(dinh.g) : '—'}</b>
              <span>{dinh ? dinh.n + ' hồ sơ · ' + phanTram(dinh.n, tong) + '%' : 'chưa có dữ liệu'}</span>
              {xep.length > 1 && <em>Tiếp theo: {xep.slice(1, 3).map((x) => x.g + 'h').join(', ')}</em>}
            </div>
            <div className="tkg-o">
              <small>Theo buổi</small>
              <div className="tkg-buoi-thanh">{buoi.map((x) => x.n > 0 && <i key={x.t} style={{ flex: x.n, background: x.mau }} title={x.t + ': ' + x.n} />)}</div>
              <ul className="tkg-buoi">
                {buoi.map((x) => (
                  <li key={x.t} className={tong && x === buoiMax ? 'on' : ''}><i style={{ background: x.mau }} /><span>{x.t}<small>{x.khung}</small></span><b>{phanTram(x.n, tong)}%</b></li>
                ))}
              </ul>
            </div>
            <div className="tkg-o hai">
              <span><small>TB mỗi ngày</small><b>{tron1(tong / soNgay)}</b></span>
              <span><small>Ngoài giờ HC</small><b>{phanTram(ngoaiGio, tong)}%</b></span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function NutDong({ onClick }) {
  return <button type="button" className="tkg-dong" onClick={onClick} aria-label="Đóng biểu đồ theo giờ"><X size={14} /></button>
}
