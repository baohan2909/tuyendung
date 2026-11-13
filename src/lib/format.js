// Định dạng ngày giờ, tên, số — theo giờ Việt Nam
const TZ = 'Asia/Ho_Chi_Minh'

const ngayFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
const ngayNganFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit' })
const gioFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const partsFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })

const d = (x) => (x instanceof Date ? x : new Date(x))
export const fmtNgay = (x) => (x ? ngayFmt.format(d(x)) : '—')
export const fmtNgayNgan = (x) => { if (!x) return '—'; const s = ngayVN(x); return s.slice(8, 10) + '/' + s.slice(5, 7) }
export const fmtGio = (x) => (x ? gioFmt.format(d(x)) : '—')
export const fmtNgayGio = (x) => (x ? fmtGio(x) + ' · ' + fmtNgay(x) : '—')

// Ngày (YYYY-MM-DD) theo giờ VN
export function ngayVN(x = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(d(x)).map((v) => [v.type, v.value]))
  return p.year + '-' + p.month + '-' + p.day
}
export function gioVN(x = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(d(x)).map((v) => [v.type, v.value]))
  return Number(p.hour === '24' ? 0 : p.hour)
}

const THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export function thu(x, ngan) {
  const s = ngayVN(x)
  const w = new Date(s + 'T00:00:00Z').getUTCDay()
  return (ngan ? THU_NGAN : THU)[w]
}
export function ngayDai(x = new Date()) {
  const s = ngayVN(x)
  const [y, m, dd] = s.split('-')
  return thu(x) + ', ' + dd + '/' + m + '/' + y
}

// Cộng ngày cho chuỗi YYYY-MM-DD
export function congNgay(s, n) {
  const t = new Date(s + 'T00:00:00Z')
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
export function dauTuan(s) {
  const t = new Date(s + 'T00:00:00Z')
  const w = (t.getUTCDay() + 6) % 7
  return congNgay(s, -w)
}
export const nhanNgay = (s) => { const [y, m, dd] = s.split('-'); return dd + '/' + m + (y ? '' : '') }

// Chuỗi ngày + giờ VN → ISO (giờ VN = UTC+7, không đổi giờ mùa hè)
export const isoTuVN = (ngay, gio) => new Date(ngay + 'T' + (gio || '00:00') + ':00+07:00').toISOString()

export function tuongDoi(x) {
  if (!x) return '—'
  const giay = (Date.now() - d(x).getTime()) / 1000
  if (giay < 0) {
    const s = -giay
    if (s < 3600) return 'sau ' + Math.max(1, Math.round(s / 60)) + ' phút'
    if (s < 86400) return 'sau ' + Math.round(s / 3600) + ' giờ'
    return 'sau ' + Math.round(s / 86400) + ' ngày'
  }
  if (giay < 60) return 'vừa xong'
  if (giay < 3600) return Math.round(giay / 60) + ' phút'
  if (giay < 86400) return Math.round(giay / 3600) + ' giờ'
  if (giay < 86400 * 7) return Math.round(giay / 86400) + ' ngày'
  return fmtNgayNgan(x)
}

export function chaoTheoGio() {
  const h = gioVN()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export function tuoi(ngaySinh) {
  if (!ngaySinh) return null
  const [y, m, dd] = ngaySinh.split('-').map(Number)
  const [ny, nm, nd] = ngayVN().split('-').map(Number)
  return ny - y - (nm < m || (nm === m && nd < dd) ? 1 : 0)
}

export function chuCai(ten) {
  const t = String(ten || '').trim().split(/\s+/).filter(Boolean)
  if (!t.length) return '?'
  if (t.length === 1) return t[0].slice(0, 2).toUpperCase()
  return (t[0][0] + t[t.length - 1][0]).toUpperCase()
}
export const tenGoi = (ten) => { const t = String(ten || '').trim().split(/\s+/); return t[t.length - 1] || '' }

export const fmtSdt = (s) => (s ? String(s).replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3') : '')
export const fmtGiay = (g) => { if (g == null) return ''; const s = Math.round(g); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
export const fmtMB = (b) => (b == null ? '' : b >= 1048576 ? (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB')
export const fmtDiem = (x) => (x == null ? '—' : Number(x).toFixed(1).replace('.', ','))
export const fmtSo = (n) => (n == null ? '—' : new Intl.NumberFormat('vi-VN').format(n))
export const phanTram = (a, b) => (b ? Math.round((a / b) * 100) : 0)

const NGUON = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ'
const DICH = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
export function khongDau(s) {
  let r = ''
  for (const c of String(s || '').normalize('NFC').toLowerCase()) { const i = NGUON.indexOf(c); r += i >= 0 ? DICH[i] : c }
  return r
}

// Màu avatar ổn định theo tên
const MAU_AV = [['#FDE6F1', '#A3004F'], ['#EAF0FD', '#2E5BC9'], ['#E3F5EE', '#0E7F63'], ['#FDF3E3', '#8A5410'], ['#EFE8FB', '#5B2A9E'], ['#F4F1F5', '#4A4452']]
export function mauAv(s) {
  let h = 0
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return MAU_AV[h % MAU_AV.length]
}
