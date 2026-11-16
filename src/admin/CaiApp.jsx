import { useState } from 'react'
import { Download, Share, PlusSquare, MoreVertical, MonitorDown, Check, Copy, Compass, X, Smartphone, Monitor } from 'lucide-react'
import { useCaiApp } from '../lib/caiApp'
import { Modal, NonIcon, useToast } from '../components/ui'
import { useLS } from '../lib/hooks'

const BUOC = {
  ios: { ten: 'iPhone / iPad (Safari)', ic: Smartphone, ds: [
    [Share, 'Bấm nút Chia sẻ', 'Biểu tượng ô vuông có mũi tên lên, ở thanh dưới cùng (hoặc góc trên bên phải trên iPad).'],
    [PlusSquare, 'Chọn “Thêm vào MH chính”', 'Kéo danh sách xuống một chút nếu chưa thấy.'],
    [Check, 'Bấm “Thêm”', 'Biểu tượng NS Tuyển dụng sẽ xuất hiện trên màn hình chính.']] },
  ios_khac: { ten: 'iPhone (Chrome / Zalo / Facebook)', ic: Smartphone, ds: [
    [Compass, 'Mở trang bằng Safari', 'Bấm “Sao chép link” bên dưới rồi dán vào Safari (cài trên iPhone cần Safari).'],
    [Share, 'Bấm nút Chia sẻ', 'Ở thanh dưới cùng của Safari.'],
    [PlusSquare, 'Chọn “Thêm vào MH chính” → “Thêm”', '']] },
  in_app: { ten: 'Đang mở trong Zalo / Facebook', ic: Smartphone, ds: [
    [MoreVertical, 'Bấm ⋮ ở góc trên → “Mở bằng trình duyệt”', 'Hoặc sao chép link và mở bằng Chrome.'],
    [MoreVertical, 'Trong Chrome bấm ⋮ → “Cài đặt ứng dụng”', 'Một số máy ghi “Thêm vào màn hình chính”.'],
    [Check, 'Bấm “Cài đặt”', '']] },
  android: { ten: 'Android (Chrome)', ic: Smartphone, ds: [
    [MoreVertical, 'Bấm ⋮ ở góc trên bên phải', ''],
    [Download, 'Chọn “Cài đặt ứng dụng”', 'Một số máy ghi “Thêm vào màn hình chính”.'],
    [Check, 'Bấm “Cài đặt”', 'Ứng dụng có trong danh sách app và màn hình chính.']] },
  chrome: { ten: 'Máy tính (Google Chrome)', ic: Monitor, ds: [
    [MonitorDown, 'Bấm biểu tượng cài đặt trên thanh địa chỉ', 'Hình màn hình có mũi tên, nằm cuối thanh địa chỉ (bên phải).'],
    [MoreVertical, 'Không thấy? Bấm ⋮ → “Truyền, lưu và chia sẻ” → “Cài đặt trang…”', ''],
    [Check, 'Bấm “Cài đặt”', 'Ứng dụng mở thành cửa sổ riêng, có biểu tượng trên Desktop, Start và thanh Taskbar.']] },
  edge: { ten: 'Máy tính (Microsoft Edge)', ic: Monitor, ds: [
    [MonitorDown, 'Bấm biểu tượng “Ứng dụng có sẵn” trên thanh địa chỉ', 'Hoặc bấm … → Ứng dụng → “Cài đặt trang web này dưới dạng ứng dụng”.'],
    [Check, 'Bấm “Cài đặt”', 'Có thể ghim vào Taskbar và Start, tự mở khi khởi động máy nếu muốn.']] },
  mac_safari: { ten: 'Mac (Safari)', ic: Monitor, ds: [
    [Share, 'Menu Tệp (File) → “Thêm vào Dock”', 'Cần macOS Sonoma trở lên. Hoặc dùng Chrome để cài.'],
    [Check, 'Bấm “Thêm”', '']] },
  khac: { ten: 'Trình duyệt khác', ic: Monitor, ds: [
    [Compass, 'Mở bằng Google Chrome hoặc Microsoft Edge', 'Hai trình duyệt này hỗ trợ cài ứng dụng tốt nhất.'],
    [MonitorDown, 'Bấm biểu tượng cài đặt trên thanh địa chỉ → “Cài đặt”', '']] }
}

