import { useState } from 'react'
import { Download, Eye, EyeOff, LogIn } from 'lucide-react'
import { dangNhap, daCauHinh } from '../lib/api'
import { Bao, Field, Spinner } from '../components/ui'
import { HuongDanCai } from './CaiApp'
import { useCaiApp } from '../lib/caiApp'

export default function Login() {
  const [ma, setMa] = useState(() => localStorage.getItem('ns-td-ma') || '')
  const [mk, setMk] = useState('')
  const [hien, setHien] = useState(false)
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const [moCai, setMoCai] = useState(false)
  const caiApp = useCaiApp()

  async function vao(e) {
    e.preventDefault()
    setLoi(null)
    const m = ma.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(m)) return setLoi('Nhập mã nhân viên (VD: NS00123)')
    if (!mk) return setLoi('Nhập mật khẩu')
    setDang(true)
    try {
      await dangNhap(m, mk)
      localStorage.setItem('ns-td-ma', m)
    } catch (e2) { setLoi(e2.message); setDang(false) }
  }

  return (
    <div className="dang-nhap">
      <div className="glow hong" style={{ width: 380, height: 380, left: -140, top: '18%', opacity: 0.6, filter: 'blur(100px)', zIndex: -1 }} />
      <div className="glow tim" style={{ width: 300, height: 300, right: -120, bottom: 40, opacity: 0.45, filter: 'blur(100px)', zIndex: -1 }} />
      <span className="bong-tron b1 dn-b1" aria-hidden="true" />
      <span className="bong-tron b2 dn-b2" aria-hidden="true" />
      <form className="hop-dn" onSubmit={vao} autoComplete="on">
        <span className="portal-ten">NÓN SƠN</span>
        <div className="dn-tieu">
          <p className="eyebrow sang">Khu vực nội bộ</p>
          <h1 className="hero-chu" aria-label="Hệ thống tuyển dụng Nón Sơn">
            <span className="d1">Hệ thống</span>
            <span className="d2">Tuyển dụng</span>
            <span className="d3">Nón Sơn</span>
          </h1>
        </div>
        <div className="cot" style={{ marginTop: 30, gap: 12 }}>
          {!daCauHinh && <Bao kieu="vang">Hệ thống chưa được cấu hình kết nối máy chủ.</Bao>}
          <Field kieu="toi" nhan="Mã nhân viên" value={ma} onChange={(e) => setMa(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="NS00000" autoComplete="username" autoCapitalize="characters" spellCheck={false} style={{ letterSpacing: '.06em' }} />
          <div style={{ position: 'relative' }}>
            <Field kieu="toi" nhan="Mật khẩu" type={hien ? 'text' : 'password'} value={mk} onChange={(e) => setMk(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            <button type="button" className="icon-btn xs kinh" style={{ position: 'absolute', right: 14, top: 15 }} onClick={() => setHien((x) => !x)} aria-label={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{hien ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
          {loi && <Bao kieu="loi">{loi}</Bao>}
          <button type="submit" className="btn trang lg co-orb rong" disabled={dang} style={{ marginTop: 8, height: 60, boxShadow: '0 18px 40px rgba(224,21,126,.35)' }}>
            Đăng nhập <span className="orb">{dang ? <Spinner size={16} /> : <LogIn size={18} strokeWidth={2.4} />}</span>
          </button>
          <p style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,.55)', textAlign: 'center' }}>Quên mật khẩu? Liên hệ quản trị hệ thống</p>
          {!caiApp.daCai && <button type="button" className="dn-cai" onClick={async () => { if (caiApp.coNutCai && await caiApp.cai()) return; setMoCai(true) }}><Download size={15} strokeWidth={2.4} />Tải ứng dụng về máy</button>}
        </div>
      </form>
      <HuongDanCai mo={moCai} dong={() => setMoCai(false)} />
    </div>
  )
}
