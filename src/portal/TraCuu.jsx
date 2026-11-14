import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calendar, Check, CheckCircle2, Clock, FileText, Heart, MapPin, MessageCircle, Phone, Search, Shirt, Trophy, UserCheck, Video } from 'lucide-react'
import { rpc } from '../lib/api'
import { CONG_KHAI, HINH_THUC } from '../lib/stages'
import { DONG_VIEN, dsTacPhong } from '../lib/thongBao'
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
const chuanQ = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)

export default function TraCuu() {
  const [qs] = useSearchParams()
  const [q, setQ] = useState(chuanQ(qs.get('ma') || qs.get('sdt') || ''))
  const [ds, setDs] = useState(null)
  const [kq, setKq] = useState(null)
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const [doiLich, setDoiLich] = useState(false)
  const [ghiChu, setGhiChu] = useState('')
  const [sdtXacNhan, setSdtXacNhan] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [daGui, setDaGui] = useState(null)

  async function tra(e) {
    e && e.preventDefault()
    setLoi(null)
    const x = q.trim()
    const laMa = /^NS\d{6}-[A-Z0-9]{5}$/.test(x)
    const laSdt = /^(0|84)\d{9}$/.test(x)
    if (!laMa && !laSdt) return setLoi('Nhập số điện thoại (VD 0909123456) hoặc mã hồ sơ (VD NS261113-ABCDE)')
    setDang(true)
    try {
      const r = await rpc('td_tra_cuu_nhanh', { p_q: x })
      if (!r?.length) { setLoi('Không tìm thấy hồ sơ nộp trong 30 ngày gần đây. Kiểm tra lại số điện thoại hoặc mã hồ sơ.'); setDs(null); setKq(null) }
      else if (r.length === 1) { setDs(r); setKq(r[0]) } else { setDs(r); setKq(null) }
    } catch (e2) { setLoi(e2.message) }
    setDang(false)
  }
  useEffect(() => { if (q) tra() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function phanHoi(loai) {
    const sdt = kq.k || sdtXacNhan.replace(/\D/g, '')
    if (!/^0\d{9}$/.test(sdt)) { setLoi('Nhập số điện thoại đã dùng khi nộp hồ sơ để xác nhận'); return }
    setDangGui(true)
    try {
      const r = await rpc('td_phan_hoi_lich', { p_ma: kq.ma, p_sdt: sdt, p_lich_id: kq.lich.id, p_phan_hoi: loai, p_ghi_chu: loai === 'xin_doi' ? ghiChu : null })
      setKq((x) => ({ ...x, lich: { ...x.lich, trang_thai: r.trang_thai } }))
      setDaGui(loai)
      setDoiLich(false)
    } catch (e) { setLoi(e.message) }
    setDangGui(false)
  }

  if (!kq && ds && ds.length > 1) {
    return (
      <PortalShell hero={['Chọn', 'hồ sơ cần xem']} loiChao="Số điện thoại này có nhiều hồ sơ trong 30 ngày gần đây.">
        <div><h2 className="buoc-ten">{ds.length} hồ sơ</h2></div>
        <div className="cot" style={{ gap: 10 }}>
          {ds.map((x) => {
            const c = CONG_KHAI[x.trang_thai] || CONG_KHAI.xet_duyet
            return (
              <button key={x.ma} type="button" className="the-chon-hs" onClick={() => setKq(x)}>
                <span className="gian"><b>{x.vi_tri}</b><span>{x.ma} · nộp {fmtNgayGio(x.nop_luc)}</span></span>
                <span className="tag" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>{c.tieu_de.join(' ')}</span>
              </button>
            )
          })}
        </div>
        <div className="chan-form"><span className="ghi" /><Btn kieu="vien" co="md" icon={Search} onClick={() => { setDs(null); setKq(null) }}>Tra cứu khác</Btn></div>
      </PortalShell>
    )
  }

  if (!kq) {
    return (
      <PortalShell hero={['Theo dõi', 'hồ sơ của bạn', 'mọi lúc']} loiChao="Chỉ cần nhập số điện thoại HOẶC mã hồ sơ để xem tiến độ và kết quả (hồ sơ nộp trong 30 ngày gần đây).">
        <div>
          <h2 className="buoc-ten">Tra cứu hồ sơ</h2>
        </div>
        <form className="form-cot" onSubmit={tra}>
          <Field nhan="Số điện thoại hoặc mã hồ sơ" value={q} onChange={(e) => setQ(chuanQ(e.target.value))} placeholder="0909 123 456 · hoặc NS261113-ABCDE" autoCapitalize="characters" spellCheck={false} autoFocus />
          {loi && <Bao kieu="loi">{loi}</Bao>}
          <div className="chan-form">
            <span className="ghi">Không cần cả hai — một trong hai là đủ.</span>
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
        <div className="the-nhan-viec">
          <span className="eyebrow">{kq.trang_thai === 'nhan_viec' ? 'Nơi làm việc của bạn' : 'Thông tin nhận việc'}</span>
          {kq.ngay_nhan_viec && <div className="tnv-ngay"><Calendar size={18} /><span>Ngày hội nhập</span><b>{thu(kq.ngay_nhan_viec + 'T12:00:00+07:00')} {fmtNgay(kq.ngay_nhan_viec + 'T12:00:00+07:00')}</b></div>}
          {kq.gio_nhan_viec && <div className="tnv-ngay"><Clock size={18} /><span>Ca làm việc ngày đầu</span><b>{kq.gio_nhan_viec}{kq.gio_ket_thuc ? ' – ' + kq.gio_ket_thuc : ''}</b></div>}
          {kq.noi_lam_viec && <div className="tnv-noi"><MapPin size={16} /><div><b>{kq.noi_lam_viec}</b>{kq.dia_chi_nhan_viec && <span>{kq.dia_chi_nhan_viec}</span>}</div></div>}
          {kq.ban_do && <a className="nut-chi-duong" href={kq.ban_do} target="_blank" rel="noreferrer"><MapPin size={16} />Chỉ đường đến cửa hàng</a>}
          {kq.ghi_chu_nhan_viec && <p>{kq.ghi_chu_nhan_viec}</p>}
        </div>
      )}
      {kq.trang_thai === 'trung_tuyen' && (
        <div className="the-tac-phong">
          <span className="ttp-dau"><Shirt size={17} /><b>Trang phục khi đến nhận việc</b></span>
          <ul>{dsTacPhong(kq.tac_phong).map((x) => <li key={x}><Check size={14} strokeWidth={3} />{x}</li>)}</ul>
          <span className="ttp-dau" style={{ marginTop: 6 }}><FileText size={17} /><b>Lưu ý</b></span>
          <ul className="luu-y">{['Mang theo hồ sơ xin việc và CMND/CCCD bản gốc', 'Đưa thông tin này cho nhân viên cửa hàng để được xác nhận', 'Vui lòng có mặt trước giờ vào ca 10 phút'].map((x) => <li key={x}><Check size={14} strokeWidth={3} />{x}</li>)}</ul>
          <span className="nho muted">Mọi thắc mắc, bạn vui lòng trả lời email Nón Sơn đã gửi hoặc liên hệ Phòng Tuyển dụng.</span>
        </div>
      )}
      {kq.trang_thai === 'chua_phu_hop' && (
        <div className="the-dong-vien">
          <span className="tdv-icon"><Heart size={18} /></span>
          <p>{DONG_VIEN}</p>
          <Link to="/" className="btn vien md">Xem các vị trí đang tuyển</Link>
        </div>
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
          {lichCon && !kq.k && <Field kieu="gon" nhan="SĐT để xác nhận lịch" value={sdtXacNhan} onChange={(e) => setSdtXacNhan(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="tel" placeholder="09xx xxx xxx" style={{ marginTop: 12 }} />}
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
        <Btn kieu="vien" co="md" icon={Search} onClick={() => { setKq(null); setDs(null); setDaGui(null) }}>Tra cứu khác</Btn>
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
