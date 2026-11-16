// NS Tuyển Dụng — service worker tối giản: cho phép cài ứng dụng + mở nhanh.
// Trang (HTML) luôn lấy mới từ mạng (mất mạng mới dùng bản lưu); file /assets/* có mã băm nên lưu lâu dài.
// Không đụng tới Supabase / API (khác origin) — dữ liệu luôn là dữ liệu thật.
const BAN = 'ns-td-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== BAN).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (u.origin !== self.location.origin) return
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => {
      const ban = res.clone(); caches.open(BAN).then((c) => c.put('/index.html', ban)); return res
    }).catch(() => caches.match('/index.html')))
    return
  }
  if (u.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(r).then((c) => c || fetch(r).then((res) => {
      if (res.ok) { const ban = res.clone(); caches.open(BAN).then((k) => k.put(r, ban)) }
      return res
    })))
  }
})
