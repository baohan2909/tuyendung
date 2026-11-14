import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Spinner, ToastProvider, XacNhanProvider } from './components/ui'
import Apply from './portal/Apply'
import TraCuu from './portal/TraCuu'
import './styles/portal.css'

const AdminApp = lazy(() => import('./admin/AdminApp'))

function LenDau() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// Link cũ dạng #/... (tin nhắn hẹn PV đã gửi) => chuyển sang đường dẫn thường
function DoiLinkCu() {
  const nav = useNavigate()
  useEffect(() => {
    const h = window.location.hash
    if (h.startsWith('#/')) nav(h.slice(1).replace(/^\/quan-tri/, '/quantri'), { replace: true })
  }, [nav])
  return null
}

function TaiTrang() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}><Spinner size={28} /></div>
}

export default function App() {
  return (
    <BrowserRouter basename="/tuyendung">
      <LenDau />
      <DoiLinkCu />
      <ToastProvider>
        <XacNhanProvider>
          <Routes>
            <Route path="/" element={<Apply />} />
            <Route path="/tra-cuu" element={<TraCuu />} />
            <Route path="/quantri/*" element={<Suspense fallback={<TaiTrang />}><AdminApp /></Suspense>} />
            <Route path="/quan-tri/*" element={<Navigate to="/quantri" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </XacNhanProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
