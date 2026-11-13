import { useState } from 'react'
import { Check } from 'lucide-react'
import { rpc } from '../lib/api'
import { GIAI_DOAN } from '../lib/stages'
import { Btn, Chips, Field, Menu, Modal, useToast } from '../components/ui'

const LY_DO = ['Chưa phù hợp yêu cầu', 'Thiếu kinh nghiệm', 'Không liên lạc được', 'Không đến phỏng vấn', 'Khoảng cách quá xa', 'Thu nhập không phù hợp', 'Ứng viên từ chối']

export function MenuGiaiDoan({ nut, chon, hienTai }) {
  return (
    <Menu canh="trai" rong={230} nut={nut}>
      {(dong) => <>
        <div className="tieu">Chuyển sang</div>
        {GIAI_DOAN.map((g) => (
          <button key={g.ma} className={hienTai === g.ma ? 'on' : ''} onClick={() => { dong(); chon(g.ma) }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.cham, flex: 'none' }} />{g.ten}
            {hienTai === g.ma && <Check size={15} style={{ marginLeft: 'auto' }} />}
          </button>
        ))}
      </>}
    </Menu>
  )
}

// Đổi giai đoạn có hỏi lý do (Không đạt) và mở hẹn lịch (Hẹn PV)
export function useDoiGiaiDoan({ xong, henPV }) {
  const bao = useToast()
  const [hoi, setHoi] = useState(null)
  const [lyDo, setLyDo] = useState('')
  const [dang, setDang] = useState(false)

  async function lam(ids, tt, ghiChu) {
    setDang(true)
    try {
      const n = await rpc('td_doi_trang_thai', { p_ids: ids, p_trang_thai: tt, p_ghi_chu: ghiChu || null })
      bao(n > 1 ? 'Đã chuyển ' + n + ' hồ sơ' : n === 1 ? 'Đã chuyển giai đoạn' : 'Không có thay đổi')
      xong && xong(ids, tt)
    } catch (e) { bao(e.message, 'loi') }
    setDang(false)
    setHoi(null)
  }

  function doi(ids, tt, rows) {
    if (!ids.length) return
    if (tt === 'hen_pv' && ids.length === 1 && henPV) return henPV(rows?.[0] || { id: ids[0] })
    if (tt === 'khong_dat') { setLyDo(''); return setHoi({ ids, tt }) }
    lam(ids, tt)
  }

  const giaoDien = (
    <Modal mo={!!hoi} dong={() => setHoi(null)} tieuDe="Lý do không đạt" moTa={hoi && hoi.ids.length > 1 ? hoi.ids.length + ' hồ sơ' : 'Lý do chỉ lưu nội bộ, ứng viên không thấy.'}
      chan={<><Btn kieu="trong" onClick={() => setHoi(null)}>Hủy</Btn><Btn kieu="den" loading={dang} onClick={() => lam(hoi.ids, hoi.tt, lyDo)}>Xác nhận không đạt</Btn></>}>
      <div className="cot" style={{ gap: 12 }}>
        <Chips ds={LY_DO} giaTri={lyDo} onChon={setLyDo} co="sm" />
        <Field nhan="Ghi chú thêm"><textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Có thể bỏ trống" /></Field>
      </div>
    </Modal>
  )
  return [doi, giaoDien]
}
