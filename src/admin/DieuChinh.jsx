import { useState } from 'react'
import { CalendarClock, ClipboardCheck, Edit3, History, Lock, LogOut, Mail, RotateCcw, Store, UserCheck, UserX } from 'lucide-react'
import { rpc } from '../lib/api'
import { congNgay, fmtGio, fmtNgayGio, ngayVN, thu } from '../lib/format'
import { GD } from '../lib/stages'
import { Bao, Btn, Chips, Field, Modal, StageTag, useToast } from '../components/ui'
import { useStaff } from './context'
import { ChonCuaHang } from './stageActions'
import { LyDoTuChoi } from './LyDo'
import { NhatKyDs } from './NhatKy'
import { GuiThuModal } from './Email'
import { KhongDenModal, NGHI_SOM, NghiViecModal } from './NghiViec'

// ISO ↔ ô datetime-local theo giờ Việt Nam
const vaoO = (iso) => (iso ? ngayVN(iso) + 'T' + fmtGio(iso) : '')
const raISO = (v) => (v ? new Date(v + ':00+07:00').toISOString() : null)
const gio5 = (t) => (t ? String(t).slice(0, 5) : '')
const dmy = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—')
const TT_CHON = ['moi', 'hen_pv', 'can_nhac', 'chua_lien_lac', 'dat', 'khong_den', 'khong_dat', 'rut']
const CO_NV = ['dat', 'nhan_viec', 'nghi_viec', 'khong_den']

