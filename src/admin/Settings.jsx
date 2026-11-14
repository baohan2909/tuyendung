import { useEffect, useState } from 'react'
import { EmailCaiDat } from './Email'
import { banDo } from './stageActions'
import { dsTacPhong, MAC_DINH_TIN_DAT, MAC_DINH_TIN_KHONG_DAT, TAC_PHONG_MAC_DINH } from '../lib/thongBao'
import { Copy, Download, KeyRound, Link2, Lock, Plus, QrCode, RefreshCw, Save, ShieldCheck, Trash2, UserPlus, Pencil, Sparkles , MapPin , Upload } from 'lucide-react'
import { docBang, doiMatKhau, dsTep, luuDong, rpc, themDong, xoaTep } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { khongDau } from '../lib/format'
import { anhQR } from '../lib/excel'
import { APP_URL } from '../config'
import { VAI_TRO } from '../lib/stages'
import { chuCai, fmtNgayGio, fmtSdt, tuongDoi } from '../lib/format'
import { Avatar, Bao, Btn, Chips, Field, IconBtn, Modal, Segment, Spinner, Switch, useToast } from '../components/ui'
import { useStaff } from './context'

const taoMatKhau = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const a = new Uint32Array(10)
  crypto.getRandomValues(a)
  return 'Ns@' + Array.from(a, (x) => c[x % c.length]).join('')
}
const dsDong = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean)

export default function Settings() {
  const s = useStaff()
  const tabs = [
    { v: 'tk', t: 'Tài khoản' },
    s.laQT && { v: 'ns', t: 'Nhân sự' },
    s.coSua && { v: 'nguon', t: 'Nguồn & QR' },
    s.coSua && { v: 'ch', t: 'Cửa hàng' },
    s.coSua && { v: 'hs', t: 'Hồ sơ nhân sự' },
    s.coSua && { v: 'form', t: 'Biểu mẫu' },
    s.coSua && { v: 'pv', t: 'Phỏng vấn & kết quả' },
    s.coSua && { v: 'email', t: 'Email' },
    s.laQT && { v: 'don', t: 'Dọn dẹp' }
  ].filter(Boolean)
  const [tab, setTab] = useState('tk')
  return (
    <>
      <header className="trang-dau"><div className="tieu"><span className="eyebrow">Cài đặt</span><h1>Thiết lập <b>hệ thống</b></h1></div></header>
      <div style={{ overflowX: 'auto' }} className="loc-cuon"><Segment trang ds={tabs} giaTri={tab} onChon={setTab} /></div>
      {tab === 'tk' && <TaiKhoan />}
      {tab === 'ns' && <NhanSu />}
      {tab === 'nguon' && <Nguon />}
      {tab === 'ch' && <CuaHang />}
      {tab === 'hs' && <MauNhanSu />}
      {tab === 'form' && <BieuMau />}
      {tab === 'pv' && <CaiPV />}
      {tab === 'email' && <EmailCaiDat />}
      {tab === 'don' && <DonDep />}
    </>
  )
}

function TaiKhoan() {
  const s = useStaff()
  const bao = useToast()
  const [mk, setMk] = useState('')
  const [mk2, setMk2] = useState('')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  async function doi() {
    setLoi(null)
    if (mk.length < 8) return setLoi('Mật khẩu tối thiểu 8 ký tự')
    if (mk !== mk2) return setLoi('Hai mật khẩu chưa khớp')
    setDang(true)
    try { await doiMatKhau(mk); setMk(''); setMk2(''); bao('Đã đổi mật khẩu') } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <div className="hai-cot">
      <section className="card lon">
        <div className="hang" style={{ gap: 16 }}>
          <span className="av xl" style={{ background: 'var(--ink)', color: '#fff' }}>{chuCai(s.toi.ho_ten)}</span>
          <div className="gian"><h2 style={{ fontSize: 22 }}>{s.toi.ho_ten}</h2><p className="muted-2">{VAI_TRO[s.vaiTro]} · Mã NV {s.toi.ma_nv}</p>{s.toi.chuc_danh && <p className="nho muted">{s.toi.chuc_danh}{s.toi.khu_vuc ? ' · ' + s.toi.khu_vuc : ''}</p>}</div>
        </div>
        <hr className="vach" style={{ margin: '20px 0' }} />
        <h2 style={{ marginBottom: 6 }}>Quyền của bạn</h2>
        <ul className="nho muted-2" style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
          {s.vaiTro === 'quan_tri' && <li>Toàn quyền: nhân sự, cấu hình, xóa hồ sơ, mọi thao tác tuyển dụng.</li>}
          {(s.vaiTro === 'quan_tri' || s.vaiTro === 'tuyen_dung') && <li>Xem mọi hồ sơ, đổi giai đoạn, hẹn lịch, phân công, xuất Excel, quản lý vị trí & biểu mẫu.</li>}
          {s.vaiTro === 'phong_van' && <li>Xem hồ sơ được phân công / có lịch với bạn, chấm điểm, ghi chú.</li>}
          {s.vaiTro === 'xem' && <li>Chỉ xem hồ sơ, lịch và báo cáo.</li>}
        </ul>
      </section>
      <section className="card nho-cot">
        <h2 style={{ marginBottom: 14 }}><KeyRound size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Đổi mật khẩu</h2>
        <div className="cot" style={{ gap: 10 }}>
          <Field kieu="gon" nhan="Mật khẩu mới" type="password" value={mk} onChange={(e) => setMk(e.target.value)} autoComplete="new-password" />
          <Field kieu="gon" nhan="Nhập lại" type="password" value={mk2} onChange={(e) => setMk2(e.target.value)} autoComplete="new-password" />
          {loi && <Bao kieu="loi">{loi}</Bao>}
          <Btn kieu="den" icon={Save} loading={dang} onClick={doi}>Lưu mật khẩu</Btn>
        </div>
      </section>
    </div>
  )
}

