import { useState } from 'react'
import { ArrowRight, CalendarX2, LogOut, Store, UserX } from 'lucide-react'
import { rpc } from '../lib/api'
import { congNgay, ngayVN, thu } from '../lib/format'
import { Bao, Btn, Field, Modal, useToast } from '../components/ui'
import { ghepLyDo } from './LyDo'

export const LY_DO_NGHI = ['Không phù hợp công việc', 'Công việc áp lực / vất vả', 'Thu nhập chưa như mong muốn', 'Đi lại xa',
  'Lý do gia đình', 'Lý do sức khỏe', 'Có việc làm khác', 'Thời gian không phù hợp (đi học…)', 'Tự ý nghỉ, không báo', 'Vi phạm nội quy']
export const LY_DO_KHONG_DEN = ['Không liên lạc được', 'Đổi ý, không nhận việc', 'Đã nhận việc nơi khác', 'Lý do cá nhân / gia đình', 'Không đến, không báo trước', 'Cửa hàng / ca làm không phù hợp']
export const NGHI_SOM = 3 // nghỉ trong ≤ 3 ngày làm việc = nghỉ sớm

const dm = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '—')
const ngayDu = (d) => (d ? thu(d + 'T12:00:00+07:00', true) + ' ' + dm(d) + '/' + d.slice(0, 4) : '—')
const soNgay = (a, b) => (a && b ? Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5) : null)

function tach(chuoi, ds) {
  const s = String(chuoi || '').trim()
  if (!s) return { chon: [], ghi: '' }
  const [dau, ...sau] = s.split(' — ')
  const phan = dau.split(';').map((x) => x.trim()).filter(Boolean)
  if (phan.length && phan.every((x) => ds.includes(x))) return { chon: phan, ghi: sau.join(' — ') }
  return { chon: [], ghi: s }
}

function ChonLyDo({ ds, giaTri, onDoi, goiY }) {
  const [{ chon, ghi }] = useState(() => tach(giaTri, ds))
  const [c, setC] = useState(chon)
  const [g, setG] = useState(ghi)
  const doi = (c2, g2) => { setC(c2); setG(g2); onDoi(ghepLyDo(c2, g2)) }
  return (
    <div className="nv-ly-do">
      <div className="chips">
        {ds.map((x) => <button key={x} type="button" className={'chip sm' + (c.includes(x) ? ' on' : '')} onClick={() => doi(c.includes(x) ? c.filter((y) => y !== x) : [...c, x], g)}>{x}</button>)}
      </div>
      <textarea className="ly-do-ghi" rows={2} value={g} onChange={(e) => doi(c, e.target.value)} placeholder={goiY} maxLength={400} />
    </div>
  )
}

