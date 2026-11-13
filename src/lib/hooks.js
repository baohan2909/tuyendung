import { useCallback, useEffect, useRef, useState } from 'react'
import { kyUrl, urlCo } from './api'

// Gọi dữ liệu bất đồng bộ: { data, loading, error, reload, setData }
export function useAsync(ham, phuThuoc = []) {
  const [st, setSt] = useState({ data: undefined, loading: true, error: null })
  const lan = useRef(0)
  const chay = useCallback((im) => {
    const id = ++lan.current
    if (!im) setSt((s) => ({ ...s, loading: true, error: null }))
    return Promise.resolve()
      .then(ham)
      .then((data) => { if (id === lan.current) setSt({ data, loading: false, error: null }) })
      .catch((error) => { if (id === lan.current) setSt((s) => ({ ...s, loading: false, error })) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, phuThuoc)
  useEffect(() => { chay() }, [chay])
  const setData = useCallback((f) => setSt((s) => ({ ...s, data: typeof f === 'function' ? f(s.data) : f })), [])
  return { ...st, reload: chay, setData }
}

export function useDebounced(giaTri, ms = 300) {
  const [v, setV] = useState(giaTri)
  useEffect(() => { const t = setTimeout(() => setV(giaTri), ms); return () => clearTimeout(t) }, [giaTri, ms])
  return v
}

export function useLS(khoa, macDinh) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(khoa); return s == null ? macDinh : JSON.parse(s) } catch (e) { return macDinh }
  })
  useEffect(() => { try { localStorage.setItem(khoa, JSON.stringify(v)) } catch (e) { /* bỏ qua */ } }, [khoa, v])
  return [v, setV]
}

export function useMedia(q) {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setOk(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return ok
}

// URL ký tạm cho ảnh/video trong kho riêng tư
export function useSignedUrl(path) {
  const [url, setUrl] = useState(() => urlCo(path))
  useEffect(() => {
    let song = true
    if (!path) { setUrl(null); return }
    const co = urlCo(path)
    if (co) { setUrl(co); return }
    kyUrl(path).then((u) => { if (song) setUrl(u) }).catch(() => { if (song) setUrl(null) })
    return () => { song = false }
  }, [path])
  return url
}

export function usePhim(phim, ham, bat = true) {
  const ref = useRef(ham)
  ref.current = ham
  useEffect(() => {
    if (!bat) return
    const f = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (phim.includes(e.key)) ref.current(e)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [phim.join(','), bat])
}