function NhanSu() {
  const s = useStaff()
  const bao = useToast()
  const [sua, setSua] = useState(null)
  const [mkMoi, setMkMoi] = useState(null)
  const [nhap, setNhap] = useState(false)
  const ds = s.dm.nhanSu
  async function datLai(n) {
    const mk = taoMatKhau()
    try { await rpc('td_dat_mat_khau', { p_id: n.id, p_mat_khau: mk }); setMkMoi({ n, mk }) } catch (e) { bao(e.message, 'loi') }
  }
  return (
    <section className="card">
      <div className="dau-the"><h2>Nhân sự tuyển dụng · {ds.length}</h2>{s.laToiCao && <div className="hang" style={{ gap: 8 }}><Btn kieu="trang" co="sm" icon={Upload} onClick={() => setNhap(true)}>Nhập từ file mẫu</Btn><Btn kieu="den" co="sm" icon={UserPlus} onClick={() => setSua({ ma_nv: '', ho_ten: '', vai_tro: 'phong_van', chuc_danh: '', khu_vuc: '', dien_thoai: '', mat_khau: taoMatKhau() })}>Thêm nhân sự</Btn></div>}</div>
      {!s.laToiCao && <Bao kieu="xanh">Chỉ Admin tối cao được thêm, sửa, khóa tài khoản và đặt lại mật khẩu nhân sự.</Bao>}
      {ds.map((n) => (
        <div key={n.id} className="dong-ns" style={{ opacity: n.hoat_dong ? 1 : 0.55 }}>
          <Avatar ten={n.ho_ten} />
          <div className="gian" style={{ flex: '1 1 200px' }}><b>{n.ho_ten} {n.id === s.toi.id && <span className="tag" style={{ height: 22 }}>Bạn</span>}</b><span>{n.ma_nv} · {n.chuc_danh || VAI_TRO[n.vai_tro]}{n.khu_vuc ? ' · ' + n.khu_vuc : ''}{n.dien_thoai ? ' · ' + fmtSdt(n.dien_thoai) : ''}</span></div>
          {n.toi_cao && <span className="tag tag-toi-cao">Admin tối cao</span>}
          <span className="tag" style={n.vai_tro === 'quan_tri' ? { background: 'var(--chon-nen)', color: 'var(--chon-chu)' } : n.vai_tro === 'tuyen_dung' ? { background: 'var(--pink-bg)', color: 'var(--pink-deep)' } : null}>{VAI_TRO[n.vai_tro]}</span>
          <span className="nho muted" style={{ minWidth: 110 }}>{n.dang_nhap_cuoi ? 'Vào ' + tuongDoi(n.dang_nhap_cuoi) : 'Chưa đăng nhập'}</span>
          <span className="nho muted">{n.so_phieu} phiếu · {n.so_lich} lịch</span>
          {!n.hoat_dong && <span className="tag" style={{ background: 'var(--err-bg)', color: 'var(--err)' }}>Đã khóa</span>}
          {s.laToiCao && <IconBtn icon={Pencil} nhan="Sửa" co="sm" kieu="mem" onClick={() => setSua(n)} size={15} />}
          {s.laToiCao && <IconBtn icon={KeyRound} nhan="Đặt lại mật khẩu" co="sm" kieu="mem" onClick={() => datLai(n)} size={15} />}
        </div>
      ))}
      {sua && <SuaNhanSu n={sua} dong={() => setSua(null)} />}
      {nhap && <NhapNhanSu dong={() => setNhap(false)} />}
      <Modal mo={!!mkMoi} dong={() => setMkMoi(null)} tieuDe="Mật khẩu mới" moTa={mkMoi ? mkMoi.n.ho_ten + ' · ' + mkMoi.n.ma_nv : ''} chan={<Btn kieu="den" onClick={() => setMkMoi(null)}>Xong</Btn>}>
        {mkMoi && <div className="cot" style={{ gap: 12 }}>
          <div className="hang" style={{ background: 'var(--soft)', borderRadius: 22, padding: '14px 16px' }}><b className="gian so" style={{ fontSize: 20, letterSpacing: '.04em' }}>{mkMoi.mk}</b><Btn co="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(mkMoi.mk).then(() => bao('Đã sao chép'))}>Sao chép</Btn></div>
          <Bao kieu="vang">Mật khẩu chỉ hiện một lần. Gửi riêng cho nhân sự và nhắc đổi lại sau khi đăng nhập.</Bao>
        </div>}
      </Modal>
    </section>
  )
}

const COT_MAU_NS = [
  { k: 'ma_nv', ten: 'Mã nhân viên', vd: 'NS00123', w: 16 },
  { k: 'ho_ten', ten: 'Họ và tên', vd: 'Nguyễn Văn A', w: 26 },
  { k: 'chuc_danh', ten: 'Chức danh', vd: 'Quản lý khu vực', w: 22 },
  { k: 'vai_tro', ten: 'Vai trò (Quản trị / Tuyển dụng / Phỏng vấn / Chỉ xem)', vd: 'Phỏng vấn', w: 44 },
  { k: 'mat_khau', ten: 'Mật khẩu (tối thiểu 8 ký tự)', vd: 'Matkhau123', w: 26 },
  { k: 'dien_thoai', ten: 'Điện thoại', vd: '0901234567', w: 16 },
  { k: 'khu_vuc', ten: 'Khu vực', vd: 'Hồ Chí Minh', w: 18 }
]

