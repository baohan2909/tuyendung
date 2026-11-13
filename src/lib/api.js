// Lớp truy cập dữ liệu duy nhất của ứng dụng (Supabase hoặc bộ giả lập khi kiểm thử)
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY, BUCKET, STAFF_EMAIL_DOMAIN } from '../config'

const mock = typeof window !== 'undefined' ? window.__TD_MOCK__ : null
export const daCauHinh = !!mock || !(SUPABASE_URL.includes('__') || SUPABASE_KEY.includes('__'))

export const sb = !mock && daCauHinh
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ns-td-auth' },
      realtime: { params: { eventsPerSecond: 5 } }
    })
  : null

export class LoiApi extends Error {}

export function thongDiep(e) {
  const m = (e && (e.message || e.error_description || e.error || String(e))) || 'Có lỗi xảy ra'
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'Mất kết nối mạng. Vui lòng kiểm tra Internet và thử lại.'
  if (/JWT expired|invalid JWT|jwt/i.test(m)) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  if (/Invalid login credentials/i.test(m)) return 'Mã nhân viên hoặc mật khẩu không đúng.'
  if (/banned|User is banned/i.test(m)) return 'Tài khoản đã bị khóa. Liên hệ quản trị.'
  if (/row-level security|violates row-level/i.test(m)) return 'Không có quyền thực hiện thao tác này.'
  if (/permission denied/i.test(m)) return 'Bạn không có quyền thực hiện thao tác này.'
  if (/duplicate key/i.test(m)) return 'Dữ liệu bị trùng, vui lòng kiểm tra lại.'
  if (/Password should be|weak/i.test(m)) return 'Mật khẩu quá yếu (tối thiểu 8 ký tự, nên có chữ và số).'
  return m
}

const boc = (e) => new LoiApi(thongDiep(e))

// ---------- Hàm máy chủ ----------
export async function rpc(ten, thamSo) {
  if (mock) {
    try { return await mock.rpc(ten, thamSo || {}) } catch (e) { throw boc(e) }
  }
  if (!sb) throw new LoiApi('Hệ thống chưa được cấu hình kết nối máy chủ.')
  const { data, error } = await sb.rpc(ten, thamSo || {})
  if (error) throw boc(error)
  return data
}

// ---------- Bảng cấu hình (vi_tri, tieu_chi, nguon, cai_dat) ----------
export async function docBang(bang, sapXep) {
  if (mock) return mock.docBang(bang, sapXep)
  let q = sb.from(bang).select('*')
  for (const [cot, tang] of sapXep || []) q = q.order(cot, { ascending: tang })
  const { data, error } = await q
  if (error) throw boc(error)
  return data
}

export async function luuDong(bang, dong, khoa = 'id') {
  if (mock) return mock.luuDong(bang, dong, khoa)
  const { data, error } = await sb.from(bang).upsert(dong, { onConflict: khoa }).select().single()
  if (error) throw boc(error)
  return data
}

export async function themDong(bang, dong) {
  if (mock) return mock.luuDong(bang, dong, 'id')
  const { data, error } = await sb.from(bang).insert(dong).select().single()
  if (error) throw boc(error)
  return data
}

export async function xoaDong(bang, cot, giaTri) {
  if (mock) return mock.xoaDong(bang, cot, giaTri)
  const { error } = await sb.from(bang).delete().eq(cot, giaTri)
  if (error) throw boc(error)
}

// ---------- Đăng nhập nhân sự ----------
export const emailNhanSu = (ma) => String(ma || '').trim().toLowerCase() + '@' + STAFF_EMAIL_DOMAIN

export async function dangNhap(ma, matKhau) {
  if (mock) return mock.dangNhap(ma, matKhau)
  const { data, error } = await sb.auth.signInWithPassword({ email: emailNhanSu(ma), password: matKhau })
  if (error) throw boc(error)
  return data.session
}

export async function dangXuat() {
  if (mock) return mock.dangXuat()
  await sb.auth.signOut()
}

export async function layPhien() {
  if (mock) return mock.layPhien()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

export function nghePhien(cb) {
  if (mock) return mock.nghePhien ? mock.nghePhien(cb) : () => {}
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((_su_kien, phien) => cb(phien))
  return () => data.subscription.unsubscribe()
}

export async function doiMatKhau(matKhau) {
  if (mock) return true
  const { error } = await sb.auth.updateUser({ password: matKhau })
  if (error) throw boc(error)
  return true
}

// ---------- Kho tệp ----------
const boNho = new Map() // path -> { url, het }
let hangCho = new Map() // path -> [resolve, reject][]
let hen = null

async function xaHangCho() {
  const cho = hangCho
  hangCho = new Map()
  hen = null
  const ds = [...cho.keys()]
  try {
    let kq = {}
    if (mock) kq = await mock.kyUrl(ds)
    else {
      for (let i = 0; i < ds.length; i += 100) {
        const phan = ds.slice(i, i + 100)
        const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(phan, 3600)
        if (error) throw error
        for (const d of data || []) if (d.signedUrl) kq[d.path] = d.signedUrl
      }
    }
    const het = Date.now() + 3300 * 1000
    for (const [p, ham] of cho) {
      const url = kq[p] || null
      if (url) boNho.set(p, { url, het })
      ham.forEach(([ok]) => ok(url))
    }
  } catch (e) {
    for (const ham of cho.values()) ham.forEach(([, loi]) => loi(e))
  }
}

export function kyUrl(path) {
  if (!path) return Promise.resolve(null)
  const c = boNho.get(path)
  if (c && c.het > Date.now()) return Promise.resolve(c.url)
  return new Promise((ok, loi) => {
    if (!hangCho.has(path)) hangCho.set(path, [])
    hangCho.get(path).push([ok, loi])
    if (!hen) hen = setTimeout(xaHangCho, 25)
  })
}
export const urlCo = (path) => { const c = path && boNho.get(path); return c && c.het > Date.now() ? c.url : null }

export async function dsTep(thuMuc) {
  if (mock) return mock.dsTep ? mock.dsTep(thuMuc) : []
  const { data, error } = await sb.storage.from(BUCKET).list(thuMuc, { limit: 100 })
  if (error) throw boc(error)
  return (data || []).map((f) => thuMuc + '/' + f.name)
}

export async function xoaTep(paths) {
  if (!paths.length) return
  if (mock) return
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (error) throw boc(error)
  }
}

// ---------- Thời gian thực: hồ sơ mới ----------
export function ngheHoSo(cb) {
  if (mock) return mock.ngheHoSo ? mock.ngheHoSo(cb) : () => {}
  if (!sb) return () => {}
  const kenh = sb.channel('ho-so-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ho_so' }, (p) => cb(p.new))
    .subscribe()
  return () => { sb.removeChannel(kenh) }
}
