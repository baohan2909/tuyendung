import { useMemo, useState } from 'react'
import { Download, Lock, Timer } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { congNgay, fmtDiem, ngayVN, phanTram } from '../lib/format'
import { xuatExcel } from '../lib/excel'
import { Btn, Empty, Field, Segment, Skeleton, useToast } from '../components/ui'
import { useStaff } from './context'

const MAU_NOP = '#D6006C'
const MAU_DAT = '#3B6FE0'

function khoang(ma) {
  const h = ngayVN()
  const [y, m] = h.split('-').map(Number)
  const dauThang = (yy, mm) => yy + '-' + String(mm).padStart(2, '0') + '-01'
  if (ma === '7') return [congNgay(h, -6), h]
  if (ma === '30') return [congNgay(h, -29), h]
  if (ma === '90') return [congNgay(h, -89), h]
  if (ma === 'thang') return [dauThang(y, m), h]
  if (ma === 'thang_truoc') { const yy = m === 1 ? y - 1 : y, mm = m === 1 ? 12 : m - 1; return [dauThang(yy, mm), congNgay(dauThang(y, m), -1)] }
  return null
}

function HaiCot({ ds }) {
  const [hv, setHv] = useState(null)
  const max = Math.max(1, ...ds.map((x) => x.n))
  const nhanMoi = Math.ceil(ds.length / 10)
  return (
    <div className="bieu-do">
      <div className="chu-giai" style={{ marginBottom: 6 }}><span><i style={{ background: MAU_NOP }} />Hồ sơ nộp</span><span><i style={{ background: MAU_DAT }} />Đạt</span></div>
      <div className="bd-cot" style={{ height: 170, gap: ds.length > 45 ? 2 : 6 }} onMouseLeave={() => setHv(null)}>
        {ds.map((x, i) => (
          <div key={x.ngay} className="c" onMouseEnter={() => setHv(i)} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }} aria-label={x.ngay + ': ' + x.n + ' nộp, ' + x.dat + ' đạt'}>
            {hv === i && <span className="goi-y-bd" style={{ left: '50%', top: 4, transform: 'translate(-50%, -100%)' }}>{x.ngay.slice(8, 10)}/{x.ngay.slice(5, 7)}: <b>{x.n}</b> nộp · <b>{x.dat}</b> đạt</span>}
            <span className="t" style={{ width: 'min(45%, 11px)', height: (x.n / max) * 100 + '%', background: MAU_NOP, opacity: hv == null || hv === i ? 1 : 0.55 }} />
            <span className="t" style={{ width: 'min(45%, 11px)', height: (x.dat / max) * 100 + '%', background: MAU_DAT, opacity: hv == null || hv === i ? 1 : 0.55 }} />
          </div>
        ))}
      </div>
      <div className="bd-day" />
      <div className="hang" style={{ gap: ds.length > 45 ? 2 : 6, marginTop: 6 }}>
        {ds.map((x, i) => <span key={x.ngay} className="muted" style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10.5, whiteSpace: 'nowrap', visibility: i % nhanMoi === 0 ? 'visible' : 'hidden' }}>{x.ngay.slice(8, 10)}/{x.ngay.slice(5, 7)}</span>)}
      </div>
    </div>
  )
}

