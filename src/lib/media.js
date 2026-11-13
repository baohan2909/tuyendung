// Xử lý ảnh/video ngay trên điện thoại: nén ảnh, tạo ảnh nhỏ, lấy thời lượng + ảnh bìa video

async function moAnh(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch (e) { /* thử cách khác */ }
  }
  return await new Promise((ok, loi) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    img.onerror = () => { URL.revokeObjectURL(url); loi(new Error('Không đọc được ảnh')) }
    img.src = url
  })
}

function veJpeg(nguon, w, h, chatLuong) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, w, h)
  g.drawImage(nguon, 0, 0, w, h)
  return new Promise((ok, loi) => c.toBlob((b) => (b ? ok(b) : loi(new Error('Không nén được ảnh'))), 'image/jpeg', chatLuong))
}

const coKichThuoc = (nguon) => [nguon.width || nguon.naturalWidth, nguon.height || nguon.naturalHeight]
const thuNho = (w, h, canh) => { const k = Math.min(1, canh / Math.max(w, h)); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))] }

// Trả về { lon: Blob, nho: Blob, w, h } — lỗi giải mã (VD: HEIC trên Chrome) => null để dùng tệp gốc
export async function xuLyAnh(file, canhLon = 1600, canhNho = 420) {
  try {
    const nguon = await moAnh(file)
    const [w, h] = coKichThuoc(nguon)
    const [w1, h1] = thuNho(w, h, canhLon)
    const [w2, h2] = thuNho(w, h, canhNho)
    let lon = await veJpeg(nguon, w1, h1, 0.86)
    if (lon.size > file.size && /jpe?g/i.test(file.type) && Math.max(w, h) <= canhLon) lon = file
    const nho = await veJpeg(nguon, w2, h2, 0.8)
    if (nguon.close) nguon.close()
    return { lon, nho, w, h }
  } catch (e) {
    return null
  }
}

// Thời lượng + ảnh bìa video (có thể không lấy được trên một số máy — khi đó bỏ qua)
export function thongTinVideo(file) {
  return new Promise((ok) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    let xong = false
    const ket = (kq) => { if (xong) return; xong = true; clearTimeout(t); v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); ok(kq) }
    const t = setTimeout(() => ket({ thoiLuong: isFinite(v.duration) ? v.duration : null, bia: null }), 9000)
    v.muted = true
    v.playsInline = true
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      const tl = isFinite(v.duration) ? v.duration : null
      try { v.currentTime = Math.min(1, (tl || 2) / 3) } catch (e) { ket({ thoiLuong: tl, bia: null }) }
    }
    v.onseeked = async () => {
      try {
        const [w, h] = thuNho(v.videoWidth || 640, v.videoHeight || 360, 640)
        const bia = await veJpeg(v, w, h, 0.78)
        ket({ thoiLuong: isFinite(v.duration) ? v.duration : null, bia })
      } catch (e) { ket({ thoiLuong: isFinite(v.duration) ? v.duration : null, bia: null }) }
    }
    v.onerror = () => ket({ thoiLuong: null, bia: null })
    v.src = url
  })
}

export function duoiTep(file, macDinh) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(file.name || '')
  const d = m ? m[1].toLowerCase() : ''
  if (d === 'jpeg') return 'jpg'
  return d || macDinh
}

const MIME_VIDEO = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', m4v: 'video/x-m4v', mpeg: 'video/mpeg', mpg: 'video/mpeg' }
export function mimeVideo(file) {
  if (file.type && file.type.startsWith('video/')) return file.type === 'video/x-matroska' ? 'video/webm' : file.type
  return MIME_VIDEO[duoiTep(file, 'mp4')] || 'video/mp4'
}
