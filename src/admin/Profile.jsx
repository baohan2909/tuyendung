import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarPlus, Check, ChevronLeft, ChevronRight, ClipboardCheck, Copy, Edit3, FileText, Filter, Mail, MessageCircle, MessageSquare, Phone, Send, Star, StickyNote, Trash2, UserCheck, X, CalendarCheck, UserX, Ban, Pencil, Activity } from 'lucide-react'
import { docBang, dsTep, rpc, xoaTep } from '../lib/api'
import { tinDat, tinKhongDat } from '../lib/thongBao'
import { useAsync, usePhim, useSignedUrl } from '../lib/hooks'
import { fmtDiem, fmtGio, fmtMB, fmtNgay, fmtNgayGio, fmtSdt, thu, tuongDoi } from '../lib/format'
import { GD, HINH_THUC, KET_LUAN } from '../lib/stages'
import { AnhKho, Avatar, Bao, Btn, Chips, Diem, Empty, Field, IconBtn, KetLuanTag, LichTag, Lightbox, Menu, Modal, Ring, Skeleton, StageTag, Switch, useToast, useXacNhan } from '../components/ui'
import { useStaff } from './context'
import LichModal from './LichModal'
import { HanhDongBuoc, MenuGiaiDoan, useDoiGiaiDoan } from './stageActions'
import TruyVet from './TruyVet'
import { ThuUngVien } from './Email'

const IC_HD = { email: Mail, email_phan_hoi: MessageSquare, nop: FileText, trang_thai: Filter, ghi_chu: StickyNote, hen_pv: CalendarPlus, lich: CalendarCheck, danh_gia: ClipboardCheck, phan_cong: UserCheck, sua: Pencil, ung_vien: MessageCircle }

export default function Profile() {
  const { id } = useParams()
  return <HoSoChiTiet id={id} />
}

