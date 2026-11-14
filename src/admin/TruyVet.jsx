import { Link } from 'react-router-dom'
import { Check, ClipboardCheck, FileText, Gavel, History, Minus, Store, Filter } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { fmtDiem, fmtNgay, fmtNgayGio } from '../lib/format'
import { KET_LUAN, GD } from '../lib/stages'
import { useStaff } from './context'

// Truy vết trách nhiệm theo từng bước: ai làm, kết quả gì, lúc nào
export default function TruyVet({ id, nhip }) {
  const s = useStaff()
  const { data: t } = useAsync(() => rpc('td_truy_vet', { p_ho_so_id: id }), [id, nhip])
  if (!t) return null
  const buoc = [
    { ic: FileText, ten: 'Nộp hồ sơ', ai: 'Ứng viên', khi: t.nop_luc, xong: true },
    { ic: Filter, ten: 'Sàng lọc hồ sơ', ai: t.sang_loc?.nguoi, khi: t.sang_loc?.luc, xong: !!t.sang_loc?.nguoi,
      kq: t.sang_loc?.ket_qua === 'qua' ? ['Qua', 'var(--ok)'] : t.sang_loc?.ket_qua === 'khong_qua' ? ['Không qua', 'var(--err)'] : null },
    ...((t.phong_van || []).length ? t.phong_van.map((p) => ({ ic: ClipboardCheck, ten: 'Phỏng vấn online · chấm ' + fmtDiem(p.diem) + '/10', ai: p.nguoi, khi: p.luc, xong: true,
      kq: p.ket_luan ? [KET_LUAN[p.ket_luan]?.ten, p.ket_luan === 'dat' ? 'var(--ok)' : p.ket_luan === 'khong_dat' ? 'var(--err)' : 'var(--muted-2)'] : null }))
      : [{ ic: ClipboardCheck, ten: 'Phỏng vấn online', xong: false }]),
    { ic: Gavel, ten: 'Chốt kết quả', ai: t.chot?.nguoi, khi: t.chot?.luc, xong: !!t.chot?.nguoi,
      kq: t.chot?.ket_qua ? [GD[t.chot.ket_qua]?.ten, t.chot.ket_qua === 'khong_dat' ? 'var(--err)' : 'var(--ok)'] : null },
    { ic: Store, ten: t.nhan_vien ? 'Nhận việc · ' + (t.nhan_vien.cua_hang || '') : 'Nhận việc & phân công', ai: t.nhan_vien?.nguoi, khi: t.nhan_vien?.luc, xong: !!t.nhan_vien,
      phu: t.nhan_vien ? 'Bắt đầu ' + fmtNgay(t.nhan_vien.ngay + 'T12:00:00+07:00') + (t.nhan_vien.so_lan_dieu_chuyen > 0 ? ' · ' + t.nhan_vien.so_lan_dieu_chuyen + ' lần điều chuyển' : '') : null }
  ]
  return (
    <section className="card">
      <div className="dau-the"><h2>Truy vết xử lý</h2>{(s.vaiTro === 'quan_tri' || s.vaiTro === 'tuyen_dung') && <Link to={'/quantri/nhat-ky?ho_so=' + id} className="nho dam hang" style={{ gap: 5 }}><History size={14} />Nhật ký chi tiết</Link>}</div>
      <div className="dong-thoi-gian">
        {buoc.map((b, i) => (
          <div key={i} className="m">
            <span className="ic" style={b.xong ? { background: 'var(--ink)', color: '#fff' } : null}>{b.xong ? <b.ic size={15} /> : <Minus size={15} />}</span>
            <div className="nd">
              <p style={{ color: b.xong ? undefined : 'var(--muted)' }}>{b.ten}{b.kq && <span style={{ color: b.kq[1], marginLeft: 6 }}>· {b.kq[0]}</span>}</p>
              <span>{b.xong ? (b.ai || '—') + (b.khi ? ' · ' + fmtNgayGio(b.khi) : '') : 'Chưa thực hiện'}{b.phu ? ' · ' + b.phu : ''}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
