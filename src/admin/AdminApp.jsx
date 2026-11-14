import { Navigate, Route, Routes } from 'react-router-dom'
import { StaffProvider } from './context'
import AdminLayout from './Layout'
import Dashboard from './Dashboard'
import Candidates from './Candidates'
import Profile from './Profile'
import Scorecard from './Scorecard'
import Pipeline from './Pipeline'
import Interviews from './Interviews'
import Positions from './Positions'
import Reports from './Reports'
import Settings from './Settings'
import SangLoc from './SangLoc'
import NhatKy from './NhatKy'
import { ChiTietNhanVien, DsNhanVien } from './NhanVien'
import '../styles/admin.css'

export default function AdminApp() {
  return (
    <StaffProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="ung-vien" element={<Candidates />} />
          <Route path="ung-vien/:id" element={<Profile />} />
          <Route path="ung-vien/:id/cham" element={<Scorecard />} />
          <Route path="quy-trinh" element={<Pipeline />} />
          <Route path="phong-van" element={<Interviews />} />
          <Route path="vi-tri" element={<Positions />} />
          <Route path="bao-cao" element={<Reports />} />
          <Route path="cai-dat" element={<Settings />} />
          <Route path="sang-loc" element={<SangLoc />} />
          <Route path="nhan-vien" element={<DsNhanVien />} />
          <Route path="nhan-vien/:id" element={<ChiTietNhanVien />} />
          <Route path="nhat-ky" element={<NhatKy />} />
          <Route path="*" element={<Navigate to="/quan-tri" replace />} />
        </Route>
      </Routes>
    </StaffProvider>
  )
}
