import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, Hourglass, PhoneMissed, CloudOff, Copy, Lock, Mail, MessageCircle, Send, Phone, Store, ThumbsDown, UserCheck, ExternalLink } from 'lucide-react'
import { docBang, rpc } from '../lib/api'
import { gioiTinhHS, tinDat, tinKhongDat } from '../lib/thongBao'
import { useAsync } from '../lib/hooks'
import { congNgay, fmtDiem, fmtGio, fmtNgay, fmtSdt, ngayVN, tuongDoi } from '../lib/format'
import { GD, KET_LUAN } from '../lib/stages'
import { Avatar, Bao, Btn, Chips, Diem, Empty, Field, IconBtn, KetLuanTag, Lightbox, Ring, Skeleton, StageTag, useToast } from '../components/ui'
import { useStaff } from './context'
import { BangThongTin, KhuAnhVideo } from './Profile'
import { ChonCuaHang, LY_DO_LOAI, NhanViecModal } from './stageActions'
import { GuiThuModal } from './Email'

export function tinhDiem(tieuChi, diem) {
  let tong = 0, max = 0, du = 0
  for (const t of tieuChi) {
    const v = diem[t.id]
    if (v >= 1 && v <= 5) { tong += v * Number(t.trong_so); max += 5 * Number(t.trong_so); du++ }
  }
  return { diem: max ? Math.round((tong / max) * 1000) / 100 : null, du }
}

const KQ = [
  { v: 'dat', t: 'Đạt', ic: CheckCircle2 },
  { v: 'can_nhac', t: 'Cân nhắc thêm', ic: Hourglass },
  { v: 'chua_lien_lac', t: 'Chưa liên lạc được', ic: PhoneMissed },
  { v: 'khong_dat', t: 'Không đạt', ic: ThumbsDown }
]

