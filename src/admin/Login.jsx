import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { dangNhap, daCauHinh } from '../lib/api'
import { Bao, Brand, Field, Spinner } from '../components/ui'

export default function Login() {
  const [ma, setMa] = useState(() => localStorage.getItem('ns-td-ma') || '')
  const [mk, setMk] = useState('')
  const [hien, setHien] = useState(false)
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)

  async function vao(e) {
    e.preventDefault()
    setLoi(null)
    const m = ma.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(m)) return setLoi('Nhập mã nhân viên (VD: NS00490)')
    if (!mk) return setLoi('Nhập mật khẩu')
    setDang(true)
    try {
      await dangNhap(m, mk)
      localStorage.setItem('ns-td-ma', m)
    } catch (e2) { setLoi(e2.message); setDang(false) }
  }

  return (
    <div className="dang-nhap">
      <div className="glow hong" style={{ width: 380, height: 380, left: -140, top: '18%', opacity: 0.65, filter: 'blur(90px)', zIndex: -1 }} />
      <div className="glow tim" style={{ width: 300, height: 300, right: -120, bottom: 40, opacity: 0.5, filter: 'blur(90px)', zIndex: -1 }} />
      <form className="hop-dn" onSubmit={vao} autoComplete="on">
        <span className="qua-cau troi" aria-hidden="true" style={{ width: 140, height: 140, right: -6, top: -40 }} />
        <span className="qua-cau tim troi cham" aria-hidden="true" style={{ width: 44, height: 44, right: 150, top: 84 }} />
        <Brand />
        <div style={{ marginTop: 150 }}>
          <p className="eyebrow sang" style={{ marginBottom: 10 }}>Khu vực nội bộ</p>
          <h1>NS <b>Tuyển Dụng</b></h1>
        </div>
        <div className="cot" style={{ marginTop: 28, gap: 12 }}>
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
        </div>
      </form>
    </div>
  )
}
