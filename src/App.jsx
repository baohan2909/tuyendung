import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
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

function TaiTrang() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}><Spinner size={28} /></div>
}

export default function App() {
  return (
    <HashRouter>
      <LenDau />
      <ToastProvider>
        <XacNhanProvider>
          <Routes>
            <Route path="/" element={<Apply />} />
            <Route path="/tra-cuu" element={<TraCuu />} />
            <Route path="/quan-tri/*" element={<Suspense fallback={<TaiTrang />}><AdminApp /></Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </XacNhanProvider>
      </ToastProvider>
    </HashRouter>
  )
}