/* ---------- Nghỉ việc ---------- */
export function NghiViecModal({ h, dong, xong }) {
  const bao = useToast()
  const hn = ngayVN()
  const sua = h.trang_thai === 'nghi_viec'
  const [bd, setBd] = useState(h.ngay_bat_dau_lam || h.ngay_nhan_viec || hn)
  const [ng, setNg] = useState(h.ngay_nghi_viec || hn)
  const [tuSo, setTuSo] = useState(sua && h.so_ngay_lam != null && h.so_ngay_lam !== soNgay(h.ngay_bat_dau_lam, h.ngay_nghi_viec))
  const [so, setSo] = useState(h.so_ngay_lam ?? '')
  const [lyDo, setLyDo] = useState(h.ly_do_nghi_viec || '')
  const [ghi, setGhi] = useState('')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const tinh = soNgay(bd, ng)
  const max = tinh == null ? null : tinh + 1
  const soThuc = tuSo && so !== '' ? Number(so) : tinh
  const sai = tinh != null && tinh < 0
  const som = soThuc != null && soThuc >= 0 && soThuc <= NGHI_SOM

  async function luu() {
    setLoi(null)
    if (!bd || !ng) return setLoi('Nhập đủ ngày bắt đầu và ngày nghỉ việc.')
    if (sai) return setLoi('Ngày nghỉ việc không được trước ngày bắt đầu làm việc.')
    if (tuSo && (so === '' || Number(so) < 0 || Number(so) > max)) return setLoi('Số ngày đã làm phải từ 0 đến ' + max + ' ngày.')
    if (!lyDo.trim()) return setLoi('Chọn hoặc nhập lý do nghỉ việc.')
    setDang(true)
    try {
      const r = await rpc('td_nghi_viec', { p_id: h.id, p: { ngay_bat_dau: bd, ngay_nghi: ng, so_ngay_lam: tuSo ? Number(so) : null, ly_do: lyDo, ghi_chu: ghi || null } })
      bao((sua ? 'Đã cập nhật nghỉ việc' : 'Đã chuyển sang Đã nghỉ việc') + ' · làm ' + r.so_ngay_lam + ' ngày')
      xong()
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }

  return (
    <Modal mo rong dong={dong} tieuDe={sua ? 'Cập nhật thông tin nghỉ việc' : 'Nhân sự nghỉ việc'} moTa={h.ho_ten + (h.noi_lam_viec ? ' · ' + h.noi_lam_viec : '')}
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={LogOut} loading={dang} onClick={luu}>{sua ? 'Lưu thay đổi' : 'Xác nhận nghỉ việc'}</Btn></>}>
      <div className="sua-td">
        <div className={'nv-tom' + (som ? ' som' : '')}>
          <div className="nv-so"><b>{sai || soThuc == null ? '—' : soThuc}</b><span>ngày đã làm</span></div>
          <div className="nv-moc">
            <span><small>Bắt đầu làm</small><b>{ngayDu(bd)}</b></span>
            <ArrowRight size={16} />
            <span><small>Nghỉ từ ngày</small><b>{ngayDu(ng)}</b></span>
          </div>
          {som && !sai && <span className="nv-nhan-som">Nghỉ sớm · trong {NGHI_SOM} ngày đầu</span>}
        </div>

        <section className="std-khoi">
          <h3>Thời gian làm việc</h3>
          <div className="luoi-2">
            <Field kieu="gon" nhan="Ngày bắt đầu làm việc" type="date" value={bd} max={ng || undefined} onChange={(e) => setBd(e.target.value)} />
            <Field kieu="gon" nhan="Ngày nghỉ việc (ngày đầu không còn đi làm)" type="date" value={ng} min={bd || undefined} onChange={(e) => setNg(e.target.value)} />
          </div>
          <div className="chips">
            {[[0, 'Nghỉ ngay ngày đầu'], [1, 'Làm 1 ngày'], [2, 'Làm 2 ngày'], [3, 'Làm 3 ngày']].map(([n, t]) => {
              const v = bd ? congNgay(bd, n) : null
              return <button key={n} type="button" className={'chip sm' + (v && ng === v && !tuSo ? ' on' : '')} disabled={!bd} onClick={() => { setNg(v); setTuSo(false) }}>{t}</button>
            })}
            <button type="button" className={'chip sm' + (ng === hn ? ' on' : '')} onClick={() => setNg(hn)}>Nghỉ từ hôm nay</button>
          </div>
          <label className="hang nv-tu-so">
            <input type="checkbox" checked={tuSo} onChange={(e) => { setTuSo(e.target.checked); if (e.target.checked && so === '') setSo(tinh ?? '') }} />
            <span className="gian">Điều chỉnh số ngày làm thực tế <small>(khi có ngày nghỉ xen giữa)</small></span>
            {tuSo && <input className="nv-o-so" type="number" min={0} max={max ?? undefined} value={so} onChange={(e) => setSo(e.target.value)} aria-label="Số ngày đã làm" />}
          </label>
          <p className="nho muted std-goi-y">Số ngày tự tính = ngày nghỉ việc − ngày bắt đầu. VD: bắt đầu 10/11, nghỉ từ 12/11 → đã làm 2 ngày.</p>
        </section>

        <section className="std-khoi">
          <h3>Lý do nghỉ việc</h3>
          <ChonLyDo ds={LY_DO_NGHI} giaTri={lyDo} onDoi={setLyDo} goiY="Ghi cụ thể hơn (không bắt buộc nếu đã chọn lý do)…" />
        </section>

        <section className="std-khoi">
          <Field kieu="gon" nhan="Ghi chú (ghi vào lịch sử, không bắt buộc)" value={ghi} onChange={(e) => setGhi(e.target.value)} maxLength={300} placeholder="VD: Cửa hàng trưởng báo qua Zalo" />
          <p className="nho muted std-goi-y"><Store size={13} />Hồ sơ và toàn bộ lịch sử tuyển dụng được giữ nguyên. Nhập nhầm có thể bấm “Hủy nghỉ việc”.</p>
        </section>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}

/* ---------- Không đến nhận việc ---------- */
export function KhongDenModal({ h, dong, xong }) {
  const bao = useToast()
  const sua = h.trang_thai === 'khong_den'
  const [lyDo, setLyDo] = useState(h.ly_do_khong_den || '')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  async function luu() {
    setLoi(null)
    setDang(true)
    try {
      await rpc('td_khong_den', { p_id: h.id, p: { ly_do: lyDo || null } })
      bao(sua ? 'Đã cập nhật lý do' : 'Đã chuyển sang Không đến nhận việc')
      xong()
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <Modal mo dong={dong} tieuDe="Không đến nhận việc" moTa={h.ho_ten}
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={UserX} loading={dang} onClick={luu}>{sua ? 'Lưu' : 'Xác nhận'}</Btn></>}>
      <div className="sua-td">
        <div className="nv-tom hen">
          <CalendarX2 size={22} />
          <div className="nv-moc">
            <span><small>Đã hẹn nhận việc</small><b>{ngayDu(h.ngay_nhan_viec)}{h.gio_nhan_viec ? ' · ' + String(h.gio_nhan_viec).slice(0, 5) : ''}</b></span>
            <span><small>Cửa hàng</small><b>{h.noi_lam_viec || '—'}</b></span>
          </div>
        </div>
        <section className="std-khoi">
          <h3>Lý do (không bắt buộc)</h3>
          <ChonLyDo ds={LY_DO_KHONG_DEN} giaTri={lyDo} onDoi={setLyDo} goiY="Ghi thêm nếu cần…" />
        </section>
        <p className="nho muted std-goi-y" style={{ padding: '0 4px' }}>Email trúng tuyển đang chờ gửi (nếu có) sẽ tự hủy. Nếu ứng viên đến muộn, bấm “Xác nhận nhận việc” như bình thường.</p>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}
