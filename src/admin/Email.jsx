// Email kết quả tuyển dụng: hộp xác nhận gửi, thư của 1 hồ sơ, cài đặt + lịch sử
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Check, Copy, Eye, KeyRound, Mail, MailCheck, MailX, Plug, RefreshCw, Reply, RotateCcw, Save, Search, Send, Timer, Zap } from 'lucide-react'
import { luuDong, rpc } from '../lib/api'
import { useAsync, useDebounced } from '../lib/hooks'
import { fmtGio, fmtNgayGio, tuongDoi } from '../lib/format'
import { Bao, Btn, Chips, Empty, Field, Menu, Modal, Spinner, Switch, useToast } from '../components/ui'
import { useStaff } from './context'

export const LOAI_THU = {
  dat: { ten: 'Trúng tuyển', ngan: 'Chúc mừng trúng tuyển & nhận việc', mau: 'ok' },
  khong_dat: { ten: 'Chưa phù hợp', ngan: 'Thông báo kết quả – chưa phù hợp', mau: 'xam' },
  tiep_nhan: { ten: 'Tiếp nhận hồ sơ', ngan: 'Xác nhận đã nhận hồ sơ', mau: 'info' },
  thu_nghiem: { ten: 'Thư thử', ngan: 'Thư thử nghiệm', mau: 'xam' }
}
export const TT_THU = {
  cho: { ten: 'Đang chờ gửi', ic: Timer, lop: 'cho' },
  dang_gui: { ten: 'Đang gửi', ic: Send, lop: 'cho' },
  da_gui: { ten: 'Đã gửi', ic: MailCheck, lop: 'ok' },
  loi: { ten: 'Gửi lỗi', ic: MailX, lop: 'loi' },
  huy: { ten: 'Đã hủy', ic: Ban, lop: 'xam' }
}

// Đếm ngược tới thời điểm gửi (bù lệch đồng hồ máy so với máy chủ)
function useConLai(guiLuc, bayGio) {
  const lech = useMemo(() => (bayGio ? new Date(bayGio).getTime() - Date.now() : 0), [bayGio])
  const [n, setN] = useState(() => Date.now())
  useEffect(() => { if (!guiLuc) return; const t = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(t) }, [guiLuc])
  if (!guiLuc) return null
  return Math.max(0, Math.round((new Date(guiLuc).getTime() - (n + lech)) / 1000))
}
const mmss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')

export function TheTrangThaiThu({ t }) {
  const x = TT_THU[t] || TT_THU.cho
  return <span className={'tt-thu ' + x.lop}><x.ic size={13} />{x.ten}</span>
}

// Khung xem thư đúng như ứng viên nhận
export function KhungThu({ html, cao = 460 }) {
  return <iframe className="khung-thu" title="Nội dung email" sandbox="allow-popups" srcDoc={html} style={{ height: cao }} />
}

function DemNguoc({ thu, onDoi }) {
  const bao = useToast()
  const con = useConLai(thu.trang_thai === 'cho' ? thu.gui_luc : null, thu.bay_gio)
  const [dang, setDang] = useState(null)
  async function lam(fn, ten) {
    setDang(ten)
    try { const r = await rpc(fn, { p_id: thu.id }); onDoi?.(r); bao(ten === 'huy' ? 'Đã hủy email chờ gửi' : 'Đã chuyển máy gửi ngay') } catch (e) { bao(e.message, 'loi') }
    setDang(null)
  }
  if (thu.trang_thai !== 'cho') return null
  return (
    <div className="dem-nguoc">
      <span className="dn-dong"><Timer size={16} /><span>Gửi lúc <b>{fmtGio(thu.gui_luc)}</b>{con > 0 ? <> · còn <b className="so">{mmss(con)}</b></> : thu.bay_gio && new Date(thu.bay_gio) - new Date(thu.gui_luc) > 300000 ? ' · đang chờ lượt gửi Gmail, sẽ tự gửi' : ' · đang chuyển máy gửi…'}</span></span>
      <div className="hang" style={{ gap: 6 }}>
        <Btn kieu="do" co="sm" icon={Ban} loading={dang === 'huy'} onClick={() => lam('td_thu_huy', 'huy')}>Hủy gửi</Btn>
        <Btn kieu="trang" co="sm" icon={Zap} loading={dang === 'ngay'} onClick={() => lam('td_thu_gui_ngay', 'ngay')}>Gửi ngay</Btn>
      </div>
    </div>
  )
}

