import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dangXuat, docBang, layPhien, nghePhien, ngheHoSo, rpc } from '../lib/api'
import { useToast } from '../components/ui'

const Ctx = createContext(null)
export const useStaff = () => useContext(Ctx)

export function StaffProvider({ children }) {
  const [phien, setPhien] = useState(undefined)
  const [toi, setToi] = useState(undefined)
  const [dm, setDm] = useState({ viTri: [], nguon: [], nhanSu: [], tieuChi: [], caiDat: {} })
  const [dem, setDem] = useState({})
  const [nhip, setNhip] = useState(0) // tăng khi có thay đổi từ máy chủ → trang tự làm mới
  const bao = useToast()
  const nav = useNavigate()
  const navRef = useRef(nav)
  navRef.current = nav

  useEffect(() => {
    let song = true
    layPhien().then((p) => { if (song) setPhien(p || null) })
    const huy = nghePhien((p) => setPhien(p || null))
    return () => { song = false; huy() }
  }, [])

  const uid = phien?.user?.id
  useEffect(() => {
    if (phien === undefined) return
    if (!uid) { setToi(null); return }
    setToi(undefined)
    rpc('td_toi').then((t) => setToi(t || null)).catch(() => setToi(null))
  }, [uid, phien === undefined])

  const taiDanhMuc = useCallback(async () => {
    const [viTri, nguon, tieuChi, caiDat, nhanSu] = await Promise.all([
      docBang('vi_tri', [['thu_tu', true], ['id', true]]),
      docBang('nguon', [['ten', true]]),
      docBang('tieu_chi', [['thu_tu', true], ['id', true]]),
      docBang('cai_dat'),
      rpc('td_ds_nhan_su')
    ])
    setDm({ viTri, nguon, tieuChi, nhanSu, caiDat: Object.fromEntries((caiDat || []).map((c) => [c.khoa, c.gia_tri])) })
  }, [])
  const taiDem = useCallback(() => rpc('td_ds_ho_so', { p: { so_dong: 1 } }).then((r) => setDem(r.dem || {})).catch(() => {}), [])

  useEffect(() => {
    if (!toi) return
    taiDanhMuc().catch(() => {})
    taiDem()
  }, [toi?.id, taiDanhMuc, taiDem])

  // thông báo hồ sơ mới theo thời gian thực
  useEffect(() => {
    if (!toi) return
    const daBao = new Set()
    let hen = null
    const huy = ngheHoSo((r) => {
      if (!r || !r.id) return
      clearTimeout(hen)
      hen = setTimeout(() => { setNhip((n) => n + 1); taiDem() }, 600)
      if (r.trang_thai === 'moi' && r.nop_luc && Date.now() - new Date(r.nop_luc).getTime() < 120000 && !daBao.has(r.id)) {
        daBao.add(r.id)
        bao('Hồ sơ mới: ' + r.ho_ten, 'hong', { ms: 7000, hanhDong: { ten: 'Xem', lam: () => navRef.current('/quantri/ung-vien/' + r.id) } })
      }
    })
    return () => { clearTimeout(hen); huy() }
  }, [toi?.id, bao, taiDem])

  const thoat = useCallback(async () => { await dangXuat(); setPhien(null); setToi(null) }, [])
  const vaiTro = toi?.vai_tro
  const gt = {
    phien, toi, vaiTro, dm, dem, nhip, taiDanhMuc, taiDem, thoat,
    lamMoi: () => { setNhip((n) => n + 1); taiDem() },
    coSua: vaiTro === 'quan_tri' || vaiTro === 'tuyen_dung',
    laQT: vaiTro === 'quan_tri',
    coCham: vaiTro && vaiTro !== 'xem',
    tenVT: (id) => dm.viTri.find((v) => v.id === id)?.ten || '—',
    tenNS: (id) => dm.nhanSu.find((v) => v.id === id)?.ho_ten || '—'
  }
  return <Ctx.Provider value={gt}>{children}</Ctx.Provider>
}
