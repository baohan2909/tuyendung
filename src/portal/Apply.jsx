import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Clock, Copy, Film, Plus, RotateCcw, Search, ShieldCheck, Smartphone, X } from 'lucide-react'
import { rpc } from '../lib/api'
import { taiLen } from '../lib/upload'
import { duoiTep, mimeVideo, thongTinVideo, xuLyAnh } from '../lib/media'
import { iconViTri } from '../lib/icons'
import { fmtGiay, fmtMB, fmtSdt, tenGoi } from '../lib/format'
import { Bao, Btn, Chips, Field, Spinner } from '../components/ui'
import { PortalShell } from './Shell'

const KHOA = 'ns-td-ho-so-v1'
const TRONG = {
  ho_ten: '', sdt: '', ngay_sinh: '', vi_tri_id: null, email: '', chieu_cao: '', can_nang: '', cho_o: '',
  khu_vuc_mong_muon: '', hoc_van: '', hoc_van_khac: '', dinh_huong: '', kinh_nghiem: '', an_tuong: '',
  thu_nhap_mong_muon: '', nguon: [], nguon_khac: '', sdt_gioi_thieu: '', tra_loi_them: {}
}
const BUOC = [
  { ten: 'Bạn là ai?', moTa: 'Thông tin cơ bản để Nón Sơn liên hệ với bạn.', hero: ['Bắt đầu', 'hành trình mới', 'cùng Nón Sơn'] },
  { ten: 'Kể thêm về bạn', moTa: 'Giúp chúng tôi sắp xếp vị trí và khu vực phù hợp.', hero: ['Kể thêm', 'về bạn', 'một chút nhé'] },
  { ten: 'Kinh nghiệm & mong muốn', moTa: 'Không có kinh nghiệm cũng không sao — hãy chia sẻ thật lòng.', hero: ['Điều bạn', 'mong muốn', 'là gì?'] },
  { ten: 'Ảnh & video giới thiệu', moTa: 'Ảnh rõ mặt và một video ngắn giới thiệu bản thân.', hero: ['Cho chúng tôi', 'thấy bạn', 'tự tin nhé!'] }
]
const THU_NHAP = ['7–8 triệu', '8–10 triệu', '10–12 triệu', 'Trên 12 triệu', 'Theo năng lực']
const laSdt = (s) => /^0\d{9}$/.test(String(s || '').replace(/\D/g, '').replace(/^84(\d{9})$/, '0$1'))
const chuanSdt = (s) => String(s || '').replace(/\D/g, '').replace(/^84(\d{9})$/, '0$1')
const dongVN = (s) => String(s || '').replace(/\s+/g, ' ').trim()