function NhapNhanSu({ dong }) {
  const s = useStaff()
  const bao = useToast()
  const [ds, setDs] = useState(null)
  const [kq, setKq] = useState(null)
  const [dang, setDang] = useState(false)
  async function taiMau() {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([COT_MAU_NS.map((c) => c.ten), COT_MAU_NS.map((c) => c.vd)])
    ws['!cols'] = COT_MAU_NS.map((c) => ({ wch: c.w }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Nhân sự')
    XLSX.writeFile(wb, 'Mau_nhap_nhan_su_tuyen_dung.xlsx')
  }
  async function docTep(e) {
    const f = e.target.files?.[0]; if (!f) return
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await f.arrayBuffer())
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' })
      const dong = aoa.slice(1).filter((r) => r.some((x) => String(x).trim()))
        .map((r) => Object.fromEntries(COT_MAU_NS.map((c, i) => [c.k, String(r[i] ?? '').trim()])))
        .map((r) => ({ ...r, ma_nv: r.ma_nv.toUpperCase().replace(/[^A-Z0-9]/g, '') }))
      if (!dong.length) return bao('File không có dòng dữ liệu', 'loi')
      setDs(dong); setKq(null)
    } catch (err) { bao('Không đọc được file: ' + err.message, 'loi') }
    e.target.value = ''
  }
  async function nhap() {
    setDang(true)
    try { const r = await rpc('td_nhap_nhan_su', { p: ds }); setKq(r); await s.taiDanhMuc(); bao('Đã tạo ' + r.tao + ' tài khoản') } catch (e) { bao(e.message, 'loi') }
    setDang(false)
  }
  return (
    <Modal mo rong dong={dong} tieuDe="Nhập nhân sự từ file mẫu" moTa="Tải file mẫu → điền mỗi dòng 1 nhân sự → tải lên → kiểm tra → tạo tài khoản."
      chan={<><Btn kieu="trong" onClick={dong}>Đóng</Btn>{ds && !kq && <Btn kieu="den" icon={UserPlus} loading={dang} onClick={nhap}>Tạo {ds.length} tài khoản</Btn>}</>}>
      <div className="cot" style={{ gap: 12 }}>
        <div className="hang wrap" style={{ gap: 8 }}>
          <Btn kieu="trang" co="sm" icon={Download} onClick={taiMau}>Tải file mẫu (.xlsx)</Btn>
          <label className="btn den sm" style={{ cursor: 'pointer' }}><Upload size={14} />Chọn file đã điền<input type="file" accept=".xlsx,.xls,.csv" hidden onChange={docTep} /></label>
        </div>
        {ds && (
          <div className="bang-nhap-ns">
            <div className="bn-dau"><span>Mã NV</span><span>Họ tên</span><span>Chức danh</span><span>Vai trò</span><span>Mật khẩu</span></div>
            {ds.map((r, i) => {
              const loi = kq?.loi?.find((x) => x.ma_nv === r.ma_nv && x.ho_ten === r.ho_ten)
              return (
                <div key={i} className={'bn-dong' + (loi ? ' loi' : kq ? ' ok' : '')}>
                  <b>{r.ma_nv || '—'}</b><span>{r.ho_ten}</span><span>{r.chuc_danh}</span><span>{r.vai_tro || 'Phỏng vấn'}</span><span>{r.mat_khau ? '•'.repeat(Math.min(8, r.mat_khau.length)) : <i style={{ color: 'var(--err)' }}>thiếu</i>}</span>
                  {loi && <small>{loi.loi}</small>}
                </div>
              )
            })}
          </div>
        )}
        {kq && <Bao kieu={kq.loi.length ? 'vang' : 'ok'}>Đã tạo {kq.tao} tài khoản{kq.loi.length ? ' · ' + kq.loi.length + ' dòng lỗi (đánh dấu đỏ ở trên)' : ''}. Nhân sự đăng nhập bằng mã NV + mật khẩu trong file.</Bao>}
      </div>
    </Modal>
  )
}