/* ---------- Thẻ "Kết quả & nhận việc" trong hồ sơ ---------- */
export function TheTuyenDung({ h, coSua, onDoi, children }) {
  const s = useStaff()
  const [mo, setMo] = useState(false)
  const [moLs, setMoLs] = useState(false)
  const [moNghi, setMoNghi] = useState(null)
  const coNV = CO_NV.includes(h.trang_thai)
  const xemNK = s.vaiTro === 'quan_tri' || s.vaiTro === 'tuyen_dung'
  const Dong = ({ ic: Ic, nhan, children: c }) => <div className="ttd-dong"><span className="ttd-nhan"><Ic size={14} />{nhan}</span><div className="ttd-gt">{c}</div></div>
  return (
    <section className="card the-tuyen-dung">
      <div className="dau-the">
        <h2>Kết quả & nhận việc</h2>
        {coSua && <Btn kieu="den" co="sm" icon={Edit3} onClick={() => setMo(true)}>Điều chỉnh</Btn>}
      </div>
      <div className="ttd">
        <Dong ic={ClipboardCheck} nhan="Trạng thái"><StageTag ma={h.trang_thai} />{h.nguoi_chot && ['dat', 'khong_dat', 'nhan_viec', 'nghi_viec', 'khong_den'].includes(h.trang_thai) && <small>Chốt bởi {s.tenNS(h.nguoi_chot)}{h.chot_luc ? ' · ' + fmtNgayGio(h.chot_luc) : ''}</small>}</Dong>
        <Dong ic={CalendarClock} nhan="Phỏng vấn">
          {h.pv_thuc_te ? <b>{fmtGio(h.pv_thuc_te)} · {thu(h.pv_thuc_te, true)} {dmy(ngayVN(h.pv_thuc_te))}</b> : <span className="muted">Chưa phỏng vấn</span>}
          <small>{h.pv_thuc_te ? 'thực tế' : ''}{h.pv_du_kien ? (h.pv_thuc_te ? ' · ' : '') + 'dự kiến ' + fmtGio(h.pv_du_kien) + ' ' + dmy(ngayVN(h.pv_du_kien)) : ''}{h.so_lan_doi_lich > 0 ? ' · đổi lịch ' + h.so_lan_doi_lich + ' lần' : ''}</small>
        </Dong>
        {(coNV || (h.cua_hang_du_kien && !['khong_dat', 'rut'].includes(h.trang_thai))) && (
          <Dong ic={Store} nhan={['nhan_viec', 'nghi_viec'].includes(h.trang_thai) ? 'Đã nhận việc' : 'Nhận việc'}>
            <b>{h.noi_lam_viec || <span className="muted">Chưa chọn cửa hàng</span>}</b>
            <small>{h.ngay_nhan_viec ? thu(h.ngay_nhan_viec + 'T12:00:00+07:00', true) + ' ' + dmy(h.ngay_nhan_viec) : 'Chưa có ngày'}{h.gio_nhan_viec ? ' · ca ' + gio5(h.gio_nhan_viec) + (h.gio_ket_thuc ? '–' + gio5(h.gio_ket_thuc) : '') : ''}{h.gioi_tinh ? ' · trang phục ' + h.gioi_tinh.toLowerCase() : ''}</small>
            {h.ghi_chu_nhan_viec && <small>“{h.ghi_chu_nhan_viec}”</small>}
          </Dong>
        )}
        {h.trang_thai === 'nghi_viec' && (
          <Dong ic={LogOut} nhan="Nghỉ việc">
            <span className="ttd-nghi"><b>Đã làm {h.so_ngay_lam ?? '—'} ngày</b>{h.so_ngay_lam != null && h.so_ngay_lam <= NGHI_SOM && <i>Nghỉ sớm</i>}</span>
            <small>Bắt đầu {thu(h.ngay_bat_dau_lam + 'T12:00:00+07:00', true)} {dmy(h.ngay_bat_dau_lam)} · nghỉ từ {thu(h.ngay_nghi_viec + 'T12:00:00+07:00', true)} {dmy(h.ngay_nghi_viec)}</small>
            {h.ly_do_nghi_viec && <span className="ttd-ly-do xam">{h.ly_do_nghi_viec}</span>}
            <small>{h.ket_thuc_boi ? 'Cập nhật bởi ' + s.tenNS(h.ket_thuc_boi) : ''}{h.ket_thuc_luc ? ' · ' + fmtNgayGio(h.ket_thuc_luc) : ''}</small>
            {coSua && <button type="button" className="ttd-sua-nho" onClick={() => setMoNghi('nghi')}><Edit3 size={12} />Sửa ngày / lý do nghỉ</button>}
          </Dong>
        )}
        {h.trang_thai === 'khong_den' && (
          <Dong ic={UserX} nhan="Không đến">
            {h.ly_do_khong_den ? <span className="ttd-ly-do xam">{h.ly_do_khong_den}</span> : <span className="muted">Chưa ghi lý do</span>}
            <small>{h.ket_thuc_boi ? 'Cập nhật bởi ' + s.tenNS(h.ket_thuc_boi) : ''}{h.ket_thuc_luc ? ' · ' + fmtNgayGio(h.ket_thuc_luc) : ''}</small>
            {coSua && <button type="button" className="ttd-sua-nho" onClick={() => setMoNghi('khong_den')}><Edit3 size={12} />Sửa lý do</button>}
          </Dong>
        )}
        {h.ly_do_loai && (
          <Dong ic={Lock} nhan="Lý do (nội bộ)"><span className="ttd-ly-do">{h.ly_do_loai}</span></Dong>
        )}
      </div>
      {children}
      {xemNK && (
        <div className="ttd-ls">
          <button type="button" className={'ttd-ls-nut' + (moLs ? ' on' : '')} onClick={() => setMoLs(!moLs)}><History size={14} />Lịch sử chỉnh sửa<span className="gian" /><span className="muted nho">{moLs ? 'Thu gọn' : 'Xem trước → sau, ai sửa, lúc nào'}</span></button>
          {moLs && <div className="ttd-ls-ds"><NhatKyDs loc={{ ho_so_id: h.id, so_dong: 30 }} gon /></div>}
        </div>
      )}
      {mo && <SuaTuyenDung h={h} dong={() => setMo(false)} xong={() => { setMo(false); onDoi?.() }} />}
      {moNghi === 'nghi' && <NghiViecModal h={h} dong={() => setMoNghi(null)} xong={() => { setMoNghi(null); onDoi?.() }} />}
      {moNghi === 'khong_den' && <KhongDenModal h={h} dong={() => setMoNghi(null)} xong={() => { setMoNghi(null); onDoi?.() }} />}
    </section>
  )
}