// ===== Hộp xác nhận gửi email kết quả =====
export function GuiThuModal({ hoSoId, loai, ten, dong, xong }) {
  const bao = useToast()
  const { data: d, error, loading } = useAsync(() => rpc('td_thu_xem_truoc', { p_ho_so_id: hoSoId, p_loai: loai }), [hoSoId, loai])
  const [cheDo, setCheDo] = useState(null)
  const [phut, setPhut] = useState(null)
  const [xem, setXem] = useState(false)
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const [daTao, setDaTao] = useState(null)
  useEffect(() => { if (d) { setCheDo((c) => c || d.che_do || 'hen'); setPhut((p) => p || d.cho_phut || 5) } }, [d])
  const lt = LOAI_THU[loai]
  const thieu = d?.thieu || []
  const daGui = (d?.da_gui || []).filter((x) => x.trang_thai === 'da_gui')
  const dangCho = (d?.da_gui || []).filter((x) => x.trang_thai === 'cho' || x.trang_thai === 'dang_gui')

  async function gui() {
    setLoi(null); setDang(true)
    try {
      const r = await rpc('td_thu_tao', { p_ho_so_id: hoSoId, p_loai: loai, p_che_do: cheDo, p_cho_phut: phut })
      setDaTao(r)
      bao(cheDo === 'ngay' ? 'Đã chuyển email cho máy gửi' : 'Email sẽ gửi sau ' + phut + ' phút — có thể hủy trong lúc chờ')
      xong?.(r)
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }

  if (daTao) return (
    <Modal mo dong={dong} tieuDe={daTao.che_do === 'ngay' ? 'Đã gửi email' : 'Đã đặt lịch gửi email'} moTa={daTao.den}
      chan={<Btn kieu="den" onClick={dong}>Xong</Btn>}>
      <div className="cot" style={{ gap: 12 }}>
        <div className={'ket-qua-thu ' + (daTao.che_do === 'ngay' ? 'ngay' : 'hen')}>
          <span className="kqt-ic">{daTao.che_do === 'ngay' ? <Send size={20} /> : <Timer size={20} />}</span>
          <div><b>{daTao.tieu_de}</b><span>{daTao.che_do === 'ngay' ? 'Máy gửi đang xử lý — trạng thái cập nhật trong mục Email của hồ sơ.' : 'Trong thời gian chờ, bấm “Hủy gửi” nếu phát hiện nhầm.'}</span></div>
        </div>
        <DemNguoc thu={daTao} onDoi={(r) => setDaTao(r)} />
        {daTao.trang_thai === 'huy' && <Bao kieu="vang">Đã hủy — ứng viên sẽ không nhận được email này.</Bao>}
      </div>
    </Modal>
  )

  return (
    <Modal mo rong dong={dong} tieuDe="Gửi email kết quả" moTa={'Thư chính thức từ Phòng Nhân sự gửi ' + (ten || 'ứng viên')}
      chan={<>
        <Btn kieu="trong" onClick={dong}>Để sau</Btn>
        <Btn kieu="den" icon={cheDo === 'ngay' ? Send : Timer} loading={dang} disabled={!d || thieu.length > 0} onClick={gui}>
          {cheDo === 'ngay' ? 'Xác nhận gửi ngay' : 'Xác nhận · gửi sau ' + (phut || 5) + ' phút'}
        </Btn>
      </>}>
      {loading && !d ? <div style={{ padding: 30, textAlign: 'center' }}><Spinner /></div> : error ? <Bao kieu="loi">{error.message}</Bao> : (
        <div className="cot" style={{ gap: 14 }}>
          <div className="thu-tom">
            <div><span>Ứng viên</span><b>{ten || '—'}</b></div>
            <div><span>Email nhận</span><b className={d.den ? '' : 'thieu'}>{d.den || 'Chưa có email'}</b></div>
            <div><span>Kết quả</span><b><span className={'tag-kq ' + loai}>{lt.ten}</span></b></div>
            <div><span>Mẫu email</span><b>{lt.ngan}</b></div>
          </div>
          <div className="thu-tieu-de"><Mail size={15} /><span className="cat">{d.tieu_de}</span></div>

          {thieu.length > 0 && (
            <Bao kieu="loi"><b>Chưa gửi được — còn thiếu:</b> {thieu.join(', ')}.{loai === 'dat' && ' Bổ sung trong phiếu phỏng vấn (cửa hàng, ngày, giờ).'}</Bao>
          )}
          {!d.may_gui && <Bao kieu="vang">Máy gửi email chưa kết nối — thư sẽ nằm trong hàng chờ và tự gửi khi Quản trị kết nối xong (Cài đặt → Email).</Bao>}
          {dangCho.length > 0 && <Bao kieu="vang">Đang có 1 email cùng loại chờ gửi — xác nhận lần này sẽ thay thế email đó.</Bao>}
          {daGui.length > 0 && <Bao kieu="xanh">Đã gửi email này lúc {fmtNgayGio(daGui[0].gui_xong_luc)}. Xác nhận sẽ gửi thêm 1 email mới.</Bao>}

          <div className="chon-gui">
            <button type="button" className={cheDo === 'hen' ? 'on' : ''} onClick={() => setCheDo('hen')}>
              <span className="cg-ic"><Timer size={18} /></span>
              <span className="gian"><b>Gửi sau thời gian chờ</b><small>Hủy được nếu thao tác nhầm</small></span>
              {cheDo === 'hen' && <Check size={17} />}
            </button>
            <button type="button" className={cheDo === 'ngay' ? 'on' : ''} onClick={() => setCheDo('ngay')}>
              <span className="cg-ic"><Zap size={18} /></span>
              <span className="gian"><b>Gửi ngay</b><small>Đã kiểm tra, chắc chắn kết quả</small></span>
              {cheDo === 'ngay' && <Check size={17} />}
            </button>
          </div>
          {cheDo === 'hen' && <div className="chips">{[5, 10, 15, 30].map((p) => <button key={p} type="button" className={'chip sm' + (phut === p ? ' on' : '')} onClick={() => setPhut(p)}>{p} phút</button>)}</div>}

          <button type="button" className="nut-xem-thu" onClick={() => setXem((x) => !x)}><Eye size={15} />{xem ? 'Ẩn nội dung email' : 'Xem nội dung email trước khi gửi'}</button>
          {xem && <KhungThu html={d.html} />}
          {loi && <Bao kieu="loi">{loi}</Bao>}
        </div>
      )}
    </Modal>
  )
}

// ===== Email của 1 hồ sơ (trang hồ sơ) =====
export function ThuUngVien({ h, nhip }) {
  const s = useStaff()
  const bao = useToast()
  const { data, reload } = useAsync(() => rpc('td_thu_ds', { p_ho_so_id: h.id }), [h.id, nhip])
  const [moGui, setMoGui] = useState(null)
  const [xemThu, setXemThu] = useState(null)
  const ds = data?.thu || []
  const coCho = ds.some((t) => t.trang_thai === 'cho' || t.trang_thai === 'dang_gui')
  useEffect(() => { if (!coCho) return; const t = setInterval(() => reload(true), 12000); return () => clearInterval(t) }, [coCho]) // eslint-disable-line react-hooks/exhaustive-deps
  const loaiGoiY = h.trang_thai === 'khong_dat' ? 'khong_dat' : ['dat', 'nhan_viec'].includes(h.trang_thai) ? 'dat' : null

  async function guiLai(t) {
    try { await rpc('td_thu_gui_lai', { p_id: t.id }); bao('Đã gửi lại (nội dung theo dữ liệu mới nhất)'); reload(true) } catch (e) { bao(e.message, 'loi') }
  }

  return (
    <section className="card">
      <div className="dau-the">
        <h2>Email ứng viên</h2>
        {s.coCham && (
          <Menu rong={250} nut={<button className="btn trang sm"><Send size={14} />Gửi email</button>}>
            {(dong) => <>
              {['dat', 'nhan_viec'].includes(h.trang_thai) && <button onClick={() => { dong(); setMoGui('dat') }}><MailCheck size={15} />Chúc mừng trúng tuyển</button>}
              {h.trang_thai === 'khong_dat' && <button onClick={() => { dong(); setMoGui('khong_dat') }}><MailX size={15} />Thông báo chưa phù hợp</button>}
              <button onClick={() => { dong(); setMoGui('tiep_nhan') }}><Mail size={15} />Xác nhận tiếp nhận hồ sơ</button>
            </>}
          </Menu>
        )}
      </div>
      <div className="hang nho" style={{ gap: 6, marginBottom: 12, color: data?.email ? 'var(--muted-2)' : 'var(--err)' }}>
        <Mail size={14} />{data?.email || 'Hồ sơ chưa có email'}
      </div>
      {loaiGoiY && s.coCham && !ds.some((t) => t.loai === loaiGoiY && t.trang_thai !== 'huy' && t.trang_thai !== 'loi') && data?.email && (
        <button type="button" className="goi-y-gui" onClick={() => setMoGui(loaiGoiY)}>
          <span className="orb xs"><Send size={13} /></span>
          <span className="gian"><b>Chưa gửi email kết quả</b><small>{LOAI_THU[loaiGoiY].ngan}</small></span>
          <span className="nho" style={{ fontWeight: 700, color: 'var(--pink-deep)' }}>Gửi</span>
        </button>
      )}
      {!data ? <Spinner /> : ds.length === 0 ? <p className="nho muted">Chưa có email nào.</p> : (
        <div className="ds-thu">
          {ds.map((t) => (
            <div key={t.id} className={'thu-dong ' + t.trang_thai}>
              <div className="hang" style={{ gap: 8, alignItems: 'flex-start' }}>
                <div className="gian" style={{ minWidth: 0 }}>
                  <div className="hang wrap" style={{ gap: 6 }}><TheTrangThaiThu t={t.trang_thai} /><span className="nho muted">{LOAI_THU[t.loai]?.ten}</span></div>
                  <b className="td-tieu">{t.tieu_de}</b>
                  <span className="td-phu">
                    {t.trang_thai === 'da_gui' ? 'Gửi ' + fmtNgayGio(t.gui_xong_luc) : 'Tạo ' + fmtNgayGio(t.tao_luc)}
                    {t.nguoi_tao ? ' · ' + t.nguoi_tao : ' · tự động'}{t.huy_boi ? ' · hủy bởi ' + t.huy_boi : ''}
                  </span>
                  {t.loi && t.trang_thai !== 'da_gui' && <span className="td-loi">{t.loi}</span>}
                </div>
                <Menu rong={200} nut={<button className="icon-btn sm mem" aria-label="Thao tác email">⋯</button>}>
                  {(dong) => <>
                    <button onClick={() => { dong(); setXemThu(t) }}><Eye size={15} />Xem nội dung</button>
                    <button onClick={() => { dong(); navigator.clipboard?.writeText(t.van_ban).then(() => bao('Đã sao chép nội dung')) }}><Copy size={15} />Sao chép văn bản</button>
                    {s.coCham && ['da_gui', 'loi', 'huy'].includes(t.trang_thai) && t.loai !== 'thu_nghiem' && <button onClick={() => { dong(); guiLai(t) }}><RotateCcw size={15} />Gửi lại</button>}
                  </>}
                </Menu>
              </div>
              <DemNguoc thu={t} onDoi={() => reload(true)} />
              {(t.phan_hoi || []).map((p) => (
                <div key={p.id} className="phan-hoi">
                  <span className="ph-dau"><Reply size={13} />{p.tu} · {tuongDoi(p.nhan_luc)}</span>
                  <p>{p.noi_dung}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {moGui && <GuiThuModal hoSoId={h.id} loai={moGui} ten={h.ho_ten} dong={() => { setMoGui(null); reload(true) }} />}
      {xemThu && <XemThuModal thu={xemThu} dong={() => setXemThu(null)} />}
    </section>
  )
}

export function XemThuModal({ thu, dong }) {
  const { data } = useAsync(() => (thu.html ? Promise.resolve(thu) : rpc('td_thu_xem', { p_id: thu.id })), [thu.id])
  return (
    <Modal mo rong dong={dong} tieuDe={thu.tieu_de} moTa={'Đến ' + thu.den + ' · ' + (TT_THU[thu.trang_thai]?.ten || '')}>
      {!data ? <Spinner /> : <>
        <div className="thu-tom" style={{ marginBottom: 12 }}>
          <div><span>Người chốt kết quả</span><b>{data.nguoi_quyet || '—'}</b></div>
          <div><span>Người xác nhận gửi</span><b>{data.nguoi_tao || 'Hệ thống tự gửi'}</b></div>
          <div><span>Tạo lúc</span><b>{fmtNgayGio(data.tao_luc)}</b></div>
          <div><span>{data.trang_thai === 'da_gui' ? 'Gửi lúc' : data.trang_thai === 'huy' ? 'Hủy lúc' : 'Hẹn gửi'}</span><b>{fmtNgayGio(data.gui_xong_luc || data.huy_luc || data.gui_luc)}</b></div>
        </div>
        <KhungThu html={data.html} cao={520} />
      </>}
    </Modal>
  )
}

// ===== Cài đặt Email =====
const BIEN = {
  chung: ['{xung_ho}', '{ho_ten}', '{vi_tri}', '{ma_ho_so}', '{cong_ty}', '{link_tra_cuu}', '{website}'],
  dat: ['{cua_hang}', '{dia_chi}', '{ngay}', '{thu}', '{ca}', '{gio}', '{khoi_nhan_viec}', '{khoi_chuan_bi}', '{chu_ky}'],
  khac: ['{chu_ky}']
}

function useCD(khoa, macDinh) {
  const s = useStaff()
  const bao = useToast()
  const [v, setV] = useState(() => ({ ...macDinh, ...(s.dm.caiDat[khoa] || {}) }))
  const [dang, setDang] = useState(false)
  async function luu(gt = v) {
    setDang(true)
    try { await luuCaiDat(khoa, gt); await s.taiDanhMuc(); bao('Đã lưu') } catch (e) { bao(e.message, 'loi') }
    setDang(false)
  }
  return [v, setV, luu, dang]
}
async function luuCaiDat(khoa, gia_tri) {
  await luuDong('cai_dat', { khoa, gia_tri, cap_nhat_luc: new Date().toISOString() }, 'khoa')
}

function MayGui() {
  const s = useStaff()
  const bao = useToast()
  const { data: tt, reload } = useAsync(() => rpc('td_mail_trang_thai'), [])
  const [khoa, setKhoa] = useState(null)
  const [url, setUrl] = useState('')
  const [den, setDen] = useState('')
  const [loaiThu, setLoaiThu] = useState('dat')
  const [dang, setDang] = useState(null)
  const nhipPhut = tt?.nhip ? (new Date(tt.bay_gio) - new Date(tt.nhip)) / 60000 : null
  const song = nhipPhut != null && nhipPhut < 30
  async function lam(ten, fn) { setDang(ten); try { await fn() } catch (e) { bao(e.message, 'loi') } setDang(null) }
  return (
    <section className="card lon">
      <div className="dau-the"><h2>Máy gửi email</h2><IconLamMoi onClick={() => reload(true)} /></div>
      {!tt ? <Spinner /> : <>
        <div className={'may-gui ' + (song ? 'song' : tt.url ? 'cho' : 'tat')}>
          <span className="mg-den" />
          <div className="gian">
            <b>{song ? 'Đang hoạt động' : tt.url ? 'Đã cấu hình — chưa thấy máy gửi phản hồi' : 'Chưa kết nối'}</b>
            <span>{tt.tai_khoan ? 'Gửi từ ' + tt.tai_khoan : 'Gmail Phòng Nhân sự chạy Apps Script'}{tt.nhip ? ' · nhịp gần nhất ' + tuongDoi(tt.nhip) : ''}</span>
          </div>
        </div>
        {tt.qua_han > 0 && <Bao kieu="vang">{tt.qua_han} email đang chờ lượt gửi{tt.han_muc === 0 ? ' — Gmail đã hết 100 lượt gửi trong 24 giờ, sẽ tự gửi tiếp khi có lượt' : ''}.</Bao>}
        <div className="luoi-so-thu">
          <div className={tt.han_muc === 0 ? 'loi' : ''}><b>{tt.han_muc ?? '—'}</b><span>Lượt gửi còn (24h)</span></div>
          <div><b>{tt.cho}</b><span>Đang chờ</span></div>
          <div><b>{tt.gui_24h}</b><span>Đã gửi 24h</span></div>
          <div className={tt.loi_7n ? 'loi' : ''}><b>{tt.loi_7n}</b><span>Lỗi 7 ngày</span></div>
        </div>
        {s.laQT && (
          <div className="cot" style={{ gap: 14, marginTop: 16 }}>
            <div className="buoc-kn">
              <span className="so-buoc">1</span>
              <div className="gian">
                <b>Khóa kết nối</b>
                <p>Dán khóa vào biến <code>KHOA</code> trong file Apps Script. Tạo khóa mới sẽ vô hiệu khóa cũ.</p>
                {khoa ? <div className="khoa-hien"><code>{khoa}</code><Btn kieu="den" co="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(khoa).then(() => bao('Đã sao chép khóa'))}>Sao chép</Btn></div>
                  : <Btn kieu="trang" co="sm" icon={KeyRound} loading={dang === 'khoa'} onClick={() => lam('khoa', async () => { setKhoa(await rpc('td_mail_tao_khoa')); reload(true) })}>{tt.co_khoa ? 'Tạo khóa mới' : 'Tạo khóa kết nối'}</Btn>}
              </div>
            </div>
            <div className="buoc-kn">
              <span className="so-buoc">2</span>
              <div className="gian">
                <b>Link Web App của Apps Script</b>
                <p>Triển khai Apps Script dạng Web App (chạy bằng tài khoản của tôi · ai cũng truy cập) rồi dán link <code>/exec</code>.</p>
                {tt.url && <span className="nho muted">Hiện tại: {tt.url}</span>}
                <div className="hang" style={{ gap: 8, marginTop: 6 }}>
                  <Field kieu="gon" className="gian" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
                  <Btn kieu="den" co="sm" icon={Plug} loading={dang === 'url'} onClick={() => lam('url', async () => { await rpc('td_mail_luu_url', { p_url: url }); setUrl(''); bao('Đã lưu link máy gửi'); reload(true) })}>Lưu</Btn>
                </div>
              </div>
            </div>
            <div className="buoc-kn">
              <span className="so-buoc">3</span>
              <div className="gian">
                <b>Gửi thư thử</b>
                <p>Gửi mẫu với dữ liệu giả lập để kiểm tra hiển thị trên Gmail / điện thoại.</p>
                <div className="hang wrap" style={{ gap: 8, marginTop: 6 }}>
                  <Field kieu="gon" className="gian" type="email" value={den} onChange={(e) => setDen(e.target.value)} placeholder="email nhận thử" />
                  <select className="chon-nho" value={loaiThu} onChange={(e) => setLoaiThu(e.target.value)}>
                    <option value="dat">Trúng tuyển</option><option value="khong_dat">Chưa phù hợp</option><option value="tiep_nhan">Tiếp nhận</option>
                  </select>
                  <Btn kieu="trang" co="sm" icon={Send} loading={dang === 'thu'} onClick={() => lam('thu', async () => { await rpc('td_mail_thu_nghiem', { p_den: den, p_loai: loaiThu }); bao('Đã xếp thư thử — kiểm tra hộp thư sau ít giây'); reload(true) })}>Gửi thử</Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </>}
    </section>
  )
}

function IconLamMoi({ onClick }) {
  return <button type="button" className="icon-btn sm mem" aria-label="Làm mới" onClick={onClick}><RefreshCw size={15} /></button>
}

function CauHinhGui() {
  const [v, setV, luu, dang] = useCD('email', { ten_gui: 'Phòng Nhân sự Nón Sơn', tra_loi: '', che_do: 'hen', cho_phut: 5, tu_gui_tiep_nhan: false, lien_he: '', giay_to: [], huong_dan: '', link_tra_cuu: 'https://tuyendungns.nonson.vn/tra-cuu' })
  const [gt, setGt] = useState((v.giay_to || []).join('\n'))
  const d = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }))
  return (
    <section className="card lon">
      <div className="dau-the"><h2>Người gửi & cách gửi</h2></div>
      <div className="luoi-2">
        <Field kieu="gon" nhan="Tên người gửi hiển thị" value={v.ten_gui} onChange={d('ten_gui')} />
        <Field kieu="gon" nhan="Email nhận phản hồi (Reply-To)" type="email" value={v.tra_loi} onChange={d('tra_loi')} placeholder="Để trống = Gmail đang gửi" goiY="Để trống thì phản hồi của ứng viên được đồng bộ vào hồ sơ" />
      </div>
      <span className="nhan-nhom" style={{ marginTop: 14, display: 'block' }}>Chế độ gửi mặc định</span>
      <div className="chon-gui" style={{ marginTop: 6 }}>
        <button type="button" className={v.che_do === 'hen' ? 'on' : ''} onClick={() => setV((x) => ({ ...x, che_do: 'hen' }))}><span className="cg-ic"><Timer size={18} /></span><span className="gian"><b>Gửi sau thời gian chờ</b><small>Khuyến nghị — hủy được khi bấm nhầm</small></span></button>
        <button type="button" className={v.che_do === 'ngay' ? 'on' : ''} onClick={() => setV((x) => ({ ...x, che_do: 'ngay' }))}><span className="cg-ic"><Zap size={18} /></span><span className="gian"><b>Gửi ngay</b><small>Vẫn có bước xác nhận trước khi gửi</small></span></button>
      </div>
      <div className="chips" style={{ marginTop: 10 }}>{[5, 10, 15, 30].map((p) => <button key={p} type="button" className={'chip sm' + (Number(v.cho_phut) === p ? ' on' : '')} onClick={() => setV((x) => ({ ...x, cho_phut: p }))}>Chờ {p} phút</button>)}</div>
      <label className="hang" style={{ gap: 10, marginTop: 16 }}><Switch on={!!v.tu_gui_tiep_nhan} nhan="Tự gửi xác nhận" onDoi={(b) => setV((x) => ({ ...x, tu_gui_tiep_nhan: b }))} /><span className="gian"><b style={{ fontSize: 14 }}>Tự gửi email xác nhận khi ứng viên nộp hồ sơ</b><br /><span className="nho muted">Gửi ngay, không cần thao tác</span></span></label>
      <div className="dau-the" style={{ marginTop: 22 }}><h2>Hướng dẫn nhận việc</h2></div>
      <Field kieu="gon" nhan="Giấy tờ cần chuẩn bị (mỗi dòng 1 mục)"><textarea rows={4} value={gt} onChange={(e) => setGt(e.target.value)} /></Field>
      <Field kieu="gon" nhan="Người / bộ phận liên hệ khi đến" value={v.lien_he} onChange={d('lien_he')} placeholder="VD: Cửa hàng trưởng · Hotline Phòng Nhân sự 028…" style={{ marginTop: 10 }} />
      <Field kieu="gon" nhan="Hướng dẫn chung khác" style={{ marginTop: 10 }}><textarea rows={3} value={v.huong_dan} onChange={d('huong_dan')} placeholder="Hiện trong mục Thông tin bổ sung của mọi email trúng tuyển" /></Field>
      <p className="nho muted" style={{ marginTop: 8 }}>Trang phục lấy từ mục “Tác phong khi nhận việc” (tab Phỏng vấn & kết quả).</p>
      <div style={{ marginTop: 14 }}><Btn kieu="den" icon={Save} loading={dang} onClick={() => luu({ ...v, cho_phut: Number(v.cho_phut) || 5, giay_to: gt.split('\n').map((x) => x.trim()).filter(Boolean) })}>Lưu cấu hình</Btn></div>
    </section>
  )
}

function DoanhNghiep() {
  const [v, setV, luu, dang] = useCD('cong_ty', { ten: '', ten_gon: '', thuong_hieu: '', ten_en: '', mst: '', dia_chi: '', website: '', hotline: '' })
  const d = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }))
  return (
    <section className="card nho-cot">
      <div className="dau-the"><h2>Thông tin doanh nghiệp</h2></div>
      <div className="cot" style={{ gap: 10 }}>
        <Field kieu="gon" nhan="Tên công ty (in hoa)" value={v.ten} onChange={d('ten')} />
        <Field kieu="gon" nhan="Tên trong câu văn" value={v.ten_gon} onChange={d('ten_gon')} />
        <Field kieu="gon" nhan="Tên tiếng Anh" value={v.ten_en} onChange={d('ten_en')} />
        <Field kieu="gon" nhan="Mã số thuế" value={v.mst} onChange={d('mst')} />
        <Field kieu="gon" nhan="Địa chỉ" value={v.dia_chi} onChange={d('dia_chi')} />
        <Field kieu="gon" nhan="Website" value={v.website} onChange={d('website')} />
        <Field kieu="gon" nhan="Hotline (tùy chọn)" value={v.hotline} onChange={d('hotline')} />
      </div>
      <div style={{ marginTop: 14 }}><Btn kieu="den" icon={Save} loading={dang} onClick={() => luu()}>Lưu</Btn></div>
    </section>
  )
}

function MauEmail() {
  const s = useStaff()
  const bao = useToast()
  const [loai, setLoai] = useState('dat')
  const [tatCa, setTatCa] = useState(() => s.dm.caiDat.mau_email || {})
  const [xem, setXem] = useState(null)
  const [dang, setDang] = useState(null)
  const { data: md } = useAsync(() => rpc('td_thu_xem_mau', { p_loai: loai }), [loai])
  const m = tatCa[loai] || {}
  const tieuDe = m.tieu_de ?? md?.mac_dinh?.tieu_de ?? ''
  const noiDung = m.noi_dung ?? md?.mac_dinh?.noi_dung ?? ''
  const dat = (k, val) => setTatCa((x) => ({ ...x, [loai]: { tieu_de: tieuDe, noi_dung: noiDung, ...(x[loai] || {}), [k]: val } }))
  async function xemTruoc() {
    setDang('xem')
    try { setXem(await rpc('td_thu_xem_mau', { p_loai: loai, p_mau: { tieu_de: tieuDe, noi_dung: noiDung } })) } catch (e) { bao(e.message, 'loi') }
    setDang(null)
  }
  async function luu(gt) {
    setDang('luu')
    try { await luuCaiDat('mau_email', gt); await s.taiDanhMuc(); bao('Đã lưu mẫu email') } catch (e) { bao(e.message, 'loi') }
    setDang(null)
  }
  return (
    <section className="card" style={{ flexBasis: '100%' }}>
      <div className="dau-the"><h2>Mẫu email</h2></div>
      <Chips ds={[{ v: 'dat', t: 'Trúng tuyển' }, { v: 'khong_dat', t: 'Chưa phù hợp' }, { v: 'tiep_nhan', t: 'Tiếp nhận hồ sơ' }]} giaTri={loai} onChon={(v) => { setLoai(v); setXem(null) }} />
      <div className="mau-email">
        <div className="cot" style={{ gap: 10 }}>
          <Field kieu="gon" nhan="Tiêu đề" value={tieuDe} onChange={(e) => dat('tieu_de', e.target.value)} />
          <Field kieu="gon" nhan="Nội dung" goiY="Dòng trống = đoạn mới · **chữ đậm** · khối đặc biệt đứng riêng 1 đoạn">
            <textarea rows={18} value={noiDung} onChange={(e) => dat('noi_dung', e.target.value)} style={{ fontSize: 13, lineHeight: 1.6 }} />
          </Field>
          <div className="bien-ds">
            {[...BIEN.chung, ...(loai === 'dat' ? BIEN.dat : BIEN.khac)].map((b) => <button key={b} type="button" onClick={() => { navigator.clipboard?.writeText(b); bao('Đã sao chép ' + b) }}><code>{b}</code></button>)}
          </div>
          <div className="hang wrap" style={{ gap: 8 }}>
            <Btn kieu="den" icon={Save} loading={dang === 'luu'} onClick={() => luu({ ...tatCa, [loai]: { tieu_de: tieuDe, noi_dung: noiDung } })}>Lưu mẫu</Btn>
            <Btn kieu="trang" icon={Eye} loading={dang === 'xem'} onClick={xemTruoc}>Xem trước</Btn>
            <Btn kieu="trong" icon={RotateCcw} onClick={() => { const x = { ...tatCa }; delete x[loai]; setTatCa(x); luu(x) }}>Về mặc định</Btn>
          </div>
        </div>
        <div className="mau-xem">
          {xem ? <><div className="thu-tieu-de"><Mail size={15} /><span className="cat">{xem.tieu_de}</span></div><KhungThu html={xem.html} cao={640} /></>
            : <Empty icon={Eye} tieuDe="Xem trước với dữ liệu mẫu">Bấm “Xem trước” để xem email đúng như ứng viên nhận.</Empty>}
        </div>
      </div>
    </section>
  )
}

function LichSuThu() {
  const [tt, setTt] = useState('')
  const [q, setQ] = useState('')
  const qt = useDebounced(q, 300)
  const { data, reload, loading } = useAsync(() => rpc('td_thu_tong', { p: { trang_thai: tt, q: qt } }), [tt, qt])
  const [xemThu, setXemThu] = useState(null)
  const dem = data?.dem || {}
  return (
    <section className="card" style={{ flexBasis: '100%' }}>
      <div className="dau-the"><h2>Lịch sử gửi email</h2><IconLamMoi onClick={() => reload(true)} /></div>
      <div className="hang wrap" style={{ gap: 8, marginBottom: 12 }}>
        <Chips ds={[{ v: '', t: 'Tất cả' }, ...Object.entries(TT_THU).map(([k, x]) => ({ v: k, t: x.ten + (dem[k] ? ' · ' + dem[k] : '') }))]} giaTri={tt} onChon={setTt} co="sm" />
        <label className="input-tron gian" style={{ minWidth: 200, height: 40, background: 'var(--soft)', boxShadow: 'none' }}><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên, mã hồ sơ, email…" /></label>
      </div>
      {loading && !data ? <Spinner /> : !(data?.ds || []).length ? <Empty icon={Mail} tieuDe="Chưa có email">Email kết quả sẽ hiện ở đây sau khi gửi.</Empty> : (
        <div className="bang-thu">
          {data.ds.map((t) => (
            <button key={t.id} type="button" className="bt-dong" onClick={() => setXemThu(t)}>
              <span className="bt-luc">{fmtNgayGio(t.gui_xong_luc || t.tao_luc)}</span>
              <span className="bt-uv">{t.ho_so_id ? <Link to={'/quantri/ung-vien/' + t.ho_so_id} onClick={(e) => e.stopPropagation()}><b>{t.ho_ten}</b></Link> : <b>Thư thử</b>}<small>{t.den}</small></span>
              <span className="bt-loai">{LOAI_THU[t.loai]?.ten}</span>
              <span className="bt-nguoi">{t.nguoi_tao || 'Tự động'}</span>
              <span className="bt-tt"><TheTrangThaiThu t={t.trang_thai} />{t.so_phan_hoi > 0 && <span className="tt-thu info"><Reply size={12} />{t.so_phan_hoi}</span>}</span>
            </button>
          ))}
        </div>
      )}
      {xemThu && <XemThuModal thu={xemThu} dong={() => setXemThu(null)} />}
    </section>
  )
}

export function EmailCaiDat() {
  return (
    <div className="cot" style={{ gap: 18 }}>
      <div className="hai-cot"><MayGui /><DoanhNghiep /></div>
      <div className="hai-cot"><CauHinhGui /><section className="card nho-cot ghi-chu-email">
        <div className="dau-the"><h2>Cách hoạt động</h2></div>
        <ol>
          <li><b>Chốt kết quả</b> trong phiếu phỏng vấn (Đạt kèm cửa hàng, ngày, giờ) hoặc Loại hồ sơ.</li>
          <li><b>Hộp xác nhận</b> hiện tên, email, kết quả, nội dung — chọn gửi ngay hoặc gửi sau.</li>
          <li><b>Trong thời gian chờ</b> có thể Hủy / Gửi ngay. Đổi kết quả hồ sơ → email chờ tự hủy; đổi cửa hàng/ngày/giờ → nội dung tự cập nhật.</li>
          <li><b>Máy gửi</b> (Apps Script trong Gmail Phòng Nhân sự) gửi thư, báo kết quả về hệ thống, và đồng bộ thư trả lời của ứng viên vào hồ sơ.</li>
        </ol>
      </section></div>
      <MauEmail />
      <LichSuThu />
    </div>
  )
}