function SuaNhanSu({ n, dong }) {
  const s = useStaff()
  const bao = useToast()
  const moi = !n.id
  const [f, setF] = useState({ ...n })
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const d = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  async function luu() {
    setLoi(null); setDang(true)
    try {
      if (moi) await rpc('td_tao_nhan_su', { p: f })
      else await rpc('td_cap_nhat_nhan_su', { p_id: n.id, p: { ho_ten: f.ho_ten, vai_tro: f.vai_tro, chuc_danh: f.chuc_danh, khu_vuc: f.khu_vuc, dien_thoai: f.dien_thoai, hoat_dong: f.hoat_dong } })
      await s.taiDanhMuc()
      bao(moi ? 'Đã tạo tài khoản ' + f.ma_nv.toUpperCase() : 'Đã lưu')
      dong()
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <Modal mo dong={dong} tieuDe={moi ? 'Thêm nhân sự' : 'Sửa nhân sự'} moTa={moi ? 'Nhân sự đăng nhập bằng mã NV + mật khẩu.' : n.ma_nv}
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={Save} loading={dang} onClick={luu}>{moi ? 'Tạo tài khoản' : 'Lưu'}</Btn></>}>
      <div className="cot" style={{ gap: 10 }}>
        <div className="luoi-2">
          <Field kieu="gon" nhan="Mã nhân viên" value={f.ma_nv} onChange={(e) => setF((x) => ({ ...x, ma_nv: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} disabled={!moi} placeholder="NS00123" />
          <Field kieu="gon" nhan="Họ tên" value={f.ho_ten} onChange={d('ho_ten')} />
        </div>
        <div>
          <span className="nhan-nhom">Vai trò</span>
          <Chips co="sm" ds={Object.entries(VAI_TRO).map(([v, t]) => ({ v, t }))} giaTri={f.vai_tro} onChon={(v) => setF((x) => ({ ...x, vai_tro: v }))} />
        </div>
        <div className="luoi-3">
          <Field kieu="gon" nhan="Chức danh" value={f.chuc_danh || ''} onChange={d('chuc_danh')} placeholder="Cửa hàng trưởng" />
          <Field kieu="gon" nhan="Khu vực" value={f.khu_vuc || ''} onChange={d('khu_vuc')} />
          <Field kieu="gon" nhan="Điện thoại" value={f.dien_thoai || ''} onChange={d('dien_thoai')} inputMode="tel" />
        </div>
        {moi ? (
          <div className="hang"><Field kieu="gon" nhan="Mật khẩu ban đầu" value={f.mat_khau} onChange={d('mat_khau')} /><IconBtn icon={RefreshCw} nhan="Tạo mật khẩu khác" onClick={() => setF((x) => ({ ...x, mat_khau: taoMatKhau() }))} /><IconBtn icon={Copy} nhan="Sao chép" onClick={() => navigator.clipboard?.writeText(f.mat_khau).then(() => bao('Đã sao chép mật khẩu'))} /></div>
        ) : (
          <label className="hang" style={{ gap: 10, fontWeight: 600 }}><Switch on={f.hoat_dong} onDoi={(v) => setF((x) => ({ ...x, hoat_dong: v }))} nhan="Hoạt động" />{f.hoat_dong ? 'Đang hoạt động' : 'Đã khóa — không đăng nhập được'}</label>
        )}
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}

function Nguon() {
  const s = useStaff()
  const bao = useToast()
  const [sua, setSua] = useState(null)
  const [qr, setQr] = useState(null)
  const link = (ma) => APP_URL + '?src=' + ma
  return (
    <section className="card">
      <div className="dau-the"><h2>Kênh tuyển dụng & mã QR</h2><Btn kieu="den" co="sm" icon={Plus} onClick={() => setSua({ ma: '', ten: '', nhom: 'khac', ghi_chu: '', hoat_dong: true })}>Thêm kênh</Btn></div>
      <p className="nho muted" style={{ marginTop: -8, marginBottom: 10 }}>Mỗi kênh có link + mã QR riêng (in lên bill, bảng tuyển, bài đăng…). Hồ sơ nộp qua link sẽ tự ghi nhận kênh để báo cáo hiệu quả.</p>
      {s.dm.nguon.map((n) => (
        <div key={n.ma} className="dong-ns" style={{ opacity: n.hoat_dong ? 1 : 0.55 }}>
          <span className="orb sm"><QrCode size={15} /></span>
          <div className="gian" style={{ flex: '1 1 220px' }}><b>{n.ten}</b><span className="cat" style={{ display: 'block' }}>{link(n.ma)}</span></div>
          <span className="tag">{n.ma}</span>
          <IconBtn icon={Copy} nhan="Sao chép link" co="sm" kieu="mem" size={15} onClick={() => navigator.clipboard?.writeText(link(n.ma)).then(() => bao('Đã sao chép link'))} />
          <IconBtn icon={QrCode} nhan="Mã QR" co="sm" kieu="mem" size={15} onClick={() => setQr(n)} />
          <IconBtn icon={Pencil} nhan="Sửa" co="sm" kieu="mem" size={15} onClick={() => setSua(n)} />
        </div>
      ))}
      {sua && <SuaNguon n={sua} dong={() => setSua(null)} />}
      {qr && <QRModal n={qr} url={link(qr.ma)} dong={() => setQr(null)} />}
    </section>
  )
}

function QRModal({ n, url, dong }) {
  const [anh, setAnh] = useState(null)
  useEffect(() => { anhQR(url).then(setAnh) }, [url])
  return (
    <Modal mo dong={dong} tieuDe={'Mã QR · ' + n.ten} moTa={url}
      chan={<><Btn kieu="trong" onClick={dong}>Đóng</Btn><a className={'btn den' + (anh ? '' : ' disabled')} href={anh || '#'} download={'QR-tuyen-dung-' + n.ma + '.png'}><Download size={17} />Tải ảnh PNG</a></>}>
      <div className="qr-anh">{anh ? <img src={anh} alt={'QR ' + n.ma} /> : <div className="hang" style={{ height: '100%', justifyContent: 'center' }}><Spinner /></div>}</div>
      <p className="nho muted" style={{ textAlign: 'center', marginTop: 12 }}>Gợi ý in kèm: “Quét mã để ứng tuyển Nón Sơn — không cần đăng nhập”.</p>
    </Modal>
  )
}

function SuaNguon({ n, dong }) {
  const s = useStaff()
  const bao = useToast()
  const moi = !s.dm.nguon.some((x) => x.ma === n.ma && n.ma)
  const [f, setF] = useState(n)
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  async function luu() {
    setLoi(null)
    const ma = f.ma.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!/^[a-z0-9-]{2,40}$/.test(ma)) return setLoi('Mã chỉ gồm chữ thường, số, dấu gạch (2–40 ký tự)')
    if (f.ten.trim().length < 2) return setLoi('Nhập tên kênh')
    setDang(true)
    try { await luuDong('nguon', { ma, ten: f.ten.trim(), nhom: f.nhom || 'khac', ghi_chu: f.ghi_chu || null, hoat_dong: f.hoat_dong }, 'ma'); await s.taiDanhMuc(); bao('Đã lưu kênh'); dong() } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <Modal mo dong={dong} tieuDe={moi ? 'Thêm kênh tuyển dụng' : 'Sửa kênh'} chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={Save} loading={dang} onClick={luu}>Lưu</Btn></>}>
      <div className="cot" style={{ gap: 10 }}>
        <Field kieu="gon" nhan="Mã kênh (dùng trong link)" value={f.ma} onChange={(e) => setF((x) => ({ ...x, ma: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} disabled={!moi} placeholder="vd: bill-ch12, fb-thang11" />
        <Field kieu="gon" nhan="Tên kênh" value={f.ten} onChange={(e) => setF((x) => ({ ...x, ten: e.target.value }))} placeholder="VD: Bảng tuyển CH Lê Lợi" />
        <Field kieu="gon" nhan="Ghi chú" value={f.ghi_chu || ''} onChange={(e) => setF((x) => ({ ...x, ghi_chu: e.target.value }))} />
        <label className="hang" style={{ gap: 10, fontWeight: 600 }}><Switch on={f.hoat_dong} onDoi={(v) => setF((x) => ({ ...x, hoat_dong: v }))} nhan="Đang dùng" />{f.hoat_dong ? 'Đang dùng' : 'Ngừng ghi nhận'}</label>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}

function useCaiDat(khoa, macDinh) {
  const s = useStaff()
  const bao = useToast()
  const [v, setV] = useState(() => s.dm.caiDat[khoa] ?? macDinh)
  const [dang, setDang] = useState(false)
  async function luu(gt) {
    setDang(true)
    try { await luuDong('cai_dat', { khoa, gia_tri: gt, cap_nhat_luc: new Date().toISOString() }, 'khoa'); await s.taiDanhMuc(); bao('Đã lưu cài đặt') } catch (e) { bao(e.message, 'loi') }
    setDang(false)
  }
  return [v, setV, luu, dang]
}

function BieuMau() {
  const [f, setF, luu, dang] = useCaiDat('form', {})
  const [hv, setHv] = useState((f.hoc_van || []).join('\n'))
  const [ng, setNg] = useState((f.nguon_lua_chon || []).join('\n'))
  const [dh, setDh] = useState((f.dinh_huong || []).join('\n'))
  const so = (k, min, max) => (e) => setF((x) => ({ ...x, [k]: Math.min(max, Math.max(min, Number(e.target.value.replace(/\D/g, '')) || min)) }))
  return (
    <div className="hai-cot">
      <section className="card lon">
        <div className="dau-the"><h2>Trang ứng tuyển</h2></div>
        <div className="cot" style={{ gap: 12 }}>
          <label className="hang" style={{ gap: 12, fontWeight: 700 }}><Switch on={f.dang_mo !== false} onDoi={(v) => setF((x) => ({ ...x, dang_mo: v }))} nhan="Nhận hồ sơ" />{f.dang_mo !== false ? 'Đang nhận hồ sơ trực tuyến' : 'Tạm ngừng nhận hồ sơ'}</label>
          <Field kieu="gon" nhan="Lời chào dưới tiêu đề"><textarea rows={2} value={f.loi_chao || ''} onChange={(e) => setF((x) => ({ ...x, loi_chao: e.target.value }))} placeholder="Việc làm ổn định, môi trường trẻ trung tại hơn 200 cửa hàng Nón Sơn…" /></Field>
          <div className="luoi-2">
            <Field kieu="gon" nhan="Số ảnh tối thiểu" value={f.min_anh ?? 2} onChange={so('min_anh', 1, 5)} inputMode="numeric" />
            <Field kieu="gon" nhan="Số ảnh tối đa" value={f.max_anh ?? 5} onChange={so('max_anh', 1, 9)} inputMode="numeric" />
            <Field kieu="gon" nhan="Dung lượng ảnh tối đa (MB)" value={f.max_anh_mb ?? 30} onChange={so('max_anh_mb', 1, 50)} inputMode="numeric" />
            <Field kieu="gon" nhan="Dung lượng video tối đa (MB)" value={f.max_video_mb ?? 500} onChange={so('max_video_mb', 10, 500)} inputMode="numeric" goiY="Tối đa 500 MB (giới hạn kho)" />
          </div>
        </div>
      </section>
      <section className="card nho-cot">
        <div className="dau-the"><h2>Lựa chọn trong biểu mẫu</h2></div>
        <div className="cot" style={{ gap: 12 }}>
          <Field kieu="gon" nhan="Trình độ học vấn (mỗi dòng 1 mục)" goiY="Mục “Khác” tự thêm ở cuối"><textarea rows={4} value={hv} onChange={(e) => setHv(e.target.value)} /></Field>
          <Field kieu="gon" nhan="Nguồn thông tin (mỗi dòng 1 mục)"><textarea rows={6} value={ng} onChange={(e) => setNg(e.target.value)} /></Field>
          <Field kieu="gon" nhan="Ổn định / linh hoạt (mỗi dòng 1 mục)"><textarea rows={2} value={dh} onChange={(e) => setDh(e.target.value)} /></Field>
        </div>
      </section>
      <div style={{ flexBasis: '100%' }}><Btn kieu="den" orb="trai" icon={Save} loading={dang} onClick={() => luu({ ...f, min_anh: Math.min(f.min_anh ?? 2, f.max_anh ?? 5), hoc_van: dsDong(hv), nguon_lua_chon: dsDong(ng), dinh_huong: dsDong(dh) })}>Lưu biểu mẫu</Btn></div>
    </div>
  )
}

function CaiPV() {
  const [dd, setDd, luuDD, dang1] = useCaiDat('dia_diem', [])
  const [mau, setMau, luuMau, dang2] = useCaiDat('mau_tin_hen', '')
  const [txt, setTxt] = useState((Array.isArray(dd) ? dd : []).join('\n'))
  return (
    <>
    <div className="hai-cot">
      <section className="card lon">
        <div className="dau-the"><h2>Địa điểm phỏng vấn thường dùng</h2></div>
        <Field kieu="gon" nhan="Mỗi dòng 1 địa điểm" goiY="Hiện thành nút chọn nhanh khi hẹn lịch"><textarea rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={'Cửa hàng Nón Sơn 123 Lê Lợi, Q.1\nVăn phòng Nón Sơn …'} /></Field>
        <div style={{ marginTop: 12 }}><Btn kieu="den" icon={Save} loading={dang1} onClick={() => luuDD(dsDong(txt))}>Lưu địa điểm</Btn></div>
      </section>
      <section className="card nho-cot">
        <div className="dau-the"><h2>Mẫu tin nhắn mời</h2></div>
        <Field kieu="gon" nhan="Nội dung"><textarea rows={6} value={mau} onChange={(e) => setMau(e.target.value)} /></Field>
        <p className="nho muted" style={{ marginTop: 8, lineHeight: 1.7 }}>Biến: <code>{'{ten}'}</code> <code>{'{vi_tri}'}</code> <code>{'{gio}'}</code> <code>{'{thu}'}</code> <code>{'{ngay}'}</code> <code>{'{dia_diem}'}</code> <code>{'{link}'}</code></p>
        <div style={{ marginTop: 12 }}><Btn kieu="den" icon={Save} loading={dang2} onClick={() => luuMau(mau)}>Lưu mẫu</Btn></div>
      </section>
    </div>
    <CaiKetQua />
    </>
  )
}

function CaiKetQua() {
  const [tp, setTp, luuTp, d1] = useCaiDat('tac_phong', TAC_PHONG_MAC_DINH)
  const [md, setMd, luuMd, d2] = useCaiDat('mau_tin_dat', '')
  const [mk, setMk, luuMk, d3] = useCaiDat('mau_tin_khong_dat', '')
  const [txt, setTxt] = useState(dsTacPhong(tp).join('\n'))
  return (
    <div className="hai-cot" style={{ marginTop: 18 }}>
      <section className="card lon">
        <div className="dau-the"><h2>Tin báo trúng tuyển</h2></div>
        <Field kieu="gon" nhan="Nội dung" goiY="Để trống = dùng mẫu mặc định"><textarea rows={12} value={md || MAC_DINH_TIN_DAT} onChange={(e) => setMd(e.target.value)} /></Field>
        <p className="nho muted" style={{ marginTop: 8, lineHeight: 1.7 }}>Biến: <code>{'{ten}'}</code> <code>{'{vi_tri}'}</code> <code>{'{cua_hang}'}</code> <code>{'{dia_chi}'}</code> <code>{'{gio}'}</code> <code>{'{thu}'}</code> <code>{'{ngay}'}</code> <code>{'{ghi_chu}'}</code> <code>{'{tac_phong}'}</code> <code>{'{link}'}</code></p>
        <div className="hang" style={{ marginTop: 12, gap: 8 }}><Btn kieu="den" icon={Save} loading={d2} onClick={() => luuMd(md === MAC_DINH_TIN_DAT ? '' : md)}>Lưu mẫu</Btn><Btn kieu="trong" onClick={() => setMd('')}>Về mặc định</Btn></div>
        <div className="dau-the" style={{ marginTop: 22 }}><h2>Tin báo chưa phù hợp</h2></div>
        <Field kieu="gon" nhan="Nội dung"><textarea rows={7} value={mk || MAC_DINH_TIN_KHONG_DAT} onChange={(e) => setMk(e.target.value)} /></Field>
        <p className="nho muted" style={{ marginTop: 8 }}>Biến: <code>{'{ten}'}</code> <code>{'{vi_tri}'}</code> <code>{'{link}'}</code></p>
        <div className="hang" style={{ marginTop: 12, gap: 8 }}><Btn kieu="den" icon={Save} loading={d3} onClick={() => luuMk(mk === MAC_DINH_TIN_KHONG_DAT ? '' : mk)}>Lưu mẫu</Btn><Btn kieu="trong" onClick={() => setMk('')}>Về mặc định</Btn></div>
      </section>
      <section className="card nho-cot">
        <div className="dau-the"><h2>Tác phong khi nhận việc</h2></div>
        <Field kieu="gon" nhan="Mỗi dòng 1 lưu ý" goiY="Hiện trên trang tra cứu và trong tin báo trúng tuyển"><textarea rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} /></Field>
        <div style={{ marginTop: 12 }}><Btn kieu="den" icon={Save} loading={d1} onClick={() => { const ds = dsDong(txt); setTp(ds); luuTp(ds) }}>Lưu tác phong</Btn></div>
      </section>
    </div>
  )
}

function DonDep() {
  const bao = useToast()
  const [ds, setDs] = useState(null)
  const [dang, setDang] = useState(false)
  const [tienDo, setTienDo] = useState(null)
  const tai = () => rpc('td_ds_nhap_cu').then(setDs).catch((e) => bao(e.message, 'loi'))
  useEffect(() => { tai() }, [])
  async function don() {
    setDang(true)
    try {
      let n = 0
      for (const id of ds) {
        setTienDo(++n + '/' + ds.length)
        const tep = await dsTep(id)
        await xoaTep(tep)
      }
      const x = await rpc('td_xoa_nhap', { p_ids: ds })
      bao('Đã dọn ' + x + ' hồ sơ nháp bỏ dở')
      tai()
    } catch (e) { bao(e.message, 'loi') }
    setTienDo(null)
    setDang(false)
  }
  return (
    <section className="card">
      <div className="dau-the"><h2><Sparkles size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Dọn hồ sơ nháp bỏ dở</h2></div>
      <p className="muted-2" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>Khi ứng viên tải ảnh/video nhưng không bấm gửi, hệ thống giữ bản nháp. Bản nháp quá 2 ngày có thể xóa để giải phóng dung lượng kho (không ảnh hưởng hồ sơ đã nộp).</p>
      <div className="hang" style={{ marginTop: 16, gap: 12 }}>
        {ds == null ? <Spinner /> : <b style={{ fontSize: 28 }}>{ds.length}</b>}<span className="muted">bản nháp quá 2 ngày</span>
        <Btn kieu="den" icon={Trash2} loading={dang} disabled={!ds?.length} onClick={don} className="day">{tienDo ? 'Đang dọn ' + tienDo : 'Dọn ngay'}</Btn>
      </div>
    </section>
  )
}

function CuaHang() {
  const bao = useToast()
  const { data, reload } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const [tim, setTim] = useState('')
  const [sua, setSua] = useState(null)
  const ds = (data || []).filter((c) => { const t = khongDau(tim).trim().split(/\s+/).filter(Boolean); return t.every((w) => khongDau(c.ten + ' ' + c.ma + ' ' + (c.khu_vuc || '') + ' ' + (c.dia_chi || '')).includes(w)) })
  async function luu(c) { try { await luuDong('cua_hang', { ...c, cap_nhat_luc: new Date().toISOString() }, 'ma'); bao('Đã lưu cửa hàng'); setSua(null); reload(true) } catch (e) { bao(e.message, 'loi') } }
  return (
    <section className="card">
      <div className="dau-the"><h2>Cửa hàng · {(data || []).filter((c) => c.hoat_dong).length} đang hoạt động</h2><Btn kieu="den" co="sm" icon={Plus} onClick={() => setSua({ ma: '', ten: '', dia_chi: '', khu_vuc: '', hoat_dong: true, nguon: 'thu_cong', moi: true })}>Thêm</Btn></div>
      <p className="nho muted" style={{ marginTop: -8, marginBottom: 12 }}>Danh sách lấy từ hệ thống Chấm công (mã cửa hàng giữ nguyên để liên kết). Dùng khi nhận việc & điều chuyển nhân viên.</p>
      <label className="input-tron" style={{ background: 'var(--soft)', boxShadow: 'none', marginBottom: 8 }}><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm tên, mã, khu vực, địa chỉ…" /></label>
      {!data ? <Spinner /> : ds.slice(0, 120).map((c) => (
        <div key={c.ma} className="dong-ns" style={{ opacity: c.hoat_dong ? 1 : 0.5 }}>
          <span className="tag" style={{ minWidth: 78, justifyContent: 'center' }}>{c.ma}</span>
          <div className="gian" style={{ flex: '1 1 220px' }}><b>{c.ten}</b><span className="cat" style={{ display: 'block' }}>{c.khu_vuc || '—'}{c.dia_chi ? ' · ' + c.dia_chi : ''}</span></div>
          {(c.lat != null || c.dia_chi) && <a className="icon-btn sm mem" href={banDo(c)} target="_blank" rel="noreferrer" aria-label="Mở bản đồ" title={c.lat != null ? 'Định vị ' + c.lat + ', ' + c.lng : 'Theo địa chỉ'}><MapPin size={15} color={c.lat != null ? 'var(--ok)' : undefined} /></a>}
          <Switch on={c.hoat_dong} nhan="Hoạt động" onDoi={(v) => luu({ ...c, hoat_dong: v })} />
          <IconBtn icon={Pencil} nhan="Sửa" co="sm" kieu="mem" size={15} onClick={() => setSua(c)} />
        </div>
      ))}
      {data && ds.length > 120 && <p className="nho muted" style={{ padding: 8 }}>… và {ds.length - 120} cửa hàng khác, hãy tìm cụ thể hơn.</p>}
      {sua && (
        <Modal mo dong={() => setSua(null)} tieuDe={sua.moi ? 'Thêm cửa hàng' : 'Sửa cửa hàng'} chan={<><Btn kieu="trong" onClick={() => setSua(null)}>Hủy</Btn><Btn kieu="den" icon={Save} onClick={() => { const { moi, ...c } = sua; if (!c.ma || !c.ten) return bao('Nhập mã và tên', 'loi'); luu(c) }}>Lưu</Btn></>}>
          <div className="cot" style={{ gap: 10 }}>
            <div className="luoi-2"><Field kieu="gon" nhan="Mã cửa hàng" value={sua.ma} disabled={!sua.moi} onChange={(e) => setSua((x) => ({ ...x, ma: e.target.value.toUpperCase().trim() }))} /><Field kieu="gon" nhan="Tên" value={sua.ten} onChange={(e) => setSua((x) => ({ ...x, ten: e.target.value }))} /></div>
            <Field kieu="gon" nhan="Khu vực" value={sua.khu_vuc || ''} onChange={(e) => setSua((x) => ({ ...x, khu_vuc: e.target.value }))} />
            <Field kieu="gon" nhan="Địa chỉ" value={sua.dia_chi || ''} onChange={(e) => setSua((x) => ({ ...x, dia_chi: e.target.value }))} />
            <div className="luoi-2">
              <Field kieu="gon" nhan="Vĩ độ (lat)" inputMode="decimal" value={sua.lat ?? ''} onChange={(e) => setSua((x) => ({ ...x, lat: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) }))} placeholder="10.7867384" />
              <Field kieu="gon" nhan="Kinh độ (lng)" inputMode="decimal" value={sua.lng ?? ''} onChange={(e) => setSua((x) => ({ ...x, lng: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) }))} placeholder="106.6934778" />
            </div>
            <span className="nho muted">Mẹo: mở Google Maps, nhấn giữ đúng vị trí cửa hàng → sao chép 2 số tọa độ dán vào đây.</span>
          </div>
        </Modal>
      )}
    </section>
  )
}

function MauNhanSu() {
  const bao = useToast()
  const { data: gt, reload: r1 } = useAsync(() => docBang('giay_to_mau', [['thu_tu', true]]), [])
  const { data: moc, reload: r2 } = useAsync(() => docBang('moc_mau', [['thu_tu', true]]), [])
  const [moiGt, setMoiGt] = useState('')
  const [moiMoc, setMoiMoc] = useState({ ten: '', so_ngay: 7 })
  const luu = async (bang, d, k, r) => { try { await luuDong(bang, d, k); r(true) } catch (e) { bao(e.message, 'loi') } }
  const ma = (t) => khongDau(t).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) + '_' + Date.now().toString(36).slice(-3)
  return (
    <div className="hai-cot">
      <section className="card lon">
        <div className="dau-the"><h2>Giấy tờ khi nhận việc</h2></div>
        <p className="nho muted" style={{ marginTop: -8, marginBottom: 8 }}>Áp dụng cho nhân viên nhận việc từ nay về sau.</p>
        {(gt || []).map((g) => (
          <div key={g.ma} className="dong-ns" style={{ opacity: g.hoat_dong ? 1 : 0.5 }}>
            <div className="gian"><b>{g.ten}</b><span>{g.mo_ta || ''}</span></div>
            <label className="hang nho" style={{ gap: 6 }}><Switch on={g.bat_buoc} nhan="Bắt buộc" onDoi={(v) => luu('giay_to_mau', { ...g, bat_buoc: v }, 'ma', r1)} />Bắt buộc</label>
            <label className="hang nho" style={{ gap: 6 }}><Switch on={g.hoat_dong} nhan="Dùng" onDoi={(v) => luu('giay_to_mau', { ...g, hoat_dong: v }, 'ma', r1)} />Dùng</label>
          </div>
        ))}
        <div className="hang" style={{ marginTop: 10 }}><Field kieu="gon" nhan="Thêm giấy tờ" value={moiGt} onChange={(e) => setMoiGt(e.target.value)} /><Btn kieu="den" co="sm" icon={Plus} onClick={() => { if (moiGt.trim()) { themDong('giay_to_mau', { ma: ma(moiGt), ten: moiGt.trim(), thu_tu: (gt || []).length + 1 }).then(() => { setMoiGt(''); r1(true) }).catch((e) => bao(e.message, 'loi')) } }}>Thêm</Btn></div>
      </section>
      <section className="card nho-cot">
        <div className="dau-the"><h2>Lộ trình hội nhập</h2></div>
        {(moc || []).map((m) => (
          <div key={m.ma} className="dong-ns" style={{ opacity: m.hoat_dong ? 1 : 0.5 }}>
            <span className="tag">+{m.so_ngay} ngày</span>
            <div className="gian"><b style={{ fontSize: 13.5 }}>{m.ten}</b></div>
            <Switch on={m.hoat_dong} nhan="Dùng" onDoi={(v) => luu('moc_mau', { ...m, hoat_dong: v }, 'ma', r2)} />
          </div>
        ))}
        <div className="cot" style={{ marginTop: 10, gap: 8 }}>
          <Field kieu="gon" nhan="Mốc mới" value={moiMoc.ten} onChange={(e) => setMoiMoc((x) => ({ ...x, ten: e.target.value }))} />
          <div className="hang"><Field kieu="gon" nhan="Sau ngày nhận việc (ngày)" value={moiMoc.so_ngay} onChange={(e) => setMoiMoc((x) => ({ ...x, so_ngay: Number(e.target.value.replace(/\D/g, '')) || 0 }))} inputMode="numeric" />
            <Btn kieu="den" co="sm" icon={Plus} onClick={() => { if (moiMoc.ten.trim()) { themDong('moc_mau', { ma: ma(moiMoc.ten), ten: moiMoc.ten.trim(), so_ngay: moiMoc.so_ngay, thu_tu: (moc || []).length + 1 }).then(() => { setMoiMoc({ ten: '', so_ngay: 7 }); r2(true) }).catch((e) => bao(e.message, 'loi')) } }}>Thêm</Btn></div>
        </div>
      </section>
    </div>
  )
}