function docLuu() { try { return JSON.parse(localStorage.getItem(KHOA)) || null } catch (e) { return null } }
function maNguon() {
  const q = new URLSearchParams(window.location.search)
  const h = new URLSearchParams((window.location.hash.split('?')[1]) || '')
  const v = (q.get('src') || h.get('src') || sessionStorage.getItem('ns-td-src') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  if (v) sessionStorage.setItem('ns-td-src', v)
  return v || null
}
function thietBi() {
  const u = navigator.userAgent || ''
  const hdh = /iPhone|iPad|iPod/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac OS/.test(u) ? 'macOS' : 'Khác'
  const tb = /CriOS|Chrome/.test(u) ? 'Chrome' : /FxiOS|Firefox/.test(u) ? 'Firefox' : /Zalo/i.test(u) ? 'Zalo' : /FBAN|FBAV/.test(u) ? 'Facebook' : /Safari/.test(u) ? 'Safari' : 'Trình duyệt'
  return (hdh + ' · ' + tb + ' · ' + window.innerWidth + 'px').slice(0, 200)
}

export default function Apply() {
  const luu = useMemo(docLuu, [])
  const [cfg, setCfg] = useState(null)
  const [loiCfg, setLoiCfg] = useState(null)
  const [f, setF] = useState(() => ({ ...TRONG, ...(luu?.f || {}) }))
  const [buoc, setBuoc] = useState(() => Math.min(luu?.buoc || 0, 2))
  const [nhap, setNhap] = useState(() => luu?.nhap || null)
  const [stt, setStt] = useState(() => luu?.stt || 1)
  const [loi, setLoi] = useState({})
  const [loiChung, setLoiChung] = useState(null)
  const [dangChuyen, setDangChuyen] = useState(false)
  const [tep, setTep] = useState([])
  const [dongY, setDongY] = useState(false)
  const [ketQua, setKetQua] = useState(null)
  const src = useMemo(maNguon, [])
  const sheetRef = useRef(null)

  useEffect(() => {
    rpc('td_cau_hinh_cong').then(setCfg).catch((e) => setLoiCfg(e.message))
  }, [])
  useEffect(() => {
    if (ketQua) return
    try { localStorage.setItem(KHOA, JSON.stringify({ f, buoc, nhap, stt })) } catch (e) { /* bỏ qua */ }
  }, [f, buoc, nhap, stt, ketQua])

  const form = cfg?.form || {}
  const minAnh = form.min_anh ?? 2
  const maxAnh = form.max_anh ?? 5
  const maxVideo = (form.max_video_mb ?? 500) * 1048576
  const maxAnhB = (form.max_anh_mb ?? 30) * 1048576
  const viTri = cfg?.vi_tri || []
  const vt = viTri.find((v) => v.id === f.vi_tri_id)
  const cauHoi = (vt?.cau_hoi_them || []).filter((q) => q && q.cau_hoi)
  const dsHocVan = [...(form.hoc_van || ['THPT', 'Trung cấp', 'Cao đẳng', 'Đại học']), 'Khác']
  const dsNguon = [...(form.nguon_lua_chon || []), 'Khác']
  const dsDinhHuong = form.dinh_huong || ['Làm việc ổn định', 'Di chuyển linh hoạt']

  const dat = (k) => (v) => { setF((x) => ({ ...x, [k]: v })); if (loi[k]) setLoi((l) => ({ ...l, [k]: null })) }
  const datE = (k) => (e) => dat(k)(e.target.value)
  const datTL = (q, v) => setF((x) => ({ ...x, tra_loi_them: { ...x.tra_loi_them, [q]: v } }))

  const payload = useCallback(() => ({
    ho_ten: dongVN(f.ho_ten), sdt: chuanSdt(f.sdt), email: f.email.trim(), ngay_sinh: f.ngay_sinh, vi_tri_id: f.vi_tri_id,
    chieu_cao: Number(f.chieu_cao), can_nang: Number(f.can_nang), cho_o: dongVN(f.cho_o), khu_vuc_mong_muon: dongVN(f.khu_vuc_mong_muon),
    hoc_van: f.hoc_van === 'Khác' ? 'Khác: ' + dongVN(f.hoc_van_khac) : f.hoc_van, dinh_huong: f.dinh_huong,
    kinh_nghiem: f.kinh_nghiem.trim(), an_tuong: f.an_tuong.trim(), thu_nhap_mong_muon: dongVN(f.thu_nhap_mong_muon),
    nguon: f.nguon.map((n) => (n === 'Khác' ? 'Khác: ' + dongVN(f.nguon_khac) : n)), ma_nguon: src,
    sdt_gioi_thieu: chuanSdt(f.sdt_gioi_thieu), tra_loi_them: f.tra_loi_them, thiet_bi: thietBi()
  }), [f, src])

  function kiem(b) {
    const l = {}
    if (b === 0) {
      if (dongVN(f.ho_ten).length < 2) l.ho_ten = 'Vui lòng nhập họ và tên'
      if (!laSdt(f.sdt)) l.sdt = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
      if (!f.ngay_sinh) l.ngay_sinh = 'Vui lòng chọn ngày sinh'
      else {
        const n = new Date().getFullYear() - Number(f.ngay_sinh.slice(0, 4))
        if (n < 15 || n > 70) l.ngay_sinh = 'Ngày sinh chưa hợp lệ'
      }
      if (!f.vi_tri_id) l.vi_tri_id = 'Chọn vị trí bạn muốn ứng tuyển'
    }
    if (b === 1) {
      const cc = Number(f.chieu_cao), cn = Number(f.can_nang)
      if (!(cc >= 100 && cc <= 230)) l.chieu_cao = 'Nhập chiều cao (cm)'
      if (!(cn >= 30 && cn <= 200)) l.can_nang = 'Nhập cân nặng (kg)'
      if (dongVN(f.cho_o).length < 2) l.cho_o = 'Vui lòng nhập nơi ở hiện tại'
      if (dongVN(f.khu_vuc_mong_muon).length < 2) l.khu_vuc_mong_muon = 'Bạn muốn làm ở khu vực nào?'
      if (!f.hoc_van) l.hoc_van = 'Chọn trình độ học vấn'
      if (f.hoc_van === 'Khác' && dongVN(f.hoc_van_khac).length < 2) l.hoc_van = 'Ghi rõ trình độ của bạn'
      if (!f.dinh_huong) l.dinh_huong = 'Chọn một lựa chọn'
      if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim())) l.email = 'Email chưa đúng định dạng'
    }
    if (b === 2) {
      if (!f.nguon.length) l.nguon = 'Chọn ít nhất một nguồn'
      if (f.nguon.includes('Khác') && dongVN(f.nguon_khac).length < 2) l.nguon = 'Ghi rõ nguồn khác'
      if (f.sdt_gioi_thieu && !laSdt(f.sdt_gioi_thieu)) l.sdt_gioi_thieu = 'Số điện thoại chưa đúng'
      for (const q of cauHoi) if (q.bat_buoc && !String(f.tra_loi_them[q.cau_hoi] || '').trim()) l['q:' + q.cau_hoi] = 'Vui lòng trả lời câu hỏi này'
    }
    setLoi(l)
    return !Object.keys(l).length
  }

  const lenDau = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); sheetRef.current?.scrollTo?.({ top: 0 }) }

  async function tiep() {
    setLoiChung(null)
    if (!kiem(buoc)) { setTimeout(() => document.querySelector('.field.loi, .loi-chu')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30); return }
    if (buoc === 2) {
      setDangChuyen(true)
      try {
        let n = nhap
        const conHan = n && Date.now() - n.luc < 20 * 3600 * 1000 && stt < 90
        if (!conHan) {
          const r = await rpc('td_tao_nhap', { p: payload() })
          n = { id: r.id, ma: r.ma, luc: Date.now() }
          setNhap(n)
          setStt(1)
          setTep([])
        }
      } catch (e) {
        setLoiChung(e.message)
        setDangChuyen(false)
        return
      }
      setDangChuyen(false)
    }
    setBuoc((b) => Math.min(3, b + 1))
    lenDau()
  }
  const lui = () => { setLoiChung(null); setBuoc((b) => Math.max(0, b - 1)); lenDau() }

  // ---------- tải tệp ----------
  const capNhat = (k, o) => setTep((ds) => ds.map((t) => (t.k === k ? { ...t, ...o } : t)))
  const dangTai = tep.some((t) => t.trangThai === 'dang')
  useEffect(() => {
    if (dangTai || !nhap) return
    const t = tep.find((x) => x.trangThai === 'cho')
    if (!t) return
    xuLyTep(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tep, dangTai, nhap])

  async function xuLyTep(t) {
    capNhat(t.k, { trangThai: 'dang', tienDo: 0.03, loi: null })
    try {
      if (t.loai === 'anh') {
        const kq = await xuLyAnh(t.file)
        if (kq) capNhat(t.k, { xem: URL.createObjectURL(kq.nho) })
        const duoi = kq ? 'jpg' : duoiTep(t.file, 'jpg')
        const loai = kq ? 'image/jpeg' : (t.file.type || (duoi === 'heic' ? 'image/heic' : 'image/jpeg'))
        const path = nhap.id + '/anh-' + t.n + '.' + duoi
        await taiLen({ path, blob: kq ? kq.lon : t.file, loai, onTienDo: (p) => capNhat(t.k, { tienDo: 0.05 + p * 0.85 }) })
        if (kq) await taiLen({ path: nhap.id + '/nho-' + t.n + '.jpg', blob: kq.nho, loai: 'image/jpeg' }).catch(() => {})
        capNhat(t.k, { trangThai: 'xong', tienDo: 1, path })
      } else {
        const tt = await thongTinVideo(t.file)
        capNhat(t.k, { thoiLuong: tt.thoiLuong, xem: tt.bia ? URL.createObjectURL(tt.bia) : null })
        const path = nhap.id + '/video-' + t.n + '.' + duoiTep(t.file, 'mp4')
        await taiLen({ path, blob: t.file, loai: mimeVideo(t.file), onTienDo: (p) => capNhat(t.k, { tienDo: 0.02 + p * 0.96 }) })
        if (tt.bia) await taiLen({ path: nhap.id + '/poster-' + t.n + '.jpg', blob: tt.bia, loai: 'image/jpeg' }).catch(() => {})
        capNhat(t.k, { trangThai: 'xong', tienDo: 1, path, thoiLuong: tt.thoiLuong })
      }
    } catch (e) {
      capNhat(t.k, { trangThai: 'loi', loi: e.message || 'Tải thất bại' })
    }
  }

  function themTep(files, loai) {
    setLoiChung(null)
    const moi = []
    let n = stt
    const coAnh = tep.filter((t) => t.loai === 'anh').length
    for (const file of files) {
      if (loai === 'anh') {
        if (coAnh + moi.length >= maxAnh) { setLoiChung('Tối đa ' + maxAnh + ' ảnh.'); break }
        if (!/^image\//.test(file.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) { setLoiChung('Vui lòng chọn tệp ảnh.'); continue }
        if (file.size > maxAnhB) { setLoiChung('Ảnh "' + file.name + '" lớn hơn ' + form.max_anh_mb + ' MB.'); continue }
      } else {
        if (!/^video\//.test(file.type) && !/\.(mp4|mov|webm|3gp|m4v|mpe?g)$/i.test(file.name)) { setLoiChung('Vui lòng chọn tệp video.'); continue }
        if (file.size > maxVideo) { setLoiChung('Video lớn hơn ' + form.max_video_mb + ' MB. Hãy quay ngắn hơn (khoảng 1 phút).'); continue }
      }
      moi.push({ k: Math.random().toString(36).slice(2), n: n++, loai, file, ten: file.name, kich: file.size, trangThai: 'cho', tienDo: 0, xem: loai === 'anh' && /jpe?g|png|webp/i.test(file.type) ? URL.createObjectURL(file) : null })
    }
    if (!moi.length) return
    setStt(n)
    setTep((ds) => (loai === 'video' ? [...ds.filter((t) => t.loai !== 'video'), ...moi.slice(0, 1)] : [...ds, ...moi]))
  }
  const xoaTep = (k) => setTep((ds) => ds.filter((t) => t.k !== k))
  const thuLai = (k) => capNhat(k, { trangThai: 'cho', tienDo: 0, loi: null })

  const anh = tep.filter((t) => t.loai === 'anh')
  const video = tep.find((t) => t.loai === 'video')
  const anhXong = anh.filter((t) => t.trangThai === 'xong').length
  const tatCaXong = tep.length > 0 && tep.every((t) => t.trangThai === 'xong')
  const tienDoChung = tep.length ? tep.reduce((s, t) => s + (t.loai === 'video' ? 4 : 1) * (t.tienDo || 0), 0) / tep.reduce((s, t) => s + (t.loai === 'video' ? 4 : 1), 0) : 0

  async function gui() {
    setLoiChung(null)
    if (anh.length < minAnh) return setLoiChung('Cần ít nhất ' + minAnh + ' ảnh cá nhân.')
    if (!video) return setLoiChung('Vui lòng thêm video giới thiệu bản thân.')
    if (!tatCaXong) return setLoiChung(tep.some((t) => t.trangThai === 'loi') ? 'Có tệp tải lỗi — bấm "Thử lại" trên tệp đó.' : 'Đang tải tệp lên, vui lòng chờ trong giây lát…')
    if (!dongY) return setLoiChung('Vui lòng xác nhận đồng ý ở cuối trang.')
    setDangChuyen(true)
    try {
      const tl = {}
      tep.forEach((t) => { if (t.loai === 'video' && t.thoiLuong) tl[t.path] = Math.round(t.thoiLuong * 10) / 10 })
      const r = await rpc('td_nop_ho_so', { p_id: nhap.id, p: { ...payload(), tep: tep.map((t) => t.path), thoi_luong: tl } })
      setKetQua({ ma: r.ma, ten: dongVN(f.ho_ten), sdt: chuanSdt(f.sdt) })
      try { localStorage.removeItem(KHOA) } catch (e) { /* bỏ qua */ }
      window.scrollTo({ top: 0 })
    } catch (e) {
      setLoiChung(e.message)
    }
    setDangChuyen(false)
  }

  // ---------- giao diện ----------
  if (ketQua) return <HoanTat kq={ketQua} />
  if (loiCfg) return <PortalShell hero={['Xin lỗi', 'có trục trặc', 'nhỏ']}><Bao kieu="loi">{loiCfg}</Bao><Btn kieu="den" onClick={() => window.location.reload()} icon={RotateCcw}>Tải lại trang</Btn></PortalShell>
  if (!cfg) return <PortalShell hero={BUOC[0].hero} dangTai><div className="dang-tai-trang"><Spinner size={28} /></div></PortalShell>
  if (form.dang_mo === false) return <PortalShell hero={['Tạm ngừng', 'nhận hồ sơ', 'trực tuyến']}><Bao kieu="vang">Hiện Nón Sơn tạm ngừng nhận hồ sơ trực tuyến. Bạn có thể ghé cửa hàng gần nhất hoặc quay lại sau nhé.</Bao></PortalShell>

  const b = BUOC[buoc]
  return (
    <PortalShell hero={b.hero} buoc={buoc} loiChao={buoc === 0 ? (form.loi_chao || 'Việc làm ổn định, môi trường trẻ trung tại hơn 200 cửa hàng Nón Sơn trên toàn quốc.') : null} sheetRef={sheetRef}>
      <div className="tien-trinh" aria-label={'Bước ' + (buoc + 1) + ' trên 4'}>
        {BUOC.map((_, i) => <span key={i} className={i < buoc ? 'xong' : i === buoc ? 'dang' : ''} />)}
      </div>
      <div>
        <h2 className="buoc-ten">{b.ten}</h2>
      </div>
      <p className="buoc-mo-ta">{b.moTa}</p>

      {buoc === 0 && (
        <div className="form-cot">
          <Field nhan="Họ và tên" batBuoc loi={loi.ho_ten} value={f.ho_ten} onChange={datE('ho_ten')} placeholder="Nguyễn Thị Lan" autoComplete="name" autoCapitalize="words" />
          <div className="luoi-2">
            <Field nhan="Điện thoại" batBuoc loi={loi.sdt} value={f.sdt} onChange={datE('sdt')} placeholder="09xx xxx xxx" inputMode="tel" autoComplete="tel" maxLength={14} />
            <Field nhan="Ngày sinh" batBuoc loi={loi.ngay_sinh} type="date" value={f.ngay_sinh} onChange={datE('ngay_sinh')} min="1955-01-01" max={new Date().getFullYear() - 15 + '-12-31'} />
          </div>
          <div>
            <span className="nhan-nhom">Bạn muốn làm <i>*</i></span>
            <div className={'vi-tri' + (loi.vi_tri_id ? ' loi' : '')} role="radiogroup" aria-label="Vị trí ứng tuyển">
              {viTri.map((v) => {
                const Ic = iconViTri(v.icon)
                return (
                  <button key={v.id} type="button" role="radio" aria-checked={f.vi_tri_id === v.id} className={f.vi_tri_id === v.id ? 'on' : ''} onClick={() => dat('vi_tri_id')(v.id)}>
                    <span className="ic"><Ic size={20} strokeWidth={2} /></span>
                    <span className="ten">{v.ten}</span>
                    {v.mo_ta && <span className="mo-ta">{v.mo_ta}</span>}
                  </button>
                )
              })}
            </div>
            {loi.vi_tri_id && <div className="loi-chu">{loi.vi_tri_id}</div>}
            {vt?.chi_tiet && <p className="nho muted" style={{ marginTop: 10, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{vt.chi_tiet}</p>}
          </div>
        </div>
      )}

      {buoc === 1 && (
        <div className="form-cot">
          <div className="luoi-2">
            <Field nhan="Chiều cao (cm)" batBuoc loi={loi.chieu_cao} value={f.chieu_cao} onChange={datE('chieu_cao')} inputMode="numeric" placeholder="160" maxLength={3} />
            <Field nhan="Cân nặng (kg)" batBuoc loi={loi.can_nang} value={f.can_nang} onChange={datE('can_nang')} inputMode="numeric" placeholder="50" maxLength={3} />
          </div>
          <Field nhan="Chỗ ở hiện tại" batBuoc loi={loi.cho_o} value={f.cho_o} onChange={datE('cho_o')} placeholder="Phường/xã, quận/huyện, tỉnh/thành" autoComplete="street-address" />
          <Field nhan="Khu vực mong muốn làm việc" batBuoc loi={loi.khu_vuc_mong_muon} value={f.khu_vuc_mong_muon} onChange={datE('khu_vuc_mong_muon')} placeholder="VD: Gò Vấp, Quận 1, Thủ Đức…" />
          <Field nhan="Email (không bắt buộc)" loi={loi.email} value={f.email} onChange={datE('email')} type="email" inputMode="email" placeholder="ban@gmail.com" autoComplete="email" />
          <div>
            <span className="nhan-nhom">Trình độ học vấn <i>*</i></span>
            <Chips ds={dsHocVan} giaTri={f.hoc_van} onChon={dat('hoc_van')} />
            {f.hoc_van === 'Khác' && <div style={{ marginTop: 10 }}><Field nhan="Trình độ khác" value={f.hoc_van_khac} onChange={datE('hoc_van_khac')} placeholder="VD: Trung cấp nghề may" autoFocus /></div>}
            {loi.hoc_van && <div className="loi-chu">{loi.hoc_van}</div>}
          </div>
          <div>
            <span className="nhan-nhom">Bạn muốn <i>*</i></span>
            <Chips ds={dsDinhHuong} giaTri={f.dinh_huong} onChon={dat('dinh_huong')} />
            {loi.dinh_huong && <div className="loi-chu">{loi.dinh_huong}</div>}
          </div>
        </div>
      )}

      {buoc === 2 && (
        <div className="form-cot">
          <Field nhan="Kinh nghiệm làm việc" goiY="Nơi làm, công việc, thời gian — chưa có cũng không sao.">
            <textarea value={f.kinh_nghiem} onChange={datE('kinh_nghiem')} rows={3} maxLength={4000} placeholder="VD: 1 năm bán hàng thời trang tại…" />
          </Field>
          <Field nhan="Ấn tượng của bạn về Nón Sơn">
            <textarea value={f.an_tuong} onChange={datE('an_tuong')} rows={2} maxLength={3000} placeholder="Điều bạn thích ở Nón Sơn…" />
          </Field>
          <div>
            <span className="nhan-nhom">Thu nhập mong muốn</span>
            <Chips ds={THU_NHAP} giaTri={f.thu_nhap_mong_muon} onChon={dat('thu_nhap_mong_muon')} co="sm" />
          </div>
          {cauHoi.map((q) => (
            <div key={q.cau_hoi}>
              {q.lua_chon?.length ? (
                <>
                  <span className="nhan-nhom">{q.cau_hoi} {q.bat_buoc && <i>*</i>}</span>
                  <Chips ds={q.lua_chon} giaTri={f.tra_loi_them[q.cau_hoi] || ''} onChon={(v) => datTL(q.cau_hoi, v)} co="sm" />
                  {loi['q:' + q.cau_hoi] && <div className="loi-chu">{loi['q:' + q.cau_hoi]}</div>}
                </>
              ) : (
                <Field nhan={q.cau_hoi} batBuoc={q.bat_buoc} loi={loi['q:' + q.cau_hoi]} value={f.tra_loi_them[q.cau_hoi] || ''} onChange={(e) => datTL(q.cau_hoi, e.target.value)} />
              )}
            </div>
          ))}
          <div>
            <span className="nhan-nhom">Bạn biết tin tuyển dụng qua <i>*</i></span>
            <Chips ds={dsNguon} giaTri={f.nguon} onChon={dat('nguon')} nhieu tick co="sm" />
            {f.nguon.includes('Khác') && <div style={{ marginTop: 10 }}><Field nhan="Nguồn khác" value={f.nguon_khac} onChange={datE('nguon_khac')} placeholder="Ghi rõ nguồn" /></div>}
            {loi.nguon && <div className="loi-chu">{loi.nguon}</div>}
          </div>
          {(f.nguon.some((n) => /giới thiệu/i.test(n)) || f.sdt_gioi_thieu) && (
            <Field nhan="SĐT người giới thiệu" loi={loi.sdt_gioi_thieu} value={f.sdt_gioi_thieu} onChange={datE('sdt_gioi_thieu')} inputMode="tel" placeholder="Nếu có" maxLength={14} />
          )}
        </div>
      )}

      {buoc === 3 && (
        <div className="form-cot">
          <div className="hang" style={{ justifyContent: 'space-between' }}>
            <span className="nhan-nhom" style={{ margin: 0 }}>Ảnh cá nhân · {anh.length}/{maxAnh} <i>*</i></span>
            <span className="nho muted">Tối thiểu {minAnh} ảnh · rõ mặt</span>
          </div>
          <div className="luoi-anh">
            {anh.map((t) => <OAnh key={t.k} t={t} xoa={() => xoaTep(t.k)} thuLai={() => thuLai(t.k)} />)}
            {anh.length < maxAnh && (
              <label className="o-them">
                <span className="orb"><Camera size={18} /></span>
                {anh.length ? 'Thêm ảnh' : 'Chọn ảnh'}
                <input type="file" accept="image/*" multiple onChange={(e) => { themTep([...e.target.files], 'anh'); e.target.value = '' }} aria-label="Chọn ảnh cá nhân" />
              </label>
            )}
          </div>
          <span className="nhan-nhom" style={{ marginTop: 6, marginBottom: 0 }}>Video giới thiệu bản thân <i>*</i></span>
          {video ? <OVideo t={video} xoa={() => xoaTep(video.k)} thuLai={() => thuLai(video.k)} /> : (
            <label className="o-video trong">
              <span className="orb"><Film size={19} /></span>
              <span className="thong-tin"><b>Quay hoặc chọn video</b><span>Khoảng 30–60 giây: giới thiệu tên, tuổi, kinh nghiệm và lý do muốn làm ở Nón Sơn.</span></span>
              <input type="file" accept="video/*" onChange={(e) => { themTep([...e.target.files], 'video'); e.target.value = '' }} aria-label="Chọn video giới thiệu" />
            </label>
          )}
          {tep.length > 0 && !tatCaXong && (
            <div className="hang nho muted" style={{ gap: 8 }}>
              <Spinner size={14} /> Đang tải lên {Math.round(tienDoChung * 100)}% — bạn có thể đọc lại thông tin trong lúc chờ.
            </div>
          )}
          <label className="dong-y" onClick={(e) => { e.preventDefault(); setDongY((x) => !x) }}>
            <span className={'o-chon' + (dongY ? ' on' : '')} role="checkbox" aria-checked={dongY}>{dongY && <Check size={13} strokeWidth={3.2} />}</span>
            <span>Tôi xác nhận thông tin là đúng và đồng ý để Nón Sơn sử dụng hồ sơ, ảnh, video cho mục đích tuyển dụng.</span>
          </label>
        </div>
      )}

      {loiChung && <Bao kieu="loi">{loiChung}</Bao>}

      <div className="chan-form">
        {buoc > 0 ? <button type="button" className="nut-lui" onClick={lui} aria-label="Quay lại"><ArrowLeft size={20} /></button> : (
          <span className="ghi"><Clock size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Chỉ khoảng 3 phút</span>
        )}
        {buoc > 0 && <span className="ghi">{buoc === 3 ? (anhXong + '/' + Math.max(minAnh, anh.length) + ' ảnh · ' + (video?.trangThai === 'xong' ? '1/1 video' : '0/1 video')) : 'Bước ' + (buoc + 1) + ' / 4'}</span>}
        {buoc < 3
          ? <Btn kieu="den" co="lg" orb loading={dangChuyen} onClick={tiep}>Tiếp tục</Btn>
          : <Btn kieu="den" co="lg" orb loading={dangChuyen} icon={Check} onClick={gui} disabled={!tep.length}>Gửi hồ sơ</Btn>}
      </div>
      {buoc === 0 && (
        <Link to="/tra-cuu" className="hang nho" style={{ justifyContent: 'center', color: 'var(--muted-2)', fontWeight: 600, gap: 6 }}>
          <Search size={14} /> Đã nộp hồ sơ? Tra cứu kết quả
        </Link>
      )}
    </PortalShell>
  )
}

function OAnh({ t, xoa, thuLai }) {
  return (
    <div className="o-anh">
      {t.xem ? <img src={t.xem} alt={t.ten} /> : <div className="hang" style={{ height: '100%', justifyContent: 'center', color: 'var(--muted)' }}><Camera size={22} /></div>}
      {t.trangThai !== 'loi' && <button className="xoa" type="button" onClick={xoa} aria-label="Xóa ảnh"><X size={15} /></button>}
      {(t.trangThai === 'dang' || t.trangThai === 'cho') && <div className="tt"><i style={{ width: Math.round((t.tienDo || 0) * 100) + '%' }} /></div>}
      {t.trangThai === 'xong' && <span className="xong"><Check size={14} strokeWidth={3} /></span>}
      {t.trangThai === 'loi' && (
        <div className="hong">
          {t.loi}
          <span className="hang" style={{ gap: 6 }}><button type="button" onClick={thuLai}>Thử lại</button><button type="button" onClick={xoa}>Bỏ</button></span>
        </div>
      )}
    </div>
  )
}

function OVideo({ t, xoa, thuLai }) {
  return (
    <div className="o-video">
      {t.xem && <img className="bia" src={t.xem} alt="" />}
      <span className="orb">{t.trangThai === 'xong' ? <Check size={19} strokeWidth={3} /> : t.trangThai === 'loi' ? <RotateCcw size={18} /> : <Film size={19} />}</span>
      <span className="thong-tin">
        <b className="cat">{t.trangThai === 'xong' ? 'Đã tải video lên' : t.trangThai === 'loi' ? 'Tải video lỗi' : 'Đang tải video…'}</b>
        <span>{t.trangThai === 'loi' ? t.loi : [fmtMB(t.kich), t.thoiLuong ? fmtGiay(t.thoiLuong) : null, t.trangThai !== 'xong' ? Math.round((t.tienDo || 0) * 100) + '%' : null].filter(Boolean).join(' · ')}</span>
        {t.trangThai !== 'xong' && t.trangThai !== 'loi' && <div className="tt"><i style={{ width: Math.round((t.tienDo || 0) * 100) + '%' }} /></div>}
      </span>
      {t.trangThai === 'loi' && <Btn kieu="trang" co="sm" onClick={thuLai}>Thử lại</Btn>}
      <button type="button" className="icon-btn kinh sm" onClick={xoa} aria-label="Bỏ video"><X size={16} /></button>
    </div>
  )
}

function HoanTat({ kq }) {
  const [daChep, setDaChep] = useState(false)
  const chep = () => { navigator.clipboard?.writeText(kq.ma).then(() => { setDaChep(true); setTimeout(() => setDaChep(false), 1800) }) }
  return (
    <PortalShell hero={['Gửi hồ sơ', 'thành công!', 'Cảm ơn ' + tenGoi(kq.ten)]} xong>
      <div className="cot" style={{ alignItems: 'center', textAlign: 'center', gap: 12, paddingTop: 6 }}>
        <span className="dau-tich"><Check size={34} color="#fff" strokeWidth={3} /></span>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Nón Sơn đã nhận hồ sơ</h2>
        <p className="muted" style={{ fontSize: 14, maxWidth: 360 }}>Chúng tôi sẽ liên hệ qua số <b style={{ color: 'var(--ink)' }}>{fmtSdt(kq.sdt)}</b> trong thời gian sớm nhất. Hãy để ý điện thoại và Zalo nhé.</p>
      </div>
      <div className="xong-ma">
        <div className="glow hong" style={{ width: 160, height: 160, right: -50, top: -60, opacity: 0.6, filter: 'blur(50px)', zIndex: -1 }} />
        <span className="eyebrow sang">Mã hồ sơ của bạn</span>
        <div className="ma">{kq.ma}</div>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>Dùng mã này cùng số điện thoại để tra cứu kết quả. Bạn nên chụp màn hình lại.</p>
        <div className="hang" style={{ marginTop: 14 }}>
          <Btn kieu="trang" co="sm" icon={daChep ? Check : Copy} onClick={chep}>{daChep ? 'Đã sao chép' : 'Sao chép mã'}</Btn>
        </div>
      </div>
      <div className="bao xanh"><Smartphone size={17} /><div>Lịch phỏng vấn (nếu có) sẽ hiện trong mục tra cứu — bạn có thể xác nhận tham gia ngay tại đó.</div></div>
      <div className="chan-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <Link to={'/tra-cuu?ma=' + encodeURIComponent(kq.ma) + '&sdt=' + kq.sdt} className="btn den lg co-orb rong" style={{ textDecoration: 'none' }}>
          Tra cứu hồ sơ <span className="orb"><Search size={17} strokeWidth={2.6} /></span>
        </Link>
        <p className="nho muted hang" style={{ justifyContent: 'center', gap: 6 }}><ShieldCheck size={14} /> Thông tin của bạn được bảo mật, chỉ bộ phận tuyển dụng xem được.</p>
      </div>
    </PortalShell>
  )
}