/* ---------- Hộp điều chỉnh thông tin tuyển dụng ---------- */
export function SuaTuyenDung({ h, dong, xong }) {
  const s = useStaff()
  const bao = useToast()
  const goc = {
    trang_thai: h.trang_thai, vi_tri_id: String(h.vi_tri_id || ''),
    pv_du_kien: vaoO(h.pv_du_kien), pv_thuc_te: vaoO(h.pv_thuc_te),
    cua_hang_du_kien: h.cua_hang_du_kien || '', ngay_nhan_viec: h.ngay_nhan_viec || '',
    gio_nhan_viec: gio5(h.gio_nhan_viec), gio_ket_thuc: gio5(h.gio_ket_thuc), gioi_tinh: h.gioi_tinh || '',
    ghi_chu_nhan_viec: h.ghi_chu_nhan_viec || '', ly_do_loai: h.ly_do_loai || ''
  }
  const [f, setF] = useState(goc)
  const [ghiSua, setGhiSua] = useState('')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const [moThu, setMoThu] = useState(null)
  const dat = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.target ? v.target.value : v }))
  const coNV = CO_NV.includes(f.trang_thai)
  const dsTT = [...TT_CHON, ...(TT_CHON.includes(h.trang_thai) ? [] : [h.trang_thai])]
  const doi = Object.keys(goc).filter((k) => f[k] !== goc[k])
  const doiNV = doi.some((k) => ['cua_hang_du_kien', 'ngay_nhan_viec', 'gio_nhan_viec', 'gio_ket_thuc', 'gioi_tinh', 'ghi_chu_nhan_viec'].includes(k))

  async function luu() {
    setLoi(null)
    if (!doi.length) return dong()
    if (f.trang_thai === 'dat' && (!f.cua_hang_du_kien || !f.ngay_nhan_viec)) return setLoi('Trúng tuyển cần chọn cửa hàng và ngày nhận việc.')
    const p = { ghi_chu_sua: ghiSua || null }
    for (const k of doi) {
      if (k === 'pv_du_kien' || k === 'pv_thuc_te') p[k] = raISO(f[k])
      else if (k === 'vi_tri_id') p[k] = Number(f[k])
      else p[k] = f[k] || null
    }
    setDang(true)
    try {
      await rpc('td_cap_nhat_ho_so', { p_id: h.id, p })
      bao('Đã lưu ' + doi.length + ' thay đổi')
      if (h.email && ((f.trang_thai === 'dat' && (doiNV || goc.trang_thai !== 'dat')) || (f.trang_thai === 'khong_dat' && goc.trang_thai !== 'khong_dat'))) setMoThu(f.trang_thai)
      else xong()
    } catch (e) { setLoi(e.message) }
    setDang(false)
  }

  if (moThu) return <GuiThuModal hoSoId={h.id} loai={moThu} ten={h.ho_ten} dong={xong} />
  return (
    <Modal mo rong dong={dong} tieuDe="Điều chỉnh thông tin tuyển dụng" moTa={h.ho_ten + ' · ' + h.ma}
      chan={<><span className="nho muted gian">{doi.length ? doi.length + ' mục thay đổi' : 'Chưa có thay đổi'}</span><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" loading={dang} onClick={luu} disabled={!doi.length}>Lưu thay đổi</Btn></>}>
      <div className="sua-td">
        <section className="std-khoi">
          <h3>Kết quả & trạng thái</h3>
          <div className="std-tt">
            {dsTT.map((m) => (
              <button key={m} type="button" className={'std-tt-o' + (f.trang_thai === m ? ' on' : '')} style={{ '--cham': GD[m]?.cham }} onClick={() => setF((x) => ({ ...x, trang_thai: m }))}>
                <i />{GD[m]?.ten || m}
              </button>
            ))}
          </div>
          {f.trang_thai !== goc.trang_thai && goc.trang_thai === 'nhan_viec' && <Bao kieu="vang">Hồ sơ nhân viên đã tạo vẫn được giữ lại — cập nhật thêm ở mục Nhân viên mới nếu cần.</Bao>}
          {f.trang_thai === 'nhan_viec' && goc.trang_thai === 'nghi_viec' && <Bao kieu="xanh">Hồ sơ trở lại Đang làm việc. Ngày nghỉ và lý do nghỉ sẽ được xóa (vẫn lưu trong lịch sử).</Bao>}
          {f.trang_thai === 'khong_den' && goc.trang_thai !== 'khong_den' && <Bao kieu="vang">Ghi lý do không đến bằng nút “Không đến” trên hồ sơ để có số liệu đầy đủ.</Bao>}
          {f.trang_thai === 'nhan_viec' && !['nhan_viec', 'nghi_viec'].includes(goc.trang_thai) && <Bao kieu="xanh">Xác nhận nhận việc dùng nút “Ứng viên đã đến — xác nhận nhận việc” để tạo hồ sơ nhân viên.</Bao>}
          <label className="field gon"><span className="nhan">Vị trí ứng tuyển / được phân công</span>
            <select value={f.vi_tri_id} onChange={dat('vi_tri_id')}>{s.dm.viTri.map((v) => <option key={v.id} value={String(v.id)}>{v.ten}</option>)}</select>
          </label>
        </section>

        <section className="std-khoi">
          <h3>Phỏng vấn</h3>
          <div className="luoi-2">
            <Field kieu="gon" nhan="Lịch hẹn dự kiến" type="datetime-local" value={f.pv_du_kien} onChange={dat('pv_du_kien')} />
            <Field kieu="gon" nhan="Thời điểm phỏng vấn thực tế" type="datetime-local" value={f.pv_thuc_te} onChange={dat('pv_thuc_te')} />
          </div>
          <div className="chips">
            <button type="button" className="chip sm" onClick={() => setF((x) => ({ ...x, pv_thuc_te: vaoO(new Date().toISOString()) }))}>Vừa phỏng vấn xong</button>
            {f.pv_thuc_te && <button type="button" className="chip sm" onClick={() => setF((x) => ({ ...x, pv_thuc_te: '' }))}><RotateCcw size={12} />Chưa phỏng vấn</button>}
            {h.so_lan_doi_lich > 0 && <span className="nho muted" style={{ alignSelf: 'center' }}>Đã đổi lịch {h.so_lan_doi_lich} lần</span>}
          </div>
        </section>

        {coNV && (
          <section className="std-khoi">
            <h3>Nhận việc{f.trang_thai === 'nhan_viec' ? ' (đồng bộ sang hồ sơ nhân viên)' : ''}</h3>
            <ChonCuaHang giaTri={f.cua_hang_du_kien} onChon={dat('cua_hang_du_kien')} goiY={[h.khu_vuc_mong_muon, String(h.cho_o || '').split(',')[0]]} />
            <div className="luoi-2">
              <Field kieu="gon" nhan={f.trang_thai === 'nhan_viec' ? 'Ngày nhận việc' : 'Ngày hội nhập dự kiến'} type="date" value={f.ngay_nhan_viec} onChange={dat('ngay_nhan_viec')} />
              <div className="luoi-2" style={{ gap: 6 }}>
                <Field kieu="gon" nhan="Ca từ" type="time" value={f.gio_nhan_viec} onChange={dat('gio_nhan_viec')} />
                <Field kieu="gon" nhan="Đến" type="time" value={f.gio_ket_thuc} onChange={dat('gio_ket_thuc')} />
              </div>
            </div>
            <div className="chips">
              {[['Ngày mai', congNgay(ngayVN(), 1)], ['Ngày kia', congNgay(ngayVN(), 2)]].map(([t, v]) => <button key={t} type="button" className={'chip sm' + (f.ngay_nhan_viec === v ? ' on' : '')} onClick={() => setF((x) => ({ ...x, ngay_nhan_viec: v }))}>{t} · {v.slice(8, 10)}/{v.slice(5, 7)}</button>)}
              {[['08:00', '16:00'], ['09:00', '17:00'], ['14:00', '22:00']].map(([a, b]) => <button key={a} type="button" className={'chip sm' + (f.gio_nhan_viec === a && f.gio_ket_thuc === b ? ' on' : '')} onClick={() => setF((x) => ({ ...x, gio_nhan_viec: a, gio_ket_thuc: b }))}>Ca {a.slice(0, 2).replace(/^0/, '')}h–{b.slice(0, 2)}h</button>)}
            </div>
            <div className="hang wrap" style={{ gap: 8 }}><span className="nhan-nhom" style={{ margin: 0 }}>Trang phục theo</span><Chips ds={['Nữ', 'Nam']} giaTri={f.gioi_tinh} onChon={dat('gioi_tinh')} co="sm" /></div>
            <Field kieu="gon" nhan="Ghi chú nhận việc (gửi kèm ứng viên)" value={f.ghi_chu_nhan_viec} onChange={dat('ghi_chu_nhan_viec')} maxLength={500} />
          </section>
        )}

        {(f.trang_thai === 'khong_dat' || goc.ly_do_loai) && (
          <section className="std-khoi">
            <LyDoTuChoi giaTri={f.ly_do_loai} onDoi={dat('ly_do_loai')} />
          </section>
        )}

        <section className="std-khoi">
          <Field kieu="gon" nhan="Lý do điều chỉnh (ghi vào lịch sử, không bắt buộc)" value={ghiSua} onChange={(e) => setGhiSua(e.target.value)} placeholder="VD: Ứng viên xin đổi sang cửa hàng gần nhà" maxLength={300} />
          {h.email && (f.trang_thai === 'dat' && doiNV) && <p className="nho muted std-goi-y"><Mail size={13} />Sau khi lưu, có thể gửi lại email thông báo với thông tin mới cho ứng viên.</p>}
          {f.trang_thai === 'nhan_viec' && doiNV && <p className="nho muted std-goi-y"><UserCheck size={13} />Cửa hàng / ngày nhận việc sẽ cập nhật luôn sang hồ sơ nhân viên.</p>}
        </section>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}
