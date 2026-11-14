import { useEffect, useState } from 'react'
import { useLS } from '../lib/hooks'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Briefcase, CalendarDays, Columns3, LayoutGrid, LogOut, Menu as MenuIc, Settings, Users, ExternalLink, Zap, UserCheck, History, PanelLeftClose, PanelLeftOpen, Mic } from 'lucide-react'
import { useStaff } from './context'
import { VAI_TRO } from '../lib/stages'
import { chuCai } from '../lib/format'
import { Modal, NonIcon, Spinner, Btn } from '../components/ui'
import Login from './Login'

function dsMuc(s) {
  return [
    { to: '/quantri', ten: 'Tổng quan', ic: LayoutGrid, end: true },
    s.coSua && { to: '/quantri/sang-loc', ten: 'Xem nhanh', ic: Zap, badge: (s.dem?.moi || 0) + (s.dem?.sang_loc || 0) },
    { to: '/quantri/ung-vien', ten: 'Ứng viên', ic: Users },
    { to: '/quantri/phong-van', ten: 'Phỏng vấn', ic: Mic, badge: s.dem?.hen_pv },
    { to: '/quantri/quy-trinh', ten: 'Quy trình', ic: Columns3 },
    { nhom: 'Nhân sự' },
    s.vaiTro !== 'phong_van' && { to: '/quantri/nhan-vien', ten: 'Nhân viên mới', ic: UserCheck },
    { nhom: 'Quản lý' },
    s.coSua && { to: '/quantri/vi-tri', ten: 'Vị trí tuyển', ic: Briefcase },
    s.vaiTro !== 'phong_van' && { to: '/quantri/bao-cao', ten: 'Báo cáo', ic: BarChart3 },
    s.coSua && { to: '/quantri/nhat-ky', ten: 'Nhật ký', ic: History },
    { to: '/quantri/cai-dat', ten: 'Cài đặt', ic: Settings }
  ].filter(Boolean).filter((m, i, a) => !m.nhom || (a[i + 1] && !a[i + 1].nhom))
}

export default function AdminLayout() {
  const s = useStaff()
  const [moThem, setMoThem] = useState(false)
  const [gon, setGon] = useLS('ns-td-menu-gon', false)
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
      <nav className={'sidebar' + (gon ? ' gon' : '')} aria-label="Menu chính">
        <div className="glow hong" style={{ width: 220, height: 220, left: -90, bottom: -60, opacity: 0.45 }} />
        <div className="sb-brand"><span className="orb"><NonIcon size={20} /></span><div className="an-gon"><b>NS TUYỂN DỤNG</b><span>Nón Sơn</span></div>
          <button type="button" className="sb-gon" onClick={() => setGon(!gon)} aria-label={gon ? 'Mở rộng menu' : 'Thu gọn menu'} title={gon ? 'Mở rộng menu' : 'Thu gọn menu'}>{gon ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
        </div>
        <div className="sb-cuon">
        {muc.map((m, i) => m.nhom
          ? <div key={i} className="nav-nhom">{m.nhom}</div>
          : (
            <NavLink key={m.to} to={m.to} end={m.end} title={gon ? m.ten : undefined} className={({ isActive }) => 'nav-item' + (isActive ? ' on' : '')}>
              <m.ic size={19} strokeWidth={2} /><span className="an-gon">{m.ten}</span>{m.badge > 0 && <span className="badge">{m.badge > 99 ? '99+' : m.badge}</span>}
            </NavLink>
          ))}
        <a className="nav-item" href="/" target="_blank" rel="noreferrer" title={gon ? 'Trang ứng tuyển' : undefined}><ExternalLink size={19} /><span className="an-gon">Trang ứng tuyển</span></a>
        </div>
        <div className="sb-user">
          <span className="av">{chuCai(s.toi.ho_ten)}</span>
          <div className="gian an-gon"><b className="cat">{s.toi.ho_ten}</b><span>{VAI_TRO[s.vaiTro]} · {s.toi.ma_nv}</span></div>
          <button className="icon-btn xs kinh an-gon" onClick={s.thoat} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={15} /></button>
        </div>
      </nav>

      <header className="topbar">
        <span className="orb sm"><NonIcon size={17} /></span>
        <span className="ten cat">{tieuDe}</span>
        <button className="icon-btn sm" onClick={() => nav('/quantri/cai-dat')} aria-label="Tài khoản"><span className="av sm" style={{ background: 'var(--ink)', color: '#fff' }}>{chuCai(s.toi.ho_ten)}</span></button>
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
        <button type="button" onClick={() => setMoThem(true)} className={muc.filter((m) => m.to).slice(4).some((m) => loc.pathname.startsWith(m.to)) ? 'on' : ''}><MenuIc size={20} /><span>Thêm</span></button>
      </nav>

      <Modal mo={moThem} dong={() => setMoThem(false)} tieuDe={s.toi.ho_ten} moTa={VAI_TRO[s.vaiTro] + ' · ' + s.toi.ma_nv}>
        <div className="cot" style={{ gap: 8 }}>
          {muc.filter((m) => m.to).slice(4).map((m) => (
            <Btn key={m.to} kieu="mem" co="lg" icon={m.ic} className="rong" style={{ justifyContent: 'flex-start' }} onClick={() => { setMoThem(false); nav(m.to) }}>{m.ten}</Btn>
          ))}
          <Btn co="lg" icon={ExternalLink} className="rong" style={{ justifyContent: 'flex-start' }} onClick={() => window.open('/', '_blank')}>Trang ứng tuyển</Btn>
          <Btn kieu="do" co="lg" icon={LogOut} className="rong" style={{ justifyContent: 'flex-start' }} onClick={() => { setMoThem(false); s.thoat() }}>Đăng xuất</Btn>
        </div>
      </Modal>
    </div>
  )
}
