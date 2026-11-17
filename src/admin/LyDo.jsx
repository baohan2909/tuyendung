import { useState } from 'react'
import { Check, ChevronDown, Lock, Plus, Search, X } from 'lucide-react'
import { khongDau } from '../lib/format'
import { Menu } from '../components/ui'

// Lý do không đạt — CHỈ lưu nội bộ, không bao giờ đưa vào email / trang tra cứu của ứng viên
export const LY_DO_NHOM = [
  { ten: 'Ngoại hình & tác phong', ds: ['Chưa phù hợp ngoại hình, tác phong', 'Trang phục, tác phong chưa chỉn chu'] },
  { ten: 'Giao tiếp & thái độ', ds: ['Giao tiếp chưa phù hợp', 'Thái độ chưa phù hợp', 'Thiếu nhiệt tình, chủ động'] },
  { ten: 'Kinh nghiệm & kỹ năng', ds: ['Chưa có kinh nghiệm bán hàng', 'Kỹ năng tư vấn còn yếu'] },
  { ten: 'Điều kiện làm việc', ds: ['Khu vực quá xa', 'Không sắp xếp được ca làm', 'Thu nhập không phù hợp', 'Không đúng độ tuổi'] },
  { ten: 'Liên lạc & hồ sơ', ds: ['Không liên lạc được', 'Không đến phỏng vấn', 'Hồ sơ chưa đủ ảnh/video', 'Trùng hồ sơ'] },
  { ten: 'Từ phía ứng viên', ds: ['Ứng viên từ chối', 'Đã nhận việc nơi khác'] }
]
const TAT_CA = LY_DO_NHOM.flatMap((n) => n.ds)
const HAY_DUNG = ['Chưa phù hợp ngoại hình, tác phong', 'Giao tiếp chưa phù hợp', 'Khu vực quá xa', 'Không liên lạc được']

// Chuỗi lưu: "Lý do A; Lý do B — ghi chú tự nhập"
export function tachLyDo(chuoi) {
  const s = String(chuoi || '').trim()
  if (!s) return { chon: [], ghi: '' }
  const [dau, ...sau] = s.split(' — ')
  const phan = dau.split(';').map((x) => x.trim()).filter(Boolean)
  if (phan.length && phan.every((x) => TAT_CA.includes(x))) return { chon: phan, ghi: sau.join(' — ') }
  return { chon: [], ghi: s }
}
export const ghepLyDo = (chon, ghi) => [chon.join('; '), String(ghi || '').trim() ? String(ghi) : ''].filter(Boolean).join(' — ')

export function LyDoTuChoi({ giaTri, onDoi, nhan = 'Lý do không đạt', tuDong }) {
  const [{ chon, ghi }, setGt] = useState(() => tachLyDo(giaTri))
  const [q, setQ] = useState('')
  const dat = (c, g) => { setGt({ chon: c, ghi: g }); onDoi(ghepLyDo(c, g)) }
  const doiChon = (v) => dat(chon.includes(v) ? chon.filter((x) => x !== v) : [...chon, v], ghi)
  const qq = khongDau(q.trim())
  return (
    <div className="ly-do">
      <div className="ly-do-dau">
        <span className="nhan-nhom" style={{ margin: 0 }}>{nhan}</span>
        <span className="ly-do-noi-bo"><Lock size={11} strokeWidth={2.6} />Chỉ lưu nội bộ · không gửi ứng viên</span>
      </div>
      <div className="ly-do-chon">
        {chon.map((v) => <button key={v} type="button" className="ly-do-chip" onClick={() => doiChon(v)}>{v}<X size={12} strokeWidth={2.6} /></button>)}
        <Menu canh="trai" rong={330} nut={<button type="button" className="ly-do-them"><Plus size={14} strokeWidth={2.6} />{chon.length ? 'Thêm lý do' : 'Chọn lý do'}<ChevronDown size={13} /></button>}>
          {() => (
            <div className="ly-do-menu">
              <label className="ly-do-tim"><Search size={14} /><input autoFocus placeholder="Tìm lý do…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
              <div className="ly-do-ds">
                {LY_DO_NHOM.map((n) => {
                  const ds = n.ds.filter((x) => !qq || khongDau(x).includes(qq))
                  if (!ds.length) return null
                  return (
                    <div key={n.ten}>
                      <div className="tieu">{n.ten}</div>
                      {ds.map((x) => (
                        <button key={x} type="button" className={'ly-do-o' + (chon.includes(x) ? ' on' : '')} onClick={() => doiChon(x)}>
                          <i className="o-tick">{chon.includes(x) && <Check size={12} strokeWidth={3} />}</i><span className="gian">{x}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Menu>
        {!chon.length && !ghi && HAY_DUNG.map((v) => <button key={v} type="button" className="ly-do-goi-y" onClick={() => doiChon(v)}>{v}</button>)}
      </div>
      <textarea className="ly-do-ghi" rows={2} value={ghi} maxLength={400} autoFocus={tuDong}
        onChange={(e) => dat(chon, e.target.value)}
        placeholder={chon.length ? 'Ghi chú thêm (không bắt buộc)…' : 'Hoặc tự nhập lý do cụ thể…'} />
    </div>
  )
}