// PHIẾU PHỎNG VẤN: bên trái toàn bộ hồ sơ (ảnh, video, thông tin), bên phải chấm điểm → kết quả → nhận việc
export default function Scorecard() {
  const { id } = useParams()
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const { data: d, loading, error, reload } = useAsync(() => rpc('td_chi_tiet', { p_id: id }), [id])
  const [diem, setDiem] = useState({})
  const [nhanXet, setNhanXet] = useState('')
  const [ketLuan, setKetLuan] = useState(null)
  const [nv, setNv] = useState({ cua_hang_ma: '', ngay_nhan_viec: congNgay(ngayVN(), 1), gio_nhan_viec: '08:00', gio_ket_thuc: '16:00', gioi_tinh: '', ghi_chu_nhan_viec: '' })
  const [trangThaiLuu, setTrangThaiLuu] = useState(null)
  const [daGui, setDaGui] = useState(false)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState(null)
  const [anhMo, setAnhMo] = useState(null)
  const [moNhanViec, setMoNhanViec] = useState(false)
  const [moThu, setMoThu] = useState(null)
  const daNap = useRef(false)
  const daBatDau = useRef(false)
  const hen = useRef(null)
  const doi = useRef(false)

  // Mở phiếu = bắt đầu phỏng vấn (hồ sơ đang "Chờ xử lý" tự chuyển sang "Phỏng vấn")
  useEffect(() => {
    if (!d || daBatDau.current || !s.coCham) return
    daBatDau.current = true
    if (['moi', 'sang_loc'].includes(d.ho_so.trang_thai)) rpc('td_bat_dau_pv', { p_id: id }).then(() => { reload(true); s.taiDem() }).catch(() => {})
  }, [d]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!d || daNap.current) return
    const p = d.phieu_cua_toi
    if (p) { setDiem(Object.fromEntries(Object.entries(p.diem || {}).map(([k, v]) => [k, Number(v)]))); setNhanXet(p.nhan_xet || ''); setKetLuan(p.ket_luan); setDaGui(!!p.da_gui) }
    const h = d.ho_so
    if (['dat', 'khong_dat', 'can_nhac', 'chua_lien_lac'].includes(h.trang_thai) && !p?.ket_luan) setKetLuan(h.trang_thai)
    setNv((x) => ({ ...x, gioi_tinh: gioiTinhHS(h) }))
    if (h.cua_hang_du_kien || h.ngay_nhan_viec) setNv({ cua_hang_ma: h.cua_hang_du_kien || '', ngay_nhan_viec: h.ngay_nhan_viec || congNgay(ngayVN(), 1), gio_nhan_viec: h.gio_nhan_viec ? String(h.gio_nhan_viec).slice(0, 5) : '08:00', gio_ket_thuc: h.gio_ket_thuc ? String(h.gio_ket_thuc).slice(0, 5) : '16:00', gioi_tinh: gioiTinhHS(h), ghi_chu_nhan_viec: h.ghi_chu_nhan_viec || '' })
    daNap.current = true
  }, [d])

  const { data: dsCh } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const tieuChi = d?.tieu_chi || []
  const { diem: tong, du } = useMemo(() => tinhDiem(tieuChi, diem), [tieuChi, diem])

  // tự lưu nháp phiếu chấm
  useEffect(() => {
    if (!daNap.current || !d || !doi.current) return
    clearTimeout(hen.current)
    hen.current = setTimeout(async () => {
      setTrangThaiLuu('dang')
      try { await rpc('td_luu_danh_gia', { p_ho_so_id: id, p: { diem, nhan_xet: nhanXet, ket_luan: ketLuan, gui: daGui || undefined } }); setTrangThaiLuu('xong:' + Date.now()) } catch (e) { setTrangThaiLuu('loi') }
    }, 1100)
    return () => clearTimeout(hen.current)
  }, [diem, nhanXet, ketLuan]) // eslint-disable-line react-hooks/exhaustive-deps

  async function hoanTat() {
    setLoi(null)
    if (!ketLuan) return setLoi('Chọn kết quả phỏng vấn.')
    const duTieuChi = du === tieuChi.length && tieuChi.length > 0
    if (ketLuan === 'dat' && !duTieuChi) return setLoi('Còn ' + (tieuChi.length - du) + ' tiêu chí chưa chấm.')
    if (ketLuan === 'dat' && !nv.cua_hang_ma) return setLoi('Chọn cửa hàng nhận việc cho ứng viên đạt.')
    if (ketLuan === 'dat' && !nv.ngay_nhan_viec) return setLoi('Chọn ngày hội nhập.')
    if (ketLuan === 'dat' && !nv.gio_nhan_viec) return setLoi('Chọn giờ bắt đầu ca làm việc.')
    if (ketLuan === 'dat' && !nv.gioi_tinh) return setLoi('Chọn giới tính để gửi đúng quy định trang phục.')
    clearTimeout(hen.current)
    setDangGui(true)
    try {
      if (duTieuChi) await rpc('td_luu_danh_gia', { p_ho_so_id: id, p: { diem, nhan_xet: nhanXet, ket_luan: ketLuan, gui: true } })
      else await rpc('td_luu_danh_gia', { p_ho_so_id: id, p: { diem, nhan_xet: nhanXet, ket_luan: ketLuan } })
      await rpc('td_ket_qua_pv', { p_id: id, p: { ket_qua: ketLuan, ghi_chu: nhanXet ? nhanXet.slice(0, 300) : null, ...(ketLuan === 'dat' ? nv : {}) } })
      setDaGui(duTieuChi)
      bao('Đã hoàn tất phỏng vấn: ' + KET_LUAN[ketLuan].ten)
      if (ketLuan === 'dat' || ketLuan === 'khong_dat') setMoThu(ketLuan)
      reload(true)
      s.taiDem()
    } catch (e) { setLoi(e.message) }
    setDangGui(false)
  }

  if (error) return <div className="card"><Empty tieuDe="Không mở được phiếu phỏng vấn">{error.message}</Empty></div>
  if (loading && !d) return <div className="cot" style={{ gap: 18 }}><Skeleton h={60} w="60%" /><div className="phieu-pv"><Skeleton h={620} style={{ borderRadius: 30 }} /><Skeleton h={620} style={{ borderRadius: 30 }} /></div></div>
  if (!s.coCham) return <div className="card"><Empty icon={Lock} tieuDe="Vai trò của bạn không phỏng vấn">Liên hệ quản trị nếu cần quyền phỏng vấn.</Empty></div>

  const h = d.ho_so
  const anh = d.tep.filter((t) => t.loai === 'anh')
  const video = d.tep.filter((t) => t.loai === 'video')
  const nguoiKhac = d.danh_gia.filter((g) => g.nguoi_cham !== s.toi.id)
  const daChot = ['dat', 'khong_dat', 'nhan_viec'].includes(h.trang_thai)
  const luuTxt = trangThaiLuu === 'dang' ? 'Đang lưu…' : trangThaiLuu === 'loi' ? 'Chưa lưu được' : trangThaiLuu ? 'Đã lưu ' + fmtGio(Number(trangThaiLuu.split(':')[1])) : 'Tự lưu khi chấm'
  const datNv = (k) => (e) => setNv((x) => ({ ...x, [k]: e.target ? e.target.value : e }))

  return (
    <>
      <header className="trang-dau" style={{ alignItems: 'center' }}>
        <IconBtn icon={ArrowLeft} nhan="Quay lại" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/quantri/ung-vien'))} />
        <div className="tieu">
          <span className="eyebrow">Phiếu phỏng vấn · {h.ma}</span>
          <h1><span><b>{h.ho_ten}</b></span><span className="dem-phu"><i style={{ background: GD[h.trang_thai]?.cham }} />{GD[h.trang_thai]?.ten}</span></h1>
        </div>
        <span className="btn trang md luu-trang-thai">
          <span className="ltt-cham" style={{ background: trangThaiLuu === 'loi' ? 'var(--err-bg)' : 'var(--ok-bg)' }}>{trangThaiLuu === 'loi' ? <CloudOff size={14} color="var(--err)" /> : <Check size={14} color="var(--ok)" strokeWidth={3} />}</span>{luuTxt}
        </span>
      </header>

      <div className="phieu-pv">
        {/* ===== Trái: hồ sơ ứng viên đầy đủ ===== */}
        <div className="pv-trai">
          <section className="card pv-dau">
            <Avatar ten={h.ho_ten} path={anh[0]?.duong_dan_nho || anh[0]?.duong_dan} co="xl" phong />
            <div className="gian" style={{ minWidth: 0 }}>
              <b className="pv-ten">{h.vi_tri}</b>
              <span className="nho muted-2">{h.tuoi} tuổi · {h.chieu_cao} cm · {h.can_nang} kg · {h.khu_vuc_mong_muon || h.cho_o}</span>
              <div className="hang wrap" style={{ gap: 6, marginTop: 10 }}>
                <a className="btn den sm" href={'tel:' + h.sdt}><Phone size={14} />{fmtSdt(h.sdt)}</a>
                <a className="btn trang sm" href={'https://zalo.me/' + h.sdt} target="_blank" rel="noreferrer"><MessageCircle size={14} />Zalo</a>
                <Btn kieu="trang" co="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(h.sdt).then(() => bao('Đã sao chép SĐT'))}>Sao chép</Btn>
                <Link className="btn trong sm" to={'/quantri/ung-vien/' + id}><ExternalLink size={14} />Hồ sơ</Link>
              </div>
            </div>
          </section>
          <KhuAnhVideo anh={anh} video={video} moAnh={setAnhMo} />
          <section className="card">
            <div className="dau-the"><h2>Thông tin ứng tuyển</h2></div>
            <BangThongTin h={h} gon />
          </section>
          {nguoiKhac.length > 0 && (
            <section className="card">
              <div className="dau-the"><h2>Người khác đã chấm</h2></div>
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
          {d.so_phieu_an > 0 && <Bao kieu="xanh">{d.so_phieu_an} phiếu của người khác sẽ hiện sau khi bạn hoàn tất (chấm độc lập).</Bao>}
        </div>

        {/* ===== Phải: chấm điểm → kết quả → nhận việc ===== */}
        <div className="pv-phai">
          <section className="card pv-cham" aria-label="Chấm điểm">
            <div className="pv-tong">
              <Ring pct={tong != null ? tong * 10 : 0} size={78} day={7} nen="var(--soft-2)" trong="#fff">
                <b style={{ fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}>{tong != null ? fmtDiem(tong) : '—'}</b><span style={{ fontSize: 10, color: 'var(--muted)' }}>/ 10</span>
              </Ring>
              <div className="gian">
                <span className="eyebrow">Chấm điểm · {h.vi_tri}</span>
                <b style={{ display: 'block', fontSize: 15 }}>{du}/{tieuChi.length} tiêu chí đã chấm</b>
                <span className="nho muted">Bấm 1 – 5 cho từng tiêu chí</span>
              </div>
            </div>
            {tieuChi.map((t) => (
              <div key={t.id} className="tieu-chi gon">
                <div className="ten"><b>{t.ten}{Number(t.trong_so) !== 1 && <span className="tag" style={{ marginLeft: 8, height: 20, fontSize: 10.5 }}>×{Number(t.trong_so)}</span>}</b>{t.mo_ta && <span>{t.mo_ta}</span>}</div>
                <div className="cham-diem" role="radiogroup" aria-label={t.ten}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={diem[t.id] === n} aria-label={n + ' điểm'}
                      className={diem[t.id] === n ? 'on' : diem[t.id] > n ? 'duoi' : ''} onClick={() => { doi.current = true; setDiem((x) => ({ ...x, [t.id]: x[t.id] === n ? undefined : n })) }}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
            {!tieuChi.length && <Bao kieu="vang">Vị trí này chưa có bộ tiêu chí. Vào Vị trí tuyển để thêm.</Bao>}
            <Field nhan="Nhận xét"><textarea rows={3} value={nhanXet} onChange={(e) => { doi.current = true; setNhanXet(e.target.value) }} placeholder="Điểm mạnh, điểm cần cải thiện, ca làm phù hợp…" maxLength={4000} /></Field>
          </section>

          <section className="card pv-kq" aria-label="Kết quả">
            <span className="eyebrow">Kết quả phỏng vấn</span>
            <div className="kq-chon" role="radiogroup">
              {KQ.map((k) => (
                <button key={k.v} type="button" role="radio" aria-checked={ketLuan === k.v} className={'kq-' + k.v + (ketLuan === k.v ? ' on' : '')} onClick={() => { doi.current = true; setKetLuan(k.v) }}>
                  <k.ic size={18} />{k.t}
                </button>
              ))}
            </div>

            {ketLuan === 'dat' && (
              <div className="pv-nhan-viec">
                <b className="pnv-tieu"><Store size={16} />Thông tin nhận việc</b>
                <ChonCuaHang giaTri={nv.cua_hang_ma} onChon={datNv('cua_hang_ma')} goiY={[h.khu_vuc_mong_muon, String(h.cho_o || '').split(',')[0]]} />
                <div className="luoi-2">
                  <Field kieu="gon" nhan="Ngày hội nhập" type="date" value={nv.ngay_nhan_viec} onChange={datNv('ngay_nhan_viec')} />
                  <div className="luoi-2" style={{ gap: 6 }}>
                    <Field kieu="gon" nhan="Ca từ" type="time" value={nv.gio_nhan_viec} onChange={datNv('gio_nhan_viec')} />
                    <Field kieu="gon" nhan="Đến" type="time" value={nv.gio_ket_thuc} onChange={datNv('gio_ket_thuc')} />
                  </div>
                </div>
                <div className="chips">
                  {[['Ngày mai', congNgay(ngayVN(), 1)], ['Ngày kia', congNgay(ngayVN(), 2)]].map(([t, v]) => <button key={t} type="button" className={'chip sm' + (nv.ngay_nhan_viec === v ? ' on' : '')} onClick={() => setNv((x) => ({ ...x, ngay_nhan_viec: v }))}>{t} · {fmtNgay(v + 'T12:00:00+07:00').slice(0, 5)}</button>)}
                  {[['08:00', '16:00'], ['09:00', '17:00'], ['14:00', '22:00']].map(([a, b]) => <button key={a} type="button" className={'chip sm' + (nv.gio_nhan_viec === a && nv.gio_ket_thuc === b ? ' on' : '')} onClick={() => setNv((x) => ({ ...x, gio_nhan_viec: a, gio_ket_thuc: b }))}>Ca {a.slice(0, 2).replace(/^0/, '')}h–{b.slice(0, 2)}h</button>)}
                </div>
                <div className="hang wrap" style={{ gap: 8 }}><span className="nhan-nhom" style={{ margin: 0 }}>Trang phục theo</span><Chips ds={['Nữ', 'Nam']} giaTri={nv.gioi_tinh} onChon={(v) => setNv((x) => ({ ...x, gioi_tinh: v }))} co="sm" /></div>
                <Field kieu="gon" nhan="Ghi chú nhận việc" value={nv.ghi_chu_nhan_viec} onChange={datNv('ghi_chu_nhan_viec')} placeholder="VD: Gặp chị Lan cửa hàng trưởng khi đến" maxLength={500} />
              </div>
            )}
            {ketLuan === 'khong_dat' && (
              <div className="cot" style={{ gap: 8 }}>
                <span className="nhan-nhom">Lý do (chỉ lưu nội bộ)</span>
                <Chips ds={LY_DO_LOAI} giaTri={nhanXet} onChon={(v) => { doi.current = true; setNhanXet(v) }} co="sm" />
              </div>
            )}

            {(ketLuan === 'khong_dat' || (ketLuan === 'dat' && nv.cua_hang_ma)) && (() => {
              const ch = (dsCh || []).find((c) => c.ma === nv.cua_hang_ma)
              const cd = s.dm.caiDat
              const tin = ketLuan === 'dat' ? tinDat(cd.mau_tin_dat, h, nv, ch, cd) : tinKhongDat(cd.mau_tin_khong_dat, h)
              return (
                <details className={'tin-bao ' + ketLuan} open={daChot}>
                  <summary><Send size={15} /><b>Tin báo cho ứng viên</b><span className="nho muted">{ketLuan === 'dat' ? 'Trúng tuyển · nơi làm, giờ, tác phong' : 'Chưa phù hợp · lời cảm ơn & động viên'}</span></summary>
                  <pre>{tin}</pre>
                  <div className="hang wrap" style={{ gap: 6 }}>
                    {daChot && h.trang_thai === ketLuan && <Btn kieu="den" co="sm" icon={Mail} onClick={() => setMoThu(ketLuan)}>Gửi email</Btn>}
                    <Btn kieu="trang" co="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(tin).then(() => bao('Đã sao chép tin báo'))}>Sao chép tin</Btn>
                    <Btn kieu="trang" co="sm" icon={MessageCircle} onClick={() => { navigator.clipboard?.writeText(tin); bao('Đã sao chép — dán vào Zalo'); window.open('https://zalo.me/' + h.sdt, '_blank') }}>Sao chép & mở Zalo</Btn>
                  </div>
                  <span className="nho muted">Ứng viên tra cứu bằng SĐT hoặc mã {h.ma} cũng thấy đúng nội dung này.</span>
                </details>
              )
            })()}
            {loi && <Bao kieu="loi">{loi}</Bao>}
            <Btn kieu="den" co="lg" orb icon={Check} loading={dangGui} onClick={hoanTat} className="rong">{daChot ? 'Cập nhật kết quả' : 'Hoàn tất phỏng vấn'}</Btn>
            {h.trang_thai === 'dat' && s.coSua && <Btn kieu="xanh" co="md" icon={UserCheck} onClick={() => setMoNhanViec(true)} className="rong">Ứng viên đã đến — xác nhận nhận việc</Btn>}
            {daChot && <p className="nho muted" style={{ textAlign: 'center' }}>Đã chốt {GD[h.trang_thai]?.ten}{h.trang_thai === 'dat' && h.noi_lam_viec ? ' · ' + h.noi_lam_viec + (h.ngay_nhan_viec ? ' · ' + fmtNgay(h.ngay_nhan_viec + 'T12:00:00+07:00') : '') + (h.gio_nhan_viec ? ' lúc ' + String(h.gio_nhan_viec).slice(0, 5) : '') : ''}</p>}
          </section>
        </div>
      </div>
      {anhMo != null && <Lightbox ds={anh.map((t) => t.duong_dan)} chiSo={anhMo} dong={() => setAnhMo(null)} />}
      {moThu && <GuiThuModal hoSoId={id} loai={moThu} ten={h.ho_ten} dong={() => setMoThu(null)} />}
      {moNhanViec && <NhanViecModal hs={h} dong={() => setMoNhanViec(false)} xong={() => { setMoNhanViec(false); reload(true); s.taiDem() }} />}
    </>
  )
}
