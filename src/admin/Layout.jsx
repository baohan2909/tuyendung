import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Briefcase, CalendarDays, Columns3, LayoutGrid, LogOut, Menu as MenuIc, Settings, Users, ExternalLink } from 'lucide-react'
import { useStaff } from './context'
import { VAI_TRO } from '../lib/stages'
import { chuCai } from '../lib/format'
import { Modal, NonIcon, Spinner, Btn } from '../components/ui'
import Login from './Login'

function dsMuc(s) {
  return [
    { to: '/quan-tri', ten: 'Tổng quan', ic: LayoutGrid, end: true },
    { to: '/quan-tri/ung-vien', ten: 'Ứng viên', ic: Users, badge: s.dem?.moi },
    { to: '/quan-tri/quy-trinh', ten: 'Quy trình', ic: Columns3 },
    { to: '/quan-tri/phong-van', ten: 'Phỏng vấn', ic: CalendarDays },
    { nhom: 'Quản lý' },
    s.coSua && { to: '/quan-tri/vi-tri', ten: 'Vị trí tuyển', ic: Briefcase },
    s.vaiTro !== 'phong_van' && { to: '/quan-tri/bao-cao', ten: 'Báo cáo', ic: BarChart3 },
    { to: '/quan-tri/cai-dat', ten: 'Cài đặt', ic: Settings }
  ].filter(Boolean)
}

export default function AdminLayout() {
  const s = useStaff()
  const [moThem, setMoThem] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => { setMoThem(false) }, [loc.pathname])

  if (s.phien === undefined || (s.phien && s.toi === undefined)) return <div className="dang-nhap"><Spinner size={30} /></div>
  if (!s.phien) return <Login />
  if (!s.toi) {
    return (
      <div className="dang-nhap">
        <div className="hop-dn cot" style={{ gap: 16, textAlign: 'center', alignItems: 'center' }}>
          <h1>Tài khoản <b>chưa được cấp quyền</b></h1>
          <p style={{ color: 'rgba(255,255,255,.7)' }}>Tài khoản này không thuộc danh sách nhân sự tuyển dụng hoặc đã bị khóa. Liên hệ quản trị hệ thống.</p>
          <Btn kieu="trang" icon={LogOut} onClick={s.thoat}>Đăng xuất</Btn>
        </div>
      </div>
    )
  }

  const muc = dsMuc(s)
  const chinh = muc.filter((m) => m.to).slice(0, 4)
  const tieuDe = muc.find((m) => m.to && (m.end ? loc.pathname === m.to : loc.pathname.startsWith(m.to)))?.ten || 'NS Tuyển Dụng'

  return (
    <div className="admin">
      <nav className="sidebar" aria-label="Menu chính">
        <div className="glow hong" style={{ width: 220, height: 220, left: -90, bottom: -60, opacity: 0.45 }} />
        <div className="sb-brand"><span className="orb"><NonIcon size={20} /></span><div><b>NS TUYỂN DỤNG</b><span>Nón Sơn</span></div></div>
        {muc.map((m, i) => m.nhom
          ? <div key={i} className="nav-nhom">{m.nhom}</div>
          : (
            <NavLink key={m.to} to={m.to} end={m.end} className={({ isActive }) => 'nav-item' + (isActive ? ' on' : '')}>
              <m.ic size={19} strokeWidth={2} />{m.ten}{m.badge > 0 && <span className="badge">{m.badge > 99 ? '99+' : m.badge}</span>}
            </NavLink>
          ))}
        <a className="nav-item" href="#/" target="_blank" rel="noreferrer"><ExternalLink size={19} />Trang ứng tuyển</a>
        <div className="sb-user">
          <span className="av">{chuCai(s.toi.ho_ten)}</span>
          <div className="gian"><b className="cat">{s.toi.ho_ten}</b><span>{VAI_TRO[s.vaiTro]} · {s.toi.ma_nv}</span></div>
          <button className="icon-btn xs kinh" onClick={s.thoat} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={15} /></button>
        </div>
      </nav>

      <header className="topbar">
        <span className="orb sm"><NonIcon size={17} /></span>
        <span className="ten cat">{tieuDe}</span>
        <button className="icon-btn sm" onClick={() => nav('/quan-tri/cai-dat')} aria-label="Tài khoản"><span className="av sm" style={{ background: 'var(--ink)', color: '#fff' }}>{chuCai(s.toi.ho_ten)}</span></button>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Menu nhanh">
        <div className="glow hong" style={{ width: 160, height: 160, left: -40, top: -60, opacity: 0.35, filter: 'blur(50px)' }} />
        {chinh.map((m) => (
          <NavLink key={m.to} to={m.to} end={m.end} className={({ isActive }) => (isActive ? 'on' : '')}>
            <m.ic size={20} strokeWidth={2.1} /><span>{m.ten}</span>{m.badge > 0 && <i className="badge">{m.badge > 99 ? '99+' : m.badge}</i>}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMoThem(true)} className={muc.slice(5).some((m) => m.to && loc.pathname.startsWith(m.to)) ? 'on' : ''}><MenuIc size={20} /><span>Thêm</span></button>
      </nav>

      <Modal mo={moThem} dong={() => setMoThem(false)} tieuDe={s.toi.ho_ten} moTa={VAI_TRO[s.vaiTro] + ' · ' + s.toi.ma_nv}>
        <div className="cot" style={{ gap: 8 }}>
          {muc.filter((m) => m.to).slice(4).map((m) => (
            <Btn key={m.to} kieu="mem" co="lg" icon={m.ic} className="rong" style={{ justifyContent: 'flex-start' }} onClick={() => { setMoThem(false); nav(m.to) }}>{m.ten}</Btn>
          ))}
          <Btn co="lg" icon={ExternalLink} className="rong" style={{ justifyContent: 'flex-start' }} onClick={() => window.open('#/', '_blank')}>Trang ứng tuyển</Btn>
          <Btn kieu="do" co="lg" icon={LogOut} className="rong" style={{ justifyContent: 'flex-start' }} onClick={() => { setMoThem(false); s.thoat() }}>Đăng xuất</Btn>
        </div>
      </Modal>
    </div>
  )
}
