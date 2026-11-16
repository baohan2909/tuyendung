// Cài ứng dụng (PWA): bắt sự kiện cài của trình duyệt + đăng ký service worker
import { useEffect, useState } from 'react'

let suKien = null
const nghe = new Set()
const bao = () => nghe.forEach((f) => f())

export function ghiNhanCaiApp() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); suKien = e; bao() })
  window.addEventListener('appinstalled', () => { suKien = null; bao() })
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

export const daCai = () => typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: window-controls-overlay)').matches || window.navigator.standalone === true)

export function nenTang() {
  const ua = navigator.userAgent || ''
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return /CriOS|FxiOS|EdgiOS|Zalo|FBAN|FBAV|Instagram/.test(ua) ? 'ios_khac' : 'ios'
  if (/Zalo|FBAN|FBAV|Instagram/.test(ua)) return 'in_app'
  if (/Android/.test(ua)) return 'android'
  if (/Edg\//.test(ua)) return 'edge'
  if (/Chrome\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua) && /Macintosh/.test(ua)) return 'mac_safari'
  return 'khac'
}

export function useCaiApp() {
  const [, setN] = useState(0)
  useEffect(() => { const f = () => setN((x) => x + 1); nghe.add(f); return () => nghe.delete(f) }, [])
  return {
    daCai: daCai(),
    coNutCai: !!suKien,
    nenTang: nenTang(),
    async cai() {
      if (!suKien) return null
      const e = suKien
      e.prompt()
      const kq = await e.userChoice.catch(() => null)
      suKien = null; bao()
      return kq?.outcome || null
    }
  }
}
