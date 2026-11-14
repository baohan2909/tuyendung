import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CloudOff, Film, Lock, Send } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { fmtDiem, fmtGio, fmtSdt, ngayVN, tuongDoi } from '../lib/format'
import { KET_LUAN } from '../lib/stages'
import { AnhKho, Avatar, Bao, Btn, Diem, Empty, Field, IconBtn, KetLuanTag, Ring, Skeleton, StageTag, useToast } from '../components/ui'
import { useStaff } from './context'

export function tinhDiem(tieuChi, diem) {
  let tong = 0, max = 0, du = 0
  for (const t of tieuChi) {
    const v = diem[t.id]
    if (v >= 1 && v <= 5) { tong += v * Number(t.trong_so); max += 5 * Number(t.trong_so); du++ }
  }
  return { diem: max ? Math.round((tong / max) * 1000) / 100 : null, du }
}

export default function Scorecard() {
  const { id } = useParams()
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const { data: d, loading, error, reload } = useAsync(() => rpc('td_chi_tiet', { p_id: id }), [id])
  const [diem, setDiem] = useState({})
  const [nhanXet, setNhanXet] = useState('')
  const [ketLuan, setKetLuan] = useState(null)
  const [trangThaiLuu, setTrangThaiLuu] = useState(null)
  const [daGui, setDaGui] = useState(false)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState(null)
  const [chot, setChot] = useState(true)
  const daNap = useRef(false)
  const hen = useRef(null)
  const doi = useRef(false)

  useEffect(() => {
    if (!d || daNap.current) return
    const p = d.phieu_cua_toi
    if (p) { setDiem(Object.fromEntries(Object.entries(p.diem || {}).map(([k, v]) => [k, Number(v)]))); setNhanXet(p.nhan_xet || ''); setKetLuan(p.ket_luan); setDaGui(!!p.da_gui) }
    daNap.current = true
  }, [d])

  const tieuChi = d?.tieu_chi || []
  const { diem: tong, du } = useMemo(() => tinhDiem(tieuChi, diem), [tieuChi, diem])

  // tự lưu nháp
  useEffect(() => {
    if (!daNap.current || daGui || !d || !doi.current) return
    clearTimeout(hen.current)
    hen.current = setTimeout(async () => {
      setTrangThaiLuu('dang')
      try { await rpc('td_luu_danh_gia', { p_ho_so_id: id, p: { diem, nhan_xet: nhanXet, ket_luan: ketLuan } }); setTrangThaiLuu('xong:' + Date.now()) } catch (e) { setTrangThaiLuu('loi') }
    }, 1100)
    return () => clearTimeout(hen.current)
  }, [diem, nhanXet, ketLuan])

  async function gui() {
    setLoi(null)
    if (du < tieuChi.length) return setLoi('Còn ' + (tieuChi.length - du) + ' tiêu chí chưa chấm.')
    if (!ketLuan) return setLoi('Chọn kết luận: Đạt, Dự bị hoặc Không đạt.')
    clearTimeout(hen.current)
    setDangGui(true)
    try {
      await rpc('td_luu_danh_gia', { p_ho_so_id: id, p: { diem, nhan_xet: nhanXet, ket_luan: ketLuan, gui: true } })
      if (chot && coChot) await rpc('td_chot_ket_qua', { p_id: id, p_ket_qua: ketLuan, p_ghi_chu: nhanXet ? nhanXet.slice(0, 200) : null })
      setDaGui(true)
      bao(chot && coChot ? 'Đã gửi phiếu & chốt kết quả: ' + KET_LUAN[ketLuan].ten : daGui ? 'Đã cập nhật phiếu chấm' : 'Đã gửi phiếu chấm')
      reload(true)
      s.lamMoi()
    } catch (e) { setLoi(e.message) }
    setDangGui(false)
  }

  if (error) return <div className="card"><Empty tieuDe="Không mở được phiếu chấm">{error.message}</Empty></div>
  if (loading && !d) return <div className="cot" style={{ gap: 18 }}><Skeleton h={60} w="60%" /><div className="hai-cot"><Skeleton h={520} style={{ flex: '3 1 560px', borderRadius: 30 }} /><Skeleton h={420} style={{ flex: '2 1 320px', borderRadius: 30 }} /></div></div>
  if (!s.coCham) return <div className="card"><Empty icon={Lock} tieuDe="Vai trò của bạn không chấm điểm">Liên hệ quản trị nếu cần quyền phỏng vấn.</Empty></div>

  const h = d.ho_so
  var coChot = ['hen_pv', 'da_pv', 'de_xuat', 'du_bi'].includes(h.trang_thai)
  const lichNay = d.lich.find((l) => l.trang_thai !== 'huy' && ngayVN(l.bat_dau) === ngayVN()) || d.lich.find((l) => l.trang_thai !== 'huy')
  const anh = d.tep.find((t) => t.loai === 'anh')
  const nguoiKhac = d.danh_gia.filter((g) => g.nguoi_cham !== s.toi.id)
  const luuTxt = trangThaiLuu === 'dang' ? 'Đang lưu…' : trangThaiLuu === 'loi' ? 'Chưa lưu được' : trangThaiLuu ? 'Đã lưu nháp ' + fmtGio(Number(trangThaiLuu.split(':')[1])) : daGui ? 'Đã gửi phiếu' : 'Tự lưu nháp'

  return (
    <>
      <header className="trang-dau" style={{ alignItems: 'center' }}>
        <IconBtn icon={ArrowLeft} nhan="Quay lại hồ sơ" onClick={() => nav('/quan-tri/ung-vien/' + id)} />
        <div className="tieu">
          <span className="eyebrow">{lichNay ? (ngayVN(lichNay.bat_dau) === ngayVN() ? 'Đang phỏng vấn · ' : 'Phỏng vấn · ') + fmtGio(lichNay.bat_dau) + ' – ' + fmtGio(new Date(new Date(lichNay.bat_dau).getTime() + lichNay.thoi_luong * 60000)) : 'Phiếu chấm phỏng vấn'}</span>
          <h1 style={{ fontSize: 28 }}>Phiếu chấm · <b>{h.ho_ten}</b></h1>
        </div>
        <span className="btn trang md" style={{ cursor: 'default', gap: 10, paddingLeft: 8 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: trangThaiLuu === 'loi' ? 'var(--err-bg)' : daGui ? 'var(--ok-bg)' : 'var(--pink-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {trangThaiLuu === 'loi' ? <CloudOff size={14} color="var(--err)" /> : daGui ? <Check size={15} color="var(--ok)" strokeWidth={3} /> : <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pink)' }} />}
          </span>{luuTxt}
        </span>
      </header>

      <div className="hai-cot">
        <section className="card" style={{ flex: '3 1 560px', minWidth: 0, borderRadius: 30, padding: 24 }} aria-label="Tiêu chí">
          <div className="dau-the" style={{ marginBottom: 4 }}><h2>Bộ tiêu chí · {h.vi_tri}</h2><span className="nho muted">Bấm để chấm 1–5</span></div>
          {tieuChi.map((t) => (
            <div key={t.id} className="tieu-chi">
              <div className="ten"><b>{t.ten}{Number(t.trong_so) !== 1 && <span className="tag" style={{ marginLeft: 8, height: 22, fontSize: 11 }}>×{Number(t.trong_so)}</span>}</b><span>{t.mo_ta}</span></div>
              <div className="cham-diem" role="radiogroup" aria-label={t.ten}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={diem[t.id] === n} aria-label={n + ' điểm'}
                    className={diem[t.id] === n ? 'on' : diem[t.id] > n ? 'duoi' : ''} onClick={() => { doi.current = true; setDiem((x) => ({ ...x, [t.id]: x[t.id] === n ? undefined : n })) }}>{n}</button>
                ))}
              </div>
            </div>
          ))}
          {!tieuChi.length && <Bao kieu="vang">Vị trí này chưa có bộ tiêu chí. Vào Vị trí tuyển để thêm.</Bao>}
          <div style={{ marginTop: 14 }}>
            <Field nhan="Nhận xét"><textarea rows={4} value={nhanXet} onChange={(e) => { doi.current = true; setNhanXet(e.target.value) }} placeholder="Điểm mạnh, điểm cần cải thiện, ca làm phù hợp…" maxLength={4000} /></Field>
          </div>
        </section>

        <aside style={{ flex: '2 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section className="card-dark" style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }} aria-label="Tổng điểm">
            <div className="glow hong" style={{ width: 260, height: 260, right: -90, top: -110, opacity: 0.55, filter: 'blur(80px)' }} />
            <div className="glow tim" style={{ width: 200, height: 200, left: -80, bottom: -90, opacity: 0.4, filter: 'blur(70px)' }} />
            <span className="eyebrow sang">Tổng điểm</span>
            <Ring pct={tong != null ? tong * 10 : 0} size={150} day={12}>
              <b style={{ fontSize: 44, lineHeight: 1 }}>{tong != null ? fmtDiem(tong) : '—'}</b><span style={{ fontSize: 12, opacity: 0.65 }}>/ 10 · {du}/{tieuChi.length} tiêu chí</span>
            </Ring>
            <div className="ket-luan" style={{ width: '100%' }} role="radiogroup" aria-label="Kết luận">
              {Object.entries(KET_LUAN).map(([k, v]) => <button key={k} type="button" role="radio" aria-checked={ketLuan === k} className={k + (ketLuan === k ? ' on' : '')} onClick={() => { doi.current = true; setKetLuan(k) }}>{v.ten}</button>)}
            </div>
            {coChot && <label className="hang" style={{ gap: 10, width: '100%', fontSize: 13, color: 'rgba(255,255,255,.85)', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); setChot((x) => !x) }}>
              <span className={'o-chon' + (chot ? ' on' : '')} style={chot ? { background: 'var(--pink)', borderColor: 'var(--pink)' } : { background: 'transparent', borderColor: 'rgba(255,255,255,.4)' }}>{chot && <Check size={13} strokeWidth={3} />}</span>
              <span>Đây là kết quả cuối cùng — chốt <b>{ketLuan ? KET_LUAN[ketLuan].ten : 'Đạt / Không đạt'}</b> cho hồ sơ</span></label>}
            {loi && <div className="bao loi" style={{ width: '100%' }}>{loi}</div>}
            <Btn kieu="trang" co="lg" orb icon={Send} loading={dangGui} onClick={gui} className="rong">{daGui ? 'Gửi lại phiếu' : 'Gửi phiếu chấm'}</Btn>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', textAlign: 'center' }}>{daGui ? 'Phiếu đã gửi — chỉnh sửa rồi bấm Gửi lại để cập nhật.' : 'Phiếu của người khác chỉ hiện sau khi bạn gửi (chấm độc lập).'}</p>
          </section>

          <section className="card">
            <div className="hang" style={{ gap: 14 }}>
              <span className="av lg" style={{ borderRadius: 20, width: 64, height: 78 }}>{anh ? <AnhKho path={anh.duong_dan_nho || anh.duong_dan} alt={h.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Avatar ten={h.ho_ten} />}</span>
              <div className="gian"><b style={{ fontSize: 16, display: 'block' }}>{h.ho_ten}</b><span className="nho muted-2">{h.tuoi} tuổi · {h.chieu_cao}cm/{h.can_nang}kg · {fmtSdt(h.sdt)}</span><div className="hang" style={{ gap: 6, marginTop: 6 }}><StageTag ma={h.trang_thai} />{d.tep.some((t) => t.loai === 'video') && <span className="tag"><Film size={12} />Có video</span>}</div></div>
            </div>
            <dl className="cap-tl" style={{ gridTemplateColumns: '1fr', marginTop: 14 }}>
              <dt>Kinh nghiệm</dt><dd style={{ fontWeight: 500 }}>{h.kinh_nghiem || '—'}</dd>
              <dt>Khu vực mong muốn · thu nhập</dt><dd style={{ fontWeight: 500 }}>{h.khu_vuc_mong_muon || '—'} · {h.thu_nhap_mong_muon || '—'}</dd>
            </dl>
            <Link to={'/quan-tri/ung-vien/' + id} className="nho dam">Xem hồ sơ đầy đủ, ảnh & video →</Link>
          </section>

          {daGui && nguoiKhac.length > 0 && (
            <section className="card">
              <h2 style={{ marginBottom: 12 }}>Phiếu của người khác</h2>
              <div className="cot" style={{ gap: 10 }}>
                {nguoiKhac.map((g) => (
                  <div key={g.id} className="hang" style={{ alignItems: 'flex-start' }}>
                    <Avatar ten={g.nguoi_ten} co="sm" />
                    <div className="gian"><b style={{ fontSize: 14 }}>{g.nguoi_ten}</b><div className="nho muted">{tuongDoi(g.gui_luc)}</div>{g.nhan_xet && <p className="nho" style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{g.nhan_xet}</p>}</div>
                    <KetLuanTag ma={g.ket_luan} /><Diem v={g.diem_tong} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}