export function HuongDanCai({ mo, dong }) {
  const a = useCaiApp()
  const bao = useToast()
  const [chon, setChon] = useState(null)
  const k = chon || a.nenTang
  const b = BUOC[k] || BUOC.khac
  async function caiNgay() {
    const kq = await a.cai()
    if (kq === 'accepted') { bao('Đã cài NS Tuyển dụng'); dong() }
  }
  return (
    <Modal mo={mo} dong={dong} tieuDe="Tải ứng dụng NS Tuyển dụng" moTa="Mở nhanh như app, cửa sổ riêng, không cần gõ địa chỉ web">
      <div className="cai-app">
        <div className="cai-dau">
          <span className="cai-icon"><NonIcon size={30} stroke={2.2} /></span>
          <div className="gian"><b>NS Tuyển dụng</b><small>tuyendungns.nonson.vn · Nón Sơn</small></div>
          {a.daCai && <span className="cai-da"><Check size={13} strokeWidth={3} />Đã cài</span>}
        </div>

        {a.coNutCai && !a.daCai && (
          <button type="button" className="cai-nut-lon" onClick={caiNgay}>
            <span className="orb"><Download size={18} strokeWidth={2.4} /></span>
            <span className="gian"><b>Cài đặt ngay</b><small>1 chạm — trình duyệt sẽ hỏi xác nhận</small></span>
          </button>
        )}

        <div className="cai-tab" role="tablist">
          {[['chrome', 'Chrome PC'], ['edge', 'Edge PC'], ['ios', 'iPhone'], ['android', 'Android']].map(([v, t]) => (
            <button key={v} type="button" role="tab" aria-selected={k === v} className={k === v ? 'on' : ''} onClick={() => setChon(v)}>{t}</button>
          ))}
        </div>

        <p className="cai-ten-nt"><b.ic size={14} />{a.coNutCai && !chon ? 'Hoặc cài thủ công' : b.ten}</p>
        <ol className="cai-buoc">
          {b.ds.map(([Ic, t, m], i) => (
            <li key={i}>
              <span className="so">{i + 1}</span>
              <div className="gian"><b>{t}</b>{m && <small>{m}</small>}</div>
              <span className="ic"><Ic size={18} /></span>
            </li>
          ))}
        </ol>

        {(k === 'ios_khac' || k === 'in_app') && (
          <button type="button" className="btn mem md rong" onClick={() => navigator.clipboard?.writeText(location.origin + '/quantri').then(() => bao('Đã sao chép link'))}><Copy size={16} />Sao chép link</button>
        )}
        <p className="cai-ghi">Ứng dụng luôn tự cập nhật bản mới nhất. Dữ liệu và đăng nhập dùng chung với bản web.</p>
      </div>
    </Modal>
  )
}

// Mục "Tải ứng dụng" trong menu bên trái (ẩn khi đã cài)
export function MucCaiApp({ gon }) {
  const a = useCaiApp()
  const [mo, setMo] = useState(false)
  if (a.daCai) return null
  return (
    <>
      <button type="button" className="nav-item nav-cai" title={gon ? 'Tải ứng dụng' : undefined}
        onClick={async () => { if (a.coNutCai) { const kq = await a.cai(); if (kq) return } setMo(true) }}>
        <Download size={19} /><span className="an-gon">Tải ứng dụng</span>
      </button>
      <HuongDanCai mo={mo} dong={() => setMo(false)} />
    </>
  )
}

// Thẻ gợi ý cài trên điện thoại / máy tính (bấm X là ẩn hẳn)
export function GoiYCaiApp() {
  const a = useCaiApp()
  const [an, setAn] = useLS('ns-td-an-goi-y-cai', false)
  const [mo, setMo] = useState(false)
  if (a.daCai || an) return null
  return (
    <>
      <div className="goi-y-cai">
        <span className="cai-icon nho"><NonIcon size={20} stroke={2.2} /></span>
        <div className="gian"><b>Tải ứng dụng NS Tuyển dụng</b><small>Mở nhanh như một app trên máy</small></div>
        <button type="button" className="nut-cai" onClick={async () => { if (a.coNutCai) { const kq = await a.cai(); if (kq) return } setMo(true) }}><Download size={15} strokeWidth={2.5} />Cài</button>
        <button type="button" className="dong-x" aria-label="Ẩn gợi ý" onClick={() => setAn(true)}><X size={15} /></button>
      </div>
      <HuongDanCai mo={mo} dong={() => setMo(false)} />
    </>
  )
}