// Toàn bộ thông tin hồ sơ trên 1 màn — dùng cho trang riêng và khung xem bên phải danh sách (nhung)
export function HoSoChiTiet({ id, nhung, nhip, onDoi, phai }) {
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const xacNhan = useXacNhan()
  const { data: d, loading, error, reload, setData } = useAsync(() => rpc('td_chi_tiet', { p_id: id }), [id, s.nhip, nhip])
  const [anhMo, setAnhMo] = useState(null)
  const [moLich, setMoLich] = useState(null)
  const [moSua, setMoSua] = useState(false)
  const [ghi, setGhi] = useState('')
  const [dangGhi, setDangGhi] = useState(false)
  const [the, setThe] = useState('')

  const [doiGD, giaoDienGD] = useDoiGiaiDoan({ xong: () => { reload(true); s.taiDem(); onDoi?.() }, henPV: () => setMoLich({}) })
  const thuTu = useMemo(() => { try { return JSON.parse(sessionStorage.getItem('ns-td-thu-tu')) || [] } catch (e) { return [] } }, [id])
  const vt = thuTu.indexOf(id)
  const truoc = vt > 0 ? thuTu[vt - 1] : null
  const sau = vt >= 0 && vt < thuTu.length - 1 ? thuTu[vt + 1] : null
  usePhim(['ArrowLeft', 'ArrowRight'], (e) => { if (e.key === 'ArrowLeft' && truoc) nav('/quantri/ung-vien/' + truoc); if (e.key === 'ArrowRight' && sau) nav('/quantri/ung-vien/' + sau) }, !nhung && anhMo == null && !moLich && !moSua)

  if (error) return <div className="card"><Empty icon={AlertTriangle} tieuDe="Không mở được hồ sơ">{error.message}</Empty><div className="hang" style={{ justifyContent: 'center' }}><Btn onClick={() => nav('/quantri/ung-vien')} icon={ArrowLeft}>Về danh sách</Btn></div></div>
  if (loading && !d) return <div className="cot" style={{ gap: 18 }}><Skeleton h={150} style={{ borderRadius: 34 }} /><div className={'hai-cot' + (nhung ? ' hs-nhung' : '')}><Skeleton h={420} style={{ flex: '2 1 520px', borderRadius: 28 }} /><Skeleton h={420} style={{ flex: '1 1 320px', borderRadius: 28 }} /></div></div>

  const h = d.ho_so
  const anh = d.tep.filter((t) => t.loai === 'anh')
  const video = d.tep.filter((t) => t.loai === 'video')
  const q = d.quyen || {}
  const capNhat = async (p, thongBao) => {
    try {
      const r = await rpc('td_cap_nhat_ho_so', { p_id: h.id, p })
      setData((x) => ({ ...x, ho_so: { ...x.ho_so, ...r, the_gan: r.the_gan } }))
      if (thongBao) bao(thongBao)
      reload(true); onDoi?.()
    } catch (e) { bao(e.message, 'loi') }
  }
  async function guiGhi() {
    if (!ghi.trim()) return
    setDangGhi(true)
    try { await rpc('td_ghi_chu', { p_id: h.id, p_noi_dung: ghi }); setGhi(''); reload(true) } catch (e) { bao(e.message, 'loi') }
    setDangGhi(false)
  }
  async function doiLich(l, tt) {
    if (tt === 'huy' && !(await xacNhan({ tieuDe: 'Hủy lịch phỏng vấn?', moTa: fmtGio(l.bat_dau) + ' ' + fmtNgay(l.bat_dau), nut: 'Hủy lịch', nguyHiem: true }))) return
    try { await rpc('td_doi_lich', { p_id: l.id, p_trang_thai: tt }); bao('Đã cập nhật lịch'); reload(true); s.taiDem() } catch (e) { bao(e.message, 'loi') }
  }
  async function xoaHan() {
    const ok = await xacNhan({ tieuDe: 'Xóa vĩnh viễn hồ sơ này?', moTa: h.ho_ten + ' · ' + h.ma, noiDung: <Bao kieu="loi">Toàn bộ thông tin, ảnh, video, lịch và phiếu chấm sẽ bị xóa và không khôi phục được.</Bao>, nut: 'Xóa vĩnh viễn', nguyHiem: true })
    if (!ok) return
    try {
      const tep = await dsTep(h.id)
      await xoaTep(tep)
      await rpc('td_xoa_ho_so', { p_ids: [h.id] })
      bao('Đã xóa hồ sơ')
      s.taiDem()
      nav('/quantri/ung-vien')
    } catch (e) { bao(e.message, 'loi') }
  }
  const tl = h.tra_loi_them && typeof h.tra_loi_them === 'object' ? Object.entries(h.tra_loi_them).filter(([, v]) => v) : []
  const tbDiem = h.diem_tb != null ? Number(h.diem_tb) : null

  return (
    <>
      <section className="ho-so-hero">
        <div className="glow hong" style={{ width: 360, height: 360, right: -100, top: -160, opacity: 0.55, filter: 'blur(90px)' }} />
        <div className="glow tim" style={{ width: 240, height: 240, left: '30%', bottom: -170, opacity: 0.45, filter: 'blur(80px)' }} />
        {!nhung && <IconBtn icon={ArrowLeft} nhan="Quay lại danh sách" kieu="kinh" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/quantri/ung-vien'))} />}
        {phai && <span className="hs-goc">{phai}</span>}
        <button type="button" className="av-lon" onClick={() => anh.length && setAnhMo(0)} aria-label="Xem ảnh" style={{ padding: 0 }}>
          {anh[0] ? <AnhKho path={anh[0].duong_dan_nho || anh[0].duong_dan} alt={h.ho_ten} /> : <Avatar ten={h.ho_ten} co="xl" />}
        </button>
        <div className="gian" style={{ flex: '1 1 260px' }}>
          <p className="eyebrow sang" style={{ marginBottom: 6 }}>{h.ma} · nộp {fmtNgayGio(h.nop_luc)}</p>
          <h1>{h.ho_ten} {h.uu_tien && <Star size={22} fill="#F5A524" color="#F5A524" style={{ verticalAlign: 2 }} />}</h1>
          <div className="hang wrap" style={{ gap: 8, marginTop: 10 }}>
            <span className="the-tt">{h.vi_tri}</span>
            <span className="the-tt">{h.tuoi} tuổi · {h.chieu_cao} cm · {h.can_nang} kg</span>
            <span className="the-tt cat" style={{ maxWidth: 260 }}>{h.cho_o}</span>
            <span className="the-tt" style={{ background: GD[h.trang_thai]?.cham || 'var(--pink)', color: '#fff', fontWeight: 700 }}>{GD[h.trang_thai]?.ten}</span>
          </div>
        </div>
        <div className="hang" style={{ gap: 16, flexWrap: 'wrap' }}>
          <Ring pct={tbDiem != null ? tbDiem * 10 : 0} size={92}>
            <b style={{ fontSize: 26, lineHeight: 1 }}>{tbDiem != null ? fmtDiem(tbDiem) : '—'}</b><span style={{ fontSize: 10.5, opacity: 0.65 }}>{h.so_danh_gia ? h.so_danh_gia + ' phiếu' : '/ 10'}</span>
          </Ring>
          <div className="hang wrap" style={{ gap: 8, maxWidth: 520 }}>
            <HanhDongBuoc h={h} doiGD={doiGD} sang />
            {q.sua && <MenuGiaiDoan hienTai={h.trang_thai} nut={<IconBtn icon={Filter} nhan="Chuyển giai đoạn khác" kieu="kinh" />} chon={(tt) => doiGD([h.id], tt, [h])} />}
          </div>
        </div>
      </section>

      <div className="hang wrap" style={{ gap: 8 }}>
        <a className="btn trang md" href={'tel:' + h.sdt}><Phone size={16} />{fmtSdt(h.sdt)}</a>
        <a className="btn trang md" href={'https://zalo.me/' + h.sdt} target="_blank" rel="noreferrer"><MessageCircle size={16} />Zalo</a>
        <a className="btn trang md" href={'sms:' + h.sdt}><MessageSquare size={16} />SMS</a>
        {h.email && <a className="btn trang md" href={'mailto:' + h.email}><Mail size={16} />Email</a>}
        <Btn kieu="trang" co="md" icon={Copy} onClick={() => navigator.clipboard?.writeText(h.sdt).then(() => bao('Đã sao chép SĐT'))}>Sao chép</Btn>
        {!nhung && <span className="day hang" style={{ gap: 6 }}>
          <IconBtn icon={ChevronLeft} nhan="Hồ sơ trước (←)" disabled={!truoc} onClick={() => nav('/quantri/ung-vien/' + truoc)} />
          {vt >= 0 && <span className="nho muted so">{vt + 1}/{thuTu.length}</span>}
          <IconBtn icon={ChevronRight} nhan="Hồ sơ sau (→)" disabled={!sau} onClick={() => nav('/quantri/ung-vien/' + sau)} />
        </span>}
      </div>

      {d.trung_sdt.length > 0 && (
        <Bao kieu="vang">Số điện thoại này đã nộp {d.trung_sdt.length} hồ sơ khác: {d.trung_sdt.map((x, i) => <span key={x.id}>{i ? ', ' : ''}<Link to={'/quantri/ung-vien/' + x.id} style={{ fontWeight: 700 }}>{x.ma}</Link> ({x.vi_tri}, {GD[x.trang_thai]?.ten}, {fmtNgay(x.nop_luc)})</span>)}</Bao>
      )}

      <div className="hai-cot">
        <div className="lon cot" style={{ gap: 18 }}>
          <KhuAnhVideo anh={anh} video={video} moAnh={setAnhMo} />
          <section className="card">
            <div className="dau-the"><h2>Thông tin ứng tuyển</h2>{q.sua && <Btn kieu="trong" co="sm" icon={Edit3} onClick={() => setMoSua(true)}>Sửa</Btn>}</div>
            <BangThongTin h={h} />
          </section>
        </div>

        <div className="nho-cot cot" style={{ gap: 18 }}>
          <TruyVet id={h.id} nhip={d.hoat_dong.length} />
          {d.lich.length > 0 && <section className="card">
            <div className="dau-the"><h2>Lịch phỏng vấn</h2>{q.sua && <Btn kieu="den" co="sm" icon={CalendarPlus} onClick={() => setMoLich({})}>Hẹn</Btn>}</div>
            {!d.lich.length ? <p className="nho muted">Chưa có lịch phỏng vấn.</p> : (
              <div className="cot" style={{ gap: 10 }}>
                {d.lich.map((l) => (
                  <div key={l.id} style={{ background: 'var(--soft)', borderRadius: 22, padding: '12px 14px' }}>
                    <div className="hang">
                      <div className="gian"><b style={{ fontSize: 15 }}>{fmtGio(l.bat_dau)} · {thu(l.bat_dau)} {fmtNgay(l.bat_dau)}</b><div className="nho muted-2">{HINH_THUC[l.hinh_thuc]}{l.dia_diem ? ' · ' + l.dia_diem : ''}</div></div>
                      <LichTag ma={l.trang_thai} />
                    </div>
                    {l.nguoi?.length > 0 && <div className="nho muted" style={{ marginTop: 6 }}>PV: {l.nguoi.map((n) => n.ho_ten).join(', ')}</div>}
                    {l.ung_vien_phan_hoi && <div className="bao vang" style={{ marginTop: 8, padding: '8px 12px', fontSize: 12.5 }}><MessageCircle size={14} /><div>Ứng viên: “{l.ung_vien_phan_hoi}”</div></div>}
                    {!['huy', 'da_dien_ra', 'vang_mat'].includes(l.trang_thai) && s.coCham && (
                      <div className="hang wrap" style={{ gap: 6, marginTop: 10 }}>
                        <Btn co="sm" kieu="xanh" icon={Check} onClick={() => doiLich(l, 'da_dien_ra')}>Đã PV</Btn>
                        <Btn co="sm" kieu="trang" icon={UserX} onClick={() => doiLich(l, 'vang_mat')}>Vắng</Btn>
                        {q.sua && <Btn co="sm" kieu="trang" icon={Pencil} onClick={() => setMoLich({ lich: l })}>Sửa</Btn>}
                        {q.sua && <Btn co="sm" kieu="trong" icon={Ban} onClick={() => doiLich(l, 'huy')}>Hủy</Btn>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>}

          <section className="card">
            <div className="dau-the"><h2>Đánh giá phỏng vấn</h2>{tbDiem != null && <Diem v={tbDiem} />}</div>
            {d.so_phieu_an > 0 && <Bao kieu="xanh">Có {d.so_phieu_an} phiếu của người khác — sẽ hiện sau khi bạn gửi phiếu của mình (chấm độc lập).</Bao>}
            {!d.danh_gia.length && !d.so_phieu_an && <p className="nho muted">Chưa có phiếu chấm nào.</p>}
            <div className="cot" style={{ gap: 10, marginTop: d.so_phieu_an ? 10 : 0 }}>
              {d.danh_gia.map((g) => (
                <div key={g.id} style={{ border: '1px solid var(--line)', borderRadius: 22, padding: '12px 14px' }}>
                  <div className="hang"><Avatar ten={g.nguoi_ten} co="sm" /><div className="gian"><b className="cat" style={{ display: 'block', fontSize: 14 }}>{g.nguoi_ten}</b><span className="nho muted">{g.chuc_danh || ''}{g.gui_luc ? ' · ' + tuongDoi(g.gui_luc) : ''}</span></div><KetLuanTag ma={g.ket_luan} /><Diem v={g.diem_tong} /></div>
                  <div className="cot" style={{ gap: 6, marginTop: 10 }}>
                    {d.tieu_chi.map((t) => { const v = g.diem?.[t.id]; return v ? (
                      <div key={t.id} className="hang" style={{ gap: 8, fontSize: 12.5 }}><span className="gian cat muted-2">{t.ten}</span><span className="thanh" style={{ width: 80, height: 6 }}><i style={{ width: v * 20 + '%' }} /></span><b className="so" style={{ width: 14, textAlign: 'right' }}>{v}</b></div>
                    ) : null })}
                  </div>
                  {g.nhan_xet && <p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{g.nhan_xet}</p>}
                </div>
              ))}
            </div>
          </section>

          {q.sua && (
            <section className="card">
              <div className="dau-the"><h2>Quản lý hồ sơ</h2></div>
              <div className="cot" style={{ gap: 14 }}>
                <div className="hang"><Star size={17} className="uu-tien-sao" /><span className="gian" style={{ fontWeight: 600, fontSize: 14 }}>Đánh dấu ưu tiên</span><Switch on={h.uu_tien} nhan="Ưu tiên" onDoi={(v) => capNhat({ uu_tien: v })} /></div>
                <div>
                  <span className="nhan-nhom">Thẻ</span>
                  <div className="chips">
                    {(h.the_gan || []).map((t) => <span key={t} className="chip sm on">{t}<button type="button" onClick={() => capNhat({ the_gan: h.the_gan.filter((x) => x !== t) })} aria-label={'Bỏ thẻ ' + t} style={{ border: 'none', background: 'none', color: 'inherit', padding: 0, display: 'flex' }}><X size={13} /></button></span>)}
                    <form onSubmit={(e) => { e.preventDefault(); if (the.trim()) { capNhat({ the_gan: [...(h.the_gan || []), the.trim()] }); setThe('') } }}>
                      <input className="chip sm" style={{ width: 120, border: 'none', outline: 'none' }} value={the} onChange={(e) => setThe(e.target.value)} placeholder="+ Thêm thẻ" maxLength={40} />
                    </form>
                  </div>
                </div>
                {['dat', 'nhan_viec', 'de_xuat', 'khong_dat'].includes(h.trang_thai) && <NhanViec h={h} />}
                <details className="mo-rong">
                  <summary>Người xử lý & lịch hẹn <span className="muted nho">(khi có nhiều người tuyển dụng)</span></summary>
                  <div className="cot" style={{ gap: 12, paddingTop: 12 }}>
                    <label className="field gon"><span className="nhan">Người phụ trách hồ sơ</span>
                      <select value={h.nguoi_phu_trach || ''} onChange={(e) => capNhat({ nguoi_phu_trach: e.target.value || null }, 'Đã cập nhật người phụ trách')}>
                        <option value="">— Chưa có —</option>
                        {s.dm.nhanSu.filter((n) => n.hoat_dong || n.id === h.nguoi_phu_trach).map((n) => <option key={n.id} value={n.id}>{n.ho_ten}</option>)}
                      </select>
                    </label>
                    <p className="nho muted" style={{ lineHeight: 1.5 }}>Người bấm “Phỏng vấn” đầu tiên được tự gán. Dùng để lọc “Của tôi” và cho tài khoản vai trò Phỏng vấn thấy hồ sơ được giao.</p>
                    <Btn kieu="trang" co="sm" icon={CalendarPlus} onClick={() => setMoLich({})} style={{ alignSelf: 'flex-start' }}>Hẹn lịch phỏng vấn (tùy chọn)</Btn>
                  </div>
                </details>
                {h.ly_do_loai && <Bao kieu="vang">Lý do không đạt: {h.ly_do_loai}</Bao>}
                {s.laQT && <Btn kieu="do" co="sm" icon={Trash2} onClick={xoaHan} style={{ alignSelf: 'flex-start' }}>Xóa vĩnh viễn hồ sơ</Btn>}
              </div>
            </section>
          )}

          <ThuUngVien h={h} nhip={h.trang_thai + (h.cua_hang_du_kien || '') + (h.ngay_nhan_viec || '')} />

          <section className="card">
            <div className="dau-the"><h2>Ghi chú & hoạt động</h2><Activity size={17} className="muted" /></div>
            {s.coCham && (
              <div className="hang" style={{ alignItems: 'flex-end', marginBottom: 16 }}>
                <label className="field gon gian" style={{ minHeight: 0 }}><span className="nhan">Ghi chú nội bộ</span><textarea rows={2} style={{ minHeight: 48 }} value={ghi} onChange={(e) => setGhi(e.target.value)} placeholder="Nhận xét, kết quả gọi điện…" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) guiGhi() }} /></label>
                <IconBtn icon={dangGhi ? Check : Send} nhan="Gửi ghi chú" kieu="mem" onClick={guiGhi} disabled={!ghi.trim() || dangGhi} style={{ background: 'var(--ink)', color: '#fff' }} />
              </div>
            )}
            <div className="dong-thoi-gian">
              {d.hoat_dong.map((a) => {
                const Ic = IC_HD[a.loai] || Activity
                return (
                  <div key={a.id} className={'m' + (a.loai === 'ghi_chu' ? ' ghi' : '')}>
                    <span className="ic" style={a.loai === 'nop' ? { background: 'var(--pink-bg)', color: 'var(--pink-deep)' } : a.loai === 'ung_vien' ? { background: 'var(--info-bg)', color: 'var(--info)' } : null}><Ic size={15} /></span>
                    <div className="nd">
                      <span>{a.nguoi || (a.loai === 'nop' || a.loai === 'ung_vien' ? 'Ứng viên' : 'Hệ thống')} · {tuongDoi(a.tao_luc)}</span>
                      <p>{a.noi_dung}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {anhMo != null && <Lightbox ds={anh.map((a) => a.duong_dan)} chiSo={anhMo} dong={() => setAnhMo(null)} />}
      {moLich && <LichModal hoSo={{ ...h }} lich={moLich.lich} dong={() => setMoLich(null)} xong={() => { setMoLich(null); reload(true); s.taiDem(); onDoi?.() }} />}
      {moSua && <SuaUngVien h={h} dong={() => setMoSua(false)} xong={() => { setMoSua(false); reload(true) }} />}
      {giaoDienGD}
    </>
  )
}

export function BangThongTin({ h, gon }) {
  const tl = h.tra_loi_them && typeof h.tra_loi_them === 'object' ? Object.entries(h.tra_loi_them).filter(([, v]) => v) : []
  return (
    <dl className={'cap-tl' + (gon ? ' gon' : '')}>
      <dt>Vị trí ứng tuyển</dt><dd>{h.vi_tri}</dd>
      <dt>Điện thoại</dt><dd><a href={'tel:' + h.sdt}>{fmtSdt(h.sdt)}</a></dd>
      {!gon && <><dt>Email</dt><dd>{h.email || '—'}</dd></>}
      <dt>Ngày sinh</dt><dd>{h.ngay_sinh ? fmtNgay(h.ngay_sinh + 'T12:00:00+07:00') + ' (' + h.tuoi + ' tuổi)' : '—'}</dd>
      <dt>Chiều cao · cân nặng</dt><dd>{h.chieu_cao} cm · {h.can_nang} kg</dd>
      <dt>Chỗ ở hiện tại</dt><dd>{h.cho_o || '—'}</dd>
      <dt>Khu vực mong muốn</dt><dd>{h.khu_vuc_mong_muon || '—'}</dd>
      <dt>Trình độ học vấn</dt><dd>{h.hoc_van || '—'}</dd>
      <dt>Ổn định / linh hoạt</dt><dd>{h.dinh_huong || '—'}</dd>
      <dt>Thu nhập mong muốn</dt><dd>{h.thu_nhap_mong_muon || '—'}</dd>
      <dt>Kinh nghiệm</dt><dd>{h.kinh_nghiem || '—'}</dd>
      <dt>Ấn tượng về Nón Sơn</dt><dd>{h.an_tuong || '—'}</dd>
      {tl.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></Fragment>)}
      <dt>Nguồn thông tin</dt><dd>{(h.nguon || []).join('\n') || '—'}</dd>
      {!gon && <><dt>Kênh / mã QR</dt><dd>{h.nguon_ten || h.ma_nguon || '—'}</dd></>}
      <dt>SĐT người giới thiệu</dt><dd>{h.sdt_gioi_thieu ? <a href={'tel:' + h.sdt_gioi_thieu}>{fmtSdt(h.sdt_gioi_thieu)}</a> : '—'}</dd>
      {!gon && <><dt>Thiết bị nộp</dt><dd className="muted" style={{ fontWeight: 500 }}>{h.thiet_bi || '—'}</dd></>}
    </dl>
  )
}

// Ảnh + video trên cùng một khung: ảnh lớn (rê vào ảnh nhỏ để đổi, bấm để phóng to) và video bên cạnh
export function KhuAnhVideo({ anh, video, moAnh }) {
  const [i, setI] = useState(0)
  const a = anh[i] || anh[0]
  return (
    <section className="card khu-av">
      <div className="kav-anh">
        <div className="dau-the"><h2>Ảnh · {anh.length}</h2>{anh.length > 1 && <span className="nho muted">Rê chuột để xem, bấm để phóng to</span>}</div>
        {a ? (
          <button type="button" className="kav-lon" onClick={() => moAnh(anh.indexOf(a))} aria-label="Phóng to ảnh">
            <AnhKho path={a.duong_dan} alt="" className="kav-mo" />
            <AnhKho path={a.duong_dan} alt="Ảnh ứng viên" className="kav-chinh" />
          </button>
        ) : <Empty icon={X} tieuDe="Không có ảnh" />}
        {anh.length > 1 && (
          <div className="kav-strip">
            {anh.map((t, k) => <button key={t.id} type="button" className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} onClick={() => moAnh(k)} aria-label={'Ảnh ' + (k + 1)}><AnhKho path={t.duong_dan_nho || t.duong_dan} alt="" /></button>)}
          </div>
        )}
      </div>
      <div className="kav-video">
        <div className="dau-the"><h2>Video</h2>{video[0]?.thoi_luong && <span className="tag">{Math.floor(video[0].thoi_luong / 60)}:{String(Math.round(video[0].thoi_luong % 60)).padStart(2, '0')}</span>}{video[0] && <span className="tag">{fmtMB(video[0].kich_thuoc)}</span>}</div>
        {video.length ? video.map((v) => <TrinhPhat key={v.id} v={v} />) : <Empty icon={X} tieuDe="Không có video" />}
      </div>
    </section>
  )
}

export function TrinhPhat({ v, tuChay }) {
  const url = useSignedUrl(v.duong_dan)
  const bia = useSignedUrl(v.duong_dan_nho)
  const [tocDo, setTocDo] = useState(1)
  const [el, setEl] = useState(null)
  useEffect(() => { if (el) el.playbackRate = tocDo }, [el, tocDo])
  return (
    <div className="video-khung">
      {url ? <video ref={setEl} src={url} poster={bia || undefined} controls playsInline preload="metadata" autoPlay={!!tuChay} /> : <div className="khung" style={{ width: '100%', height: '100%', borderRadius: 0 }} />}
      <div className="toc-do">{[1, 1.5, 2].map((t) => <button key={t} className={tocDo === t ? 'on' : ''} onClick={() => setTocDo(t)}>{t}×</button>)}</div>
    </div>
  )
}

function NhanViec({ h }) {
  const s = useStaff()
  const bao = useToast()
  const { data: dsCh } = useAsync(() => (h.cua_hang_du_kien ? docBang('cua_hang', [['ten', true]]) : Promise.resolve([])), [h.cua_hang_du_kien])
  if (h.trang_thai === 'khong_dat') {
    const tin = tinKhongDat(s.dm.caiDat.mau_tin_khong_dat, h)
    return <Btn kieu="trang" co="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(tin).then(() => bao('Đã sao chép tin báo chưa phù hợp'))}>Sao chép tin báo ứng viên</Btn>
  }
  if (!h.noi_lam_viec && !h.ngay_nhan_viec) return null
  const tin = tinDat(s.dm.caiDat.mau_tin_dat, h, h, (dsCh || []).find((c) => c.ma === h.cua_hang_du_kien), s.dm.caiDat)
  return (
    <div className="cot" style={{ gap: 4, background: 'var(--ok-bg)', borderRadius: 22, padding: '12px 14px' }}>
      <b style={{ fontSize: 13.5, color: 'var(--ok)' }}>{h.trang_thai === 'nhan_viec' ? 'Đã nhận việc' : 'Nhận việc dự kiến'}</b>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{h.noi_lam_viec || 'Chưa chọn cửa hàng'}</span>
      <span className="nho muted-2">{h.ngay_nhan_viec ? fmtNgay(h.ngay_nhan_viec + 'T12:00:00+07:00') : 'Chưa có ngày'}{h.gio_nhan_viec ? ' · lúc ' + String(h.gio_nhan_viec).slice(0, 5) : ''}{h.ghi_chu_nhan_viec ? ' · ' + h.ghi_chu_nhan_viec : ''}</span>
      {h.trang_thai === 'dat' && <div style={{ marginTop: 6 }}><Btn kieu="trang" co="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(tin).then(() => bao('Đã sao chép tin báo trúng tuyển'))}>Sao chép tin báo ứng viên</Btn></div>}
    </div>
  )
}

function SuaUngVien({ h, dong, xong }) {
  const s = useStaff()
  const bao = useToast()
  const [f, setF] = useState({ ho_ten: h.ho_ten, sdt: h.sdt, email: h.email || '', ngay_sinh: h.ngay_sinh, vi_tri_id: h.vi_tri_id, chieu_cao: h.chieu_cao, can_nang: h.can_nang, cho_o: h.cho_o || '', khu_vuc_mong_muon: h.khu_vuc_mong_muon || '', hoc_van: h.hoc_van || '', dinh_huong: h.dinh_huong || '', thu_nhap_mong_muon: h.thu_nhap_mong_muon || '', kinh_nghiem: h.kinh_nghiem || '', an_tuong: h.an_tuong || '', sdt_gioi_thieu: h.sdt_gioi_thieu || '' })
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const d = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  async function luu() {
    setDang(true); setLoi(null)
    try { await rpc('td_cap_nhat_ho_so', { p_id: h.id, p: { form: { ...f, vi_tri_id: Number(f.vi_tri_id) } } }); bao('Đã lưu thông tin ứng viên'); xong() } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <Modal mo rong dong={dong} tieuDe="Sửa thông tin ứng viên" moTa={h.ma} chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" loading={dang} onClick={luu}>Lưu</Btn></>}>
      <div className="cot" style={{ gap: 10 }}>
        <div className="luoi-2"><Field kieu="gon" nhan="Họ và tên" value={f.ho_ten} onChange={d('ho_ten')} /><Field kieu="gon" nhan="Điện thoại" value={f.sdt} onChange={d('sdt')} /></div>
        <div className="luoi-2"><Field kieu="gon" nhan="Email" value={f.email} onChange={d('email')} /><Field kieu="gon" nhan="Ngày sinh" type="date" value={f.ngay_sinh || ''} onChange={d('ngay_sinh')} /></div>
        <div className="luoi-3">
          <label className="field gon"><span className="nhan">Vị trí</span><select value={f.vi_tri_id} onChange={d('vi_tri_id')}>{s.dm.viTri.map((v) => <option key={v.id} value={v.id}>{v.ten}</option>)}</select></label>
          <Field kieu="gon" nhan="Chiều cao" value={f.chieu_cao} onChange={d('chieu_cao')} inputMode="numeric" />
          <Field kieu="gon" nhan="Cân nặng" value={f.can_nang} onChange={d('can_nang')} inputMode="numeric" />
        </div>
        <div className="luoi-2"><Field kieu="gon" nhan="Chỗ ở hiện tại" value={f.cho_o} onChange={d('cho_o')} /><Field kieu="gon" nhan="Khu vực mong muốn" value={f.khu_vuc_mong_muon} onChange={d('khu_vuc_mong_muon')} /></div>
        <div className="luoi-3"><Field kieu="gon" nhan="Học vấn" value={f.hoc_van} onChange={d('hoc_van')} /><Field kieu="gon" nhan="Ổn định / linh hoạt" value={f.dinh_huong} onChange={d('dinh_huong')} /><Field kieu="gon" nhan="Thu nhập mong muốn" value={f.thu_nhap_mong_muon} onChange={d('thu_nhap_mong_muon')} /></div>
        <Field kieu="gon" nhan="Kinh nghiệm"><textarea rows={3} value={f.kinh_nghiem} onChange={d('kinh_nghiem')} /></Field>
        <Field kieu="gon" nhan="Ấn tượng về Nón Sơn"><textarea rows={2} value={f.an_tuong} onChange={d('an_tuong')} /></Field>
        <Field kieu="gon" nhan="SĐT người giới thiệu" value={f.sdt_gioi_thieu} onChange={d('sdt_gioi_thieu')} />
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}
