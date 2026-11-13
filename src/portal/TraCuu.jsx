import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calendar, Check, CheckCircle2, Clock, FileText, MapPin, MessageCircle, Phone, Search, Trophy, UserCheck, Video } from 'lucide-react'
import { rpc } from '../lib/api'
import { CONG_KHAI, HINH_THUC } from '../lib/stages'
import { fmtGio, fmtNgay, fmtNgayGio, ngayVN, tenGoi, thu } from '../lib/format'
import { Bao, Btn, Field, LichTag, Modal, Ring, Spinner } from '../components/ui'
import { PortalShell } from './Shell'

const CHANG = [
  { ten: 'Đã nhận hồ sơ', ic: FileText },
  { ten: 'Xét duyệt hồ sơ', ic: Search },
  { ten: 'Phỏng vấn', ic: UserCheck },
  { ten: 'Chờ kết quả', ic: Clock },
  { ten: 'Kết quả', ic: Trophy }
]
const chuanMa = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)

export default function TraCuu() {
  const [qs] = useSearchParams()
  const [ma, setMa] = useState(chuanMa(qs.get('ma')))
  const [sdt, setSdt] = useState((qs.get('sdt') || '').replace(/\D/g, ''))
  const [kq, setKq] = useState(null)
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const [doiLich, setDoiLich] = useState(false)
  const [ghiChu, setGhiChu] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [daGui, setDaGui] = useState(null)

  async function tra(e) {
    e && e.preventDefault()
    setLoi(null)
    if (!/^NS\d{6}-[A-Z0-9]{5}$/.test(ma)) return setLoi('Mã hồ sơ có dạng NS261113-ABCDE')
    if (!/^0\d{9}$/.test(sdt)) return setLoi('Nhập số điện thoại đã dùng khi nộp hồ sơ')
    setDang(true)
    try {
      const r = await rpc('td_tra_cuu', { p_ma: ma, p_sdt: sdt })
      if (!r) setLoi('Không tìm thấy hồ sơ. Kiểm tra lại mã và số điện thoại.')
      setKq(r)
    } catch (e2) { setLoi(e2.message) }
    setDang(false)
  }
  useEffect(() => { if (ma && sdt) tra() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function phanHoi(loai) {
    setDangGui(true)
    try {
      const r = await rpc('td_phan_hoi_lich', { p_ma: ma, p_sdt: sdt, p_lich_id: kq.lich.id, p_phan_hoi: loai, p_ghi_chu: loai === 'xin_doi' ? ghiChu : null })
      setKq((x) => ({ ...x, lich: { ...x.lich, trang_thai: r.trang_thai } }))
      setDaGui(loai)
      setDoiLich(false)
    } catch (e) { setLoi(e.message) }
    setDangGui(false)
  }

  if (!kq) {
    return (
      <PortalShell hero={['Theo dõi', 'hồ sơ của bạn', 'mọi lúc.']} loiChao="Nhập mã hồ sơ (nhận được khi nộp) và số điện thoại để xem tiến độ, lịch phỏng vấn và kết quả.">
        <div>
          <h2 className="buoc-ten">Tra cứu hồ sơ</h2>
        </div>
        <form className="form-cot" onSubmit={tra}>
          <Field nhan="Mã hồ sơ" value={ma} onChange={(e) => setMa(chuanMa(e.target.value))} placeholder="NS261113-ABCDE" autoCapitalize="characters" spellCheck={false} style={{ letterSpacing: '.06em' }} />
          <Field nhan="Số điện thoại" value={sdt} onChange={(e) => setSdt(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="09xx xxx xxx" inputMode="tel" />
          {loi && <Bao kieu="loi">{loi}</Bao>}
          <div className="chan-form">
            <span className="ghi">Quên mã? Liên hệ cửa hàng Nón Sơn gần nhất để được hỗ trợ.</span>
            <button type="submit" className="btn den lg co-orb" disabled={dang}>Tra cứu<span className="orb">{dang ? <Spinner size={16} /> : <Search size={17} strokeWidth={2.6} />}</span></button>
          </div>
        </form>
      </PortalShell>
    )
  }

  const ck = CONG_KHAI[kq.trang_thai] || CONG_KHAI.xet_duyet
  const buoc = ck.buoc
  const ketThucTot = kq.trang_thai === 'trung_tuyen' || kq.trang_thai === 'nhan_viec'
  const l = kq.lich
  const lichCon = l && ['cho_xac_nhan', 'da_xac_nhan', 'xin_doi'].includes(l.trang_thai) && new Date(l.bat_dau).getTime() > Date.now() - 3600e3
  const ngay = l ? ngayVN(l.bat_dau) : null

  return (
    <PortalShell hero={['Tiến độ', 'hồ sơ của bạn']} phai={<span className="buoc" style={{ letterSpacing: '.14em', fontWeight: 700 }}>{kq.ma}</span>}>
      <div className="hang" style={{ gap: 18, alignItems: 'center' }}>
        <Ring pct={(buoc / 5) * 100} size={96} day={9} trong="#fff" nen="#F1EDF3" mau="var(--pink)">
          <b style={{ fontSize: 24, lineHeight: 1 }}>{buoc}/5</b><span className="nho muted" style={{ fontSize: 10.5 }}>chặng</span>
        </Ring>
        <div className="gian">
          <p className="eyebrow">Xin chào {tenGoi(kq.ten)}</p>
          <h2 className="tieu-de" style={{ fontSize: 26, marginTop: 4 }}>{ck.tieu_de[0]}<br /><b>{ck.tieu_de[1]}</b></h2>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55 }}>{ck.mo_ta}</p>

      {ketThucTot && (kq.ngay_nhan_viec || kq.noi_lam_viec) && (
        <Bao kieu="ok">Nhận việc{kq.ngay_nhan_viec ? ' ngày ' + fmtNgay(kq.ngay_nhan_viec + 'T00:00:00+07:00') : ''}{kq.noi_lam_viec ? ' tại ' + kq.noi_lam_viec : ''}.</Bao>
      )}

      {l && (kq.trang_thai === 'phong_van' || lichCon) && (
        <div className="the-lich">
          <div className="glow hong" style={{ width: 130, height: 130, right: -40, top: -50, opacity: 0.6, filter: 'blur(40px)', zIndex: -1 }} />
          <div className="hang" style={{ gap: 16 }}>
            <div className="lich-ngay"><small>{thu(l.bat_dau, true) === 'CN' ? 'CN' : thu(l.bat_dau).toUpperCase()}</small><b>{ngay.slice(8, 10)}</b><span>Th {Number(ngay.slice(5, 7))}</span></div>
            <div className="gian">
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtGio(l.bat_dau)}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.72)' }}>{HINH_THUC[l.hinh_thuc]} · khoảng {l.thoi_luong} phút</div>
            </div>
            <LichTag ma={l.trang_thai} />
          </div>
          {l.dia_diem && <div className="hang" style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,.85)', alignItems: 'flex-start' }}>{l.hinh_thuc === 'online' ? <Video size={15} /> : l.hinh_thuc === 'dien_thoai' ? <Phone size={15} /> : <MapPin size={15} style={{ flex: 'none', marginTop: 2 }} />}<span style={{ wordBreak: 'break-word' }}>{l.dia_diem}</span></div>}
          {l.ghi_chu && <div style={{ marginTop: 8, fontSize: 12.5, color: 'rgba(255,255,255,.65)', whiteSpace: 'pre-line' }}>{l.ghi_chu}</div>}
          {lichCon && (
            <div className="hang" style={{ marginTop: 16, gap: 8 }}>
              {l.trang_thai !== 'da_xac_nhan'
                ? <Btn kieu="trang" co="md" icon={Check} loading={dangGui} onClick={() => phanHoi('xac_nhan')} className="gian">Xác nhận tham gia</Btn>
                : <span className="hang nho" style={{ gap: 6, fontWeight: 700, color: '#7FE0BF' }}><CheckCircle2 size={16} /> Bạn đã xác nhận</span>}
              <Btn kieu="vien-sang" co="md" icon={Calendar} onClick={() => setDoiLich(true)}>Xin đổi lịch</Btn>
            </div>
          )}
        </div>
      )}
      {daGui === 'xac_nhan' && <Bao kieu="ok">Cảm ơn bạn! Nón Sơn đã nhận xác nhận. Hẹn gặp bạn {fmtNgayGio(l.bat_dau)}.</Bao>}
      {daGui === 'xin_doi' && <Bao kieu="xanh">Đã gửi yêu cầu đổi lịch. Bộ phận tuyển dụng sẽ liên hệ lại với bạn.</Bao>}

      <div className="cot" style={{ gap: 0, marginTop: 4 }}>
        {CHANG.map((c, i) => {
          const so = i + 1
          const xong = so < buoc || (so === buoc && so === 5)
          const dangO = so === buoc && so !== 5
          const ten = so === 5 && buoc === 5 ? (ketThucTot ? 'Trúng tuyển' : kq.trang_thai === 'da_rut' ? 'Đã rút hồ sơ' : 'Chưa phù hợp lần này') : c.ten
          return (
            <div key={i} className="moc" style={{ paddingTop: i ? 14 : 0 }}>
              <span className={'cham' + (xong ? ' xong' : dangO ? ' dang' : '')}>{xong ? <Check size={15} strokeWidth={3} /> : <c.ic size={15} />}</span>
              <div className="noi">
                <b style={{ color: so > buoc ? 'var(--muted)' : undefined }}>{ten}</b>
                <span>{so === 1 ? fmtNgayGio(kq.nop_luc) : so === buoc ? 'Cập nhật ' + fmtNgayGio(kq.doi_luc) : so < buoc ? 'Hoàn thành' : 'Sắp tới'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {loi && <Bao kieu="loi">{loi}</Bao>}
      <div className="chan-form">
        <span className="ghi">Vị trí: <b style={{ color: 'var(--ink)' }}>{kq.vi_tri}</b></span>
        <Btn kieu="vien" co="md" icon={Search} onClick={() => { setKq(null); setDaGui(null) }}>Tra mã khác</Btn>
      </div>

      <Modal mo={doiLich} dong={() => setDoiLich(false)} tieuDe="Xin đổi lịch phỏng vấn" moTa="Cho Nón Sơn biết thời gian bạn có thể tham gia."
        chan={<><Btn kieu="trong" onClick={() => setDoiLich(false)}>Đóng</Btn><Btn kieu="den" icon={MessageCircle} loading={dangGui} onClick={() => phanHoi('xin_doi')}>Gửi yêu cầu</Btn></>}>
        <Field nhan="Thời gian bạn rảnh / lý do">
          <textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="VD: Em bận đi học sáng thứ 2, có thể chiều thứ 3 sau 14h ạ" maxLength={500} />
        </Field>
      </Modal>
    </PortalShell>
  )
}