function BangSo({ cot, dong }) {
  return (
    <div style={{ overflowX: 'auto' }} className="cuon-mong">
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13.5, minWidth: 520 }}>
        <thead><tr>{cot.map((c, i) => <th key={i} style={{ textAlign: i ? 'right' : 'left', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, padding: '0 10px 10px' }}>{c}</th>)}</tr></thead>
        <tbody>{dong.map((r, j) => <tr key={j}>{r.map((v, i) => <td key={i} className="so" style={{ textAlign: i ? 'right' : 'left', padding: '11px 10px', borderTop: '1px solid var(--line)', fontWeight: i ? 700 : 600 }}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export default function Reports() {
  const s = useStaff()
  const bao = useToast()
  const [ma, setMa] = useState('30')
  const [tuy, setTuy] = useState(() => khoang('30'))
  const [tu, den] = ma === 'tuy_chon' ? tuy : khoang(ma)
  const { data: d, loading } = useAsync(() => rpc('td_bao_cao', { p_tu: tu, p_den: den }), [tu, den, s.nhip])
  const t = d?.tong || {}
  const tongNguon = useMemo(() => Math.max(1, ...(d?.nguon || []).map((x) => x.nop)), [d])
  const tongKV = useMemo(() => Math.max(1, ...(d?.khu_vuc || []).map((x) => x.n)), [d])
  if (s.vaiTro === 'phong_van') return <div className="card"><Empty icon={Lock} tieuDe="Báo cáo dành cho bộ phận tuyển dụng" /></div>

  async function xuat() {
    try {
      await xuatExcel('NS-bao-cao-tuyen-dung-' + tu + '_' + den + '.xlsx', [
        { ten: 'Tổng quan', cot: [{ k: 'a', ten: 'Chỉ số', w: 28 }, { k: 'b', ten: 'Giá trị', w: 12 }], dong: [
          { a: 'Khoảng thời gian', b: tu + ' → ' + den }, { a: 'Hồ sơ nộp', b: t.nop }, { a: 'Qua sàng lọc', b: t.sang_loc }, { a: 'Hẹn phỏng vấn', b: t.hen_pv },
          { a: 'Đã phỏng vấn', b: t.da_pv }, { a: 'Đạt', b: t.dat }, { a: 'Nhận việc', b: t.nhan_viec }, { a: 'Không đạt', b: t.khong_dat }, { a: 'Dự bị', b: t.du_bi },
          { a: 'Đang xử lý', b: t.dang_xu_ly }, { a: 'TB ngày nộp → phỏng vấn', b: d.thoi_gian?.nop_den_pv }, { a: 'TB ngày nộp → đạt', b: d.thoi_gian?.nop_den_dat }] },
        { ten: 'Theo vị trí', cot: [{ k: 'ten', ten: 'Vị trí', w: 26 }, { k: 'nop', ten: 'Nộp' }, { k: 'hen_pv', ten: 'Hẹn PV' }, { k: 'da_pv', ten: 'Đã PV' }, { k: 'dat', ten: 'Đạt' }, { k: 'nhan_viec', ten: 'Nhận việc' }, { k: 'diem_tb', ten: 'Điểm TB' }], dong: d.vi_tri },
        { ten: 'Theo nguồn', cot: [{ k: 'ten', ten: 'Nguồn thông tin', w: 46 }, { k: 'nop', ten: 'Nộp' }, { k: 'dat', ten: 'Đạt' }], dong: d.nguon },
        { ten: 'Theo kênh QR', cot: [{ k: 'ma', ten: 'Mã', w: 14 }, { k: 'ten', ten: 'Kênh', w: 30 }, { k: 'nop', ten: 'Nộp' }, { k: 'dat', ten: 'Đạt' }], dong: d.kenh },
        { ten: 'Theo ngày', cot: [{ k: 'ngay', ten: 'Ngày', w: 12 }, { k: 'n', ten: 'Nộp' }, { k: 'dat', ten: 'Đạt' }], dong: d.theo_ngay },
        { ten: 'Người phỏng vấn', cot: [{ k: 'ho_ten', ten: 'Người phỏng vấn', w: 24 }, { k: 'so_phieu', ten: 'Số phiếu' }, { k: 'diem_tb', ten: 'Điểm TB' }, { k: 'dat', ten: 'Đề xuất đạt' }], dong: d.nguoi_cham }
      ])
      bao('Đã xuất báo cáo')
    } catch (e) { bao(e.message, 'loi') }
  }

  const Chi = ({ nhan, so, phu, cham, nen }) => (
    <div className="kpi"><span className="blob" style={{ background: nen }} /><span className="nhan"><i style={{ background: cham }} />{nhan}</span><span className="so-lon"><b>{so ?? '—'}</b>{phu && <span className="delta trung">{phu}</span>}</span></div>
  )
  return (
    <>
      <header className="trang-dau">
        <div className="tieu"><span className="eyebrow">Báo cáo</span><h1>Hiệu quả <b>tuyển dụng</b></h1><p className="phu">{tu.split('-').reverse().join('/')} – {den.split('-').reverse().join('/')}</p></div>
        <Btn kieu="den" orb="trai" icon={Download} onClick={xuat} disabled={!d}>Xuất Excel</Btn>
      </header>
      <div className="hang wrap" style={{ gap: 10 }}>
        <div className="loc-cuon" style={{ maxWidth: '100%' }}><Segment trang ds={[{ v: '7', t: '7 ngày' }, { v: '30', t: '30 ngày' }, { v: 'thang', t: 'Tháng này' }, { v: 'thang_truoc', t: 'Tháng trước' }, { v: '90', t: '90 ngày' }, { v: 'tuy_chon', t: 'Tùy chọn' }]} giaTri={ma} onChon={(v) => { if (v === 'tuy_chon') setTuy([tu, den]); setMa(v) }} /></div>
        {ma === 'tuy_chon' && <div className="hang" style={{ gap: 8 }}>
          <Field kieu="gon" nhan="Từ" type="date" value={tuy[0]} max={tuy[1]} onChange={(e) => setTuy([e.target.value, tuy[1]])} />
          <Field kieu="gon" nhan="Đến" type="date" value={tuy[1]} min={tuy[0]} onChange={(e) => setTuy([tuy[0], e.target.value])} />
        </div>}
      </div>

      {loading && !d ? <div className="kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="kpi"><Skeleton h={14} w="60%" /><Skeleton h={36} w="40%" /></div>)}</div> : <>
        <section className="kpis">
          <Chi nhan="Hồ sơ nộp" so={t.nop} cham="#D6006C" nen="#FDEBF3" phu={(t.dang_xu_ly || 0) + ' đang xử lý'} />
          <Chi nhan="Đã phỏng vấn" so={t.da_pv} cham="#7B2CBF" nen="#EFE8FB" phu={phanTram(t.da_pv, t.nop) + '%'} />
          <Chi nhan="Đạt" so={t.dat} cham="#12A37F" nen="#E6F6F0" phu={phanTram(t.dat, t.da_pv) + '% số PV'} />
          <Chi nhan="Nhận việc" so={t.nhan_viec} cham="#17111A" nen="#F1EDF3" phu={phanTram(t.nhan_viec, t.nop) + '% hồ sơ'} />
        </section>
        <div className="hai-cot">
          <section className="card lon">
            <div className="dau-the"><h2>Hồ sơ theo ngày</h2></div>
            {(d.theo_ngay || []).length ? <HaiCot ds={d.theo_ngay} /> : <p className="nho muted">Khoảng thời gian quá dài để vẽ theo ngày.</p>}
          </section>
          <section className="card-dark nho-cot">
            <div className="glow hong" style={{ width: 220, height: 220, right: -70, top: -90, opacity: 0.5, filter: 'blur(60px)' }} />
            <h2 style={{ marginBottom: 18 }}><Timer size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Tốc độ xử lý</h2>
            <div className="cot" style={{ gap: 18 }}>
              <div><div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{d.thoi_gian?.nop_den_pv != null ? fmtDiem(d.thoi_gian.nop_den_pv) : '—'}<small style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}> ngày</small></div><p className="nho" style={{ opacity: 0.7 }}>Trung bình từ lúc nộp đến buổi phỏng vấn đầu tiên</p></div>
              <div><div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{d.thoi_gian?.nop_den_dat != null ? fmtDiem(d.thoi_gian.nop_den_dat) : '—'}<small style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}> ngày</small></div><p className="nho" style={{ opacity: 0.7 }}>Trung bình từ lúc nộp đến khi có kết quả đạt</p></div>
              <div className="hang wrap" style={{ gap: 8 }}><span className="tag" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>{t.khong_dat || 0} không đạt</span><span className="tag" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>{t.du_bi || 0} dự bị</span></div>
            </div>
          </section>
        </div>
        <section className="card">
          <div className="dau-the"><h2>Theo vị trí</h2></div>
          <BangSo cot={['Vị trí', 'Nộp', 'Hẹn PV', 'Đã PV', 'Đạt', 'Nhận việc', 'Tỉ lệ đạt', 'Điểm TB']} dong={(d.vi_tri || []).map((v) => [v.ten, v.nop, v.hen_pv, v.da_pv, v.dat, v.nhan_viec, phanTram(v.dat, v.nop) + '%', v.diem_tb != null ? fmtDiem(v.diem_tb) : '—'])} />
        </section>
        <div className="hai-cot">
          <section className="card lon">
            <div className="dau-the"><h2>Nguồn thông tin</h2><span className="chu-giai"><span><i style={{ background: MAU_NOP }} />Nộp</span><span><i style={{ background: MAU_DAT }} />Đạt</span></span></div>
            <div className="cot" style={{ gap: 14 }}>
              {(d.nguon || []).map((x) => (
                <div key={x.ten}>
                  <div className="hang" style={{ fontSize: 13, marginBottom: 6 }}><span className="gian cat" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{x.ten}</span><b className="so">{x.nop}</b><span className="nho muted so" style={{ minWidth: 92, textAlign: 'right' }}>{x.dat} đạt · {phanTram(x.dat, x.nop)}%</span></div>
                  <div className="thanh" style={{ height: 8 }}><i style={{ width: (x.nop / tongNguon) * 100 + '%', background: MAU_NOP }} /></div>
                  <div className="thanh" style={{ height: 8, marginTop: 3, background: 'transparent' }}><i style={{ width: (x.dat / tongNguon) * 100 + '%', background: MAU_DAT }} /></div>
                </div>
              ))}
              {!(d.nguon || []).length && <p className="nho muted">Chưa có dữ liệu.</p>}
            </div>
          </section>
          <section className="card nho-cot">
            <div className="dau-the"><h2>Khu vực mong muốn · top 10</h2></div>
            <div className="cot" style={{ gap: 12 }}>
              {(d.khu_vuc || []).map((x) => (
                <div key={x.ten} className="hang" style={{ gap: 10, fontSize: 13 }}><span className="cat" style={{ width: 110, fontWeight: 600, color: 'var(--ink-2)' }}>{x.ten}</span><span className="thanh gian"><i style={{ width: (x.n / tongKV) * 100 + '%' }} /></span><b className="so" style={{ width: 28, textAlign: 'right' }}>{x.n}</b></div>
              ))}
              {!(d.khu_vuc || []).length && <p className="nho muted">Chưa có dữ liệu.</p>}
            </div>
          </section>
        </div>
        <div className="hai-cot">
          <section className="card lon">
            <div className="dau-the"><h2>Kênh / mã QR</h2></div>
            {(d.kenh || []).length ? <BangSo cot={['Kênh', 'Mã', 'Nộp', 'Đạt', 'Tỉ lệ']} dong={d.kenh.map((k) => [k.ten, k.ma, k.nop, k.dat, phanTram(k.dat, k.nop) + '%'])} /> : <p className="nho muted">Chưa có hồ sơ đến từ link/QR có mã kênh. Tạo mã trong Cài đặt → Nguồn & QR.</p>}
          </section>
          <section className="card nho-cot">
            <div className="dau-the"><h2>Người phỏng vấn</h2></div>
            {(d.nguoi_cham || []).length ? <BangSo cot={['Người', 'Phiếu', 'Điểm TB', 'Đề xuất đạt']} dong={d.nguoi_cham.map((n) => [n.ho_ten, n.so_phieu, n.diem_tb != null ? fmtDiem(n.diem_tb) : '—', n.dat])} /> : <p className="nho muted">Chưa có phiếu chấm trong khoảng này.</p>}
          </section>
        </div>
      </>}
    </>
  )
}
