// Tải tệp của ứng viên lên kho Supabase: tệp nhỏ tải 1 lần (có % tiến độ), tệp lớn tải tiếp nối (TUS) chống rớt mạng
import * as tus from 'tus-js-client'
import { SUPABASE_URL, SUPABASE_KEY, BUCKET } from '../config'

const CHUNK = 6 * 1024 * 1024
const tonTai = (s) => /already exists|Duplicate|409/i.test(s || '')

function taiThuong(path, blob, loai, onTienDo, tinHieu) {
  return new Promise((ok, loi) => {
    const x = new XMLHttpRequest()
    x.open('POST', SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path)
    x.setRequestHeader('authorization', 'Bearer ' + SUPABASE_KEY)
    x.setRequestHeader('apikey', SUPABASE_KEY)
    x.setRequestHeader('x-upsert', 'false')
    x.setRequestHeader('cache-control', 'max-age=3600')
    x.setRequestHeader('content-type', loai)
    x.upload.onprogress = (e) => { if (e.lengthComputable) onTienDo && onTienDo(e.loaded / e.total) }
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return ok()
      if (tonTai(x.responseText) || x.status === 409) return ok()
      let m = 'Tải tệp thất bại (' + x.status + ')'
      try { const j = JSON.parse(x.responseText); m = j.message || j.error || m } catch (e) { /* bỏ qua */ }
      if (/row-level security|Unauthorized|403/i.test(m)) m = 'Phiên nộp hồ sơ đã hết hạn. Vui lòng tải lại trang.'
      if (/maximum allowed size|too large|413/i.test(m) || x.status === 413) m = 'Tệp quá lớn so với giới hạn cho phép.'
      if (/mime type|not supported/i.test(m)) m = 'Định dạng tệp không được hỗ trợ.'
      loi(new Error(m))
    }
    x.onerror = () => loi(new Error('Mất kết nối khi tải tệp. Vui lòng thử lại.'))
    if (tinHieu) tinHieu.addEventListener('abort', () => x.abort())
    x.onabort = () => loi(new Error('Đã hủy'))
    x.send(blob)
  })
}

function taiTiepNoi(path, blob, loai, onTienDo, tinHieu) {
  return new Promise((ok, loi) => {
    const up = new tus.Upload(blob, {
      endpoint: SUPABASE_URL + '/storage/v1/upload/resumable',
      retryDelays: [0, 1500, 3000, 6000, 10000, 20000],
      headers: { authorization: 'Bearer ' + SUPABASE_KEY, apikey: SUPABASE_KEY, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: BUCKET, objectName: path, contentType: loai, cacheControl: '3600' },
      chunkSize: CHUNK,
      onError: (e) => {
        const m = String((e && e.message) || e)
        if (tonTai(m)) return ok()
        if (/row-level security|403/i.test(m)) return loi(new Error('Phiên nộp hồ sơ đã hết hạn. Vui lòng tải lại trang.'))
        if (/413|too large|maximum/i.test(m)) return loi(new Error('Video quá lớn so với giới hạn cho phép.'))
        loi(new Error('Mất kết nối khi tải video. Vui lòng thử lại.'))
      },
      onProgress: (a, b) => onTienDo && onTienDo(b ? a / b : 0),
      onSuccess: () => ok()
    })
    if (tinHieu) tinHieu.addEventListener('abort', () => { up.abort(true); loi(new Error('Đã hủy')) })
    up.findPreviousUploads().then((cu) => { if (cu.length) up.resumeFromPreviousUpload(cu[0]); up.start() })
  })
}

// Bộ giả lập khi kiểm thử giao diện
function taiGia(onTienDo) {
  return new Promise((ok) => {
    let p = 0
    const t = setInterval(() => { p += 0.25; onTienDo && onTienDo(Math.min(1, p)); if (p >= 1) { clearInterval(t); ok() } }, 120)
  })
}

export function taiLen({ path, blob, loai, onTienDo, tinHieu }) {
  if (typeof window !== 'undefined' && window.__TD_MOCK__) return taiGia(onTienDo)
  if (blob.size > CHUNK) return taiTiepNoi(path, blob, loai, onTienDo, tinHieu)
  return taiThuong(path, blob, loai, onTienDo, tinHieu)
}
