import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, CalendarPlus, Download, ExternalLink, Film, Filter, Image as ImageIc, LayoutList, Phone, Search, SlidersHorizontal, Star, UserCheck, X, Check, ArrowRight } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync, useDebounced, useLS, usePhim } from '../lib/hooks'
import { fmtGiay, fmtNgayGio, fmtSdt, tuongDoi } from '../lib/format'
import { GIAI_DOAN, GD } from '../lib/stages'
import { xuatExcel } from '../lib/excel'
import { AnhKho, Avatar, Btn, Chips, Diem, Empty, Field, Menu, Modal, Segment, Skeleton, StageTag, useToast } from '../components/ui'
import { useStaff } from './context'
import LichModal from './LichModal'
import { tenNgan } from './Dashboard'
import { MenuGiaiDoan, useDoiGiaiDoan } from './stageActions'

const SAP_XEP = [{ v: 'moi_nhat', t: 'Mới nhất' }, { v: 'cu_nhat', t: 'Cũ nhất' }, { v: 'diem', t: 'Điểm cao' }, { v: 'ten', t: 'Tên A–Z' }, { v: 'tuoi', t: 'Trẻ nhất' }, { v: 'cap_nhat', t: 'Vừa cập nhật' }]

export const COT_EXCEL = [
  { k: 'ma', ten: 'Mã hồ sơ', w: 16 }, { k: 'nop_luc', ten: 'Thời gian nộp', w: 18, lay: (r) => fmtNgayGio(r.nop_luc) },
  { k: 'trang_thai', ten: 'Giai đoạn', w: 13, lay: (r) => GD[r.trang_thai]?.ten }, { k: 'ho_ten', ten: 'Họ và tên', w: 24 },
  { k: 'sdt', ten: 'Số điện thoại', w: 14 }, { k: 'email', ten: 'Email', w: 24 }, { k: 'ngay_sinh', ten: 'Ngày sinh', w: 12 },
  { k: 'tuoi', ten: 'Tuổi', w: 6 }, { k: 'chieu_cao', ten: 'Chiều cao (cm)', w: 9 }, { k: 'can_nang', ten: 'Cân nặng (kg)', w: 9 },
  { k: 'cho_o', ten: 'Chỗ ở hiện tại', w: 28 }, { k: 'vi_tri', ten: 'Vị trí ứng tuyển', w: 22 }, { k: 'khu_vuc_mong_muon', ten: 'Khu vực mong muốn', w: 18 },
  { k: 'hoc_van', ten: 'Trình độ học vấn', w: 16 }, { k: 'kinh_nghiem', ten: 'Kinh nghiệm làm việc', w: 40 }, { k: 'an_tuong', ten: 'Ấn tượng về Nón Sơn', w: 36 },
  { k: 'thu_nhap_mong_muon', ten: 'Thu nhập mong muốn', w: 14 }, { k: 'dinh_huong', ten: 'Ổn định / Linh hoạt', w: 16 }, { k: 'nguon', ten: 'Nguồn thông tin', w: 30 },
  { k: 'ma_nguon', ten: 'Kênh (mã QR)', w: 12 }, { k: 'sdt_gioi_thieu', ten: 'SĐT người giới thiệu', w: 14 }, { k: 'diem_tb', ten: 'Điểm PV', w: 8 },
  { k: 'so_danh_gia', ten: 'Số phiếu chấm', w: 8 }, { k: 'phu_trach_ten', ten: 'Phụ trách', w: 18 }, { k: 'the_gan', ten: 'Thẻ', w: 18 },
  { k: 'ly_do_loai', ten: 'Lý do không đạt', w: 24 }, { k: 'ngay_nhan_viec', ten: 'Ngày nhận việc', w: 12 }, { k: 'noi_lam_viec', ten: 'Nơi làm việc', w: 20 }
]

export default function Candidates() {
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const [qs, setQs] = useSearchParams()
  const [kieu, setKieu] = useLS('ns-td-kieu-xem', 'bang')
  const [tim, setTim] = useState(qs.get('tim') || '')
  const timTre = useDebounced(tim, 300)
  const gd = qs.get('gd') || ''
  const [loc, setLoc] = useLS('ns-td-loc', { vi_tri_id: '', ma_nguon: '', phu_trach: '', uu_tien: false, tu: '', den: '', sap_xep: 'moi_nhat' })
  const [soDong, setSoDong] = useState(50)
  const [chon, setChon] = useState([])
  const [xem, setXem] = useState(null)
  const [hl, setHl] = useState(-1)
  const [moLoc, setMoLoc] = useState(false)
  const [henCho, setHenCho] = useState(null)
  const [dangXuat, setDangXuat] = useState(false)
  const timRef = useRef(null)

  const p = useMemo(() => ({
    tim: timTre.trim() || null, trang_thai: gd ? (gd === 'dang_xu_ly' ? ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat'] : [gd]) : null,
    vi_tri_id: loc.vi_tri_id || null, ma_nguon: loc.ma_nguon || null, phu_trach: loc.phu_trach || null, uu_tien: loc.uu_tien ? true : null,
    tu: loc.tu || null, den: loc.den || null, sap_xep: loc.sap_xep, so_dong: soDong
  }), [timTre, gd, loc, soDong])
  const { data, loading, reload, setData } = useAsync(() => rpc('td_ds_ho_so', { p }), [JSON.stringify(p), s.nhip])
  const ds = data?.dong || []
  const dem = data?.dem || {}
  const tongTatCa = Object.values(dem).reduce((a, b) => a + b, 0)
  const dangXuLy = ['moi', 'sang_loc', 'hen_pv', 'da_pv', 'de_xuat'].reduce((a, k) => a + (dem[k] || 0), 0)

  useEffect(() => { setSoDong(50); setChon([]) }, [timTre, gd, JSON.stringify(loc)])
  useEffect(() => { try { sessionStorage.setItem('ns-td-thu-tu', JSON.stringify(ds.map((r) => r.id))) } catch (e) { /* bỏ qua */ } }, [ds])
  useEffect(() => { if (xem && !ds.find((r) => r.id === xem.id)) setXem(null) }, [ds])

  const [doiGD, giaoDienGD] = useDoiGiaiDoan({ xong: (ids, tt) => { setData((d) => d && ({ ...d, dong: d.dong.map((r) => (ids.includes(r.id) ? { ...r, trang_thai: tt } : r)) })); setChon([]); reload(true); s.taiDem() }, henPV: (r) => setHenCho(r) })

  const datGD = (v) => { const q = new URLSearchParams(qs); if (v) q.set('gd', v); else q.delete('gd'); q.delete('tim'); setQs(q, { replace: true }) }
  const mo = (r) => (window.innerWidth >= 1280 ? setXem(r) : nav('/quan-tri/ung-vien/' + r.id))
  usePhim(['/'], (e) => { e.preventDefault(); timRef.current?.focus() })
  usePhim(['j', 'k', 'Enter', 'x', 'o'], (e) => {
    if (!ds.length) return
    if (e.key === 'j') setHl((i) => Math.min(ds.length - 1, i + 1))
    if (e.key === 'k') setHl((i) => Math.max(0, i - 1))
    if (e.key === 'Enter' && ds[hl]) mo(ds[hl])
    if (e.key === 'o' && ds[hl]) nav('/quan-tri/ung-vien/' + ds[hl].id)
    if (e.key === 'x' && ds[hl] && s.coSua) setChon((c) => (c.includes(ds[hl].id) ? c.filter((y) => y !== ds[hl].id) : [...c, ds[hl].id]))
  })
  useEffect(() => { if (hl >= 0) document.querySelector('[data-hang="' + hl + '"]')?.scrollIntoView({ block: 'nearest' }) }, [hl])

  async function xuat(chiChon) {
    setDangXuat(true)
    try {
      const r = await rpc('td_ds_ho_so', { p: { ...p, so_dong: 5000, xuat: true } })
      const dong = chiChon ? r.dong.filter((x) => chon.includes(x.id)) : r.dong
      await xuatExcel('NS-tuyen-dung-' + new Date().toISOString().slice(0, 10) + '.xlsx', [{ ten: 'Ứng viên', cot: COT_EXCEL, dong }])
      bao('Đã xuất ' + dong.length + ' hồ sơ')
    } catch (e) { bao(e.message, 'loi') }
    setDangXuat(false)
  }

  const soLoc = [loc.vi_tri_id, loc.ma_nguon, loc.phu_trach, loc.uu_tien, loc.tu, loc.den].filter(Boolean).length
  const chipGD = [
    { v: '', t: 'Tất cả', dem: tongTatCa },
    { v: 'dang_xu_ly', t: 'Đang xử lý', dem: dangXuLy },
    ...GIAI_DOAN.map((g) => ({ v: g.ma, t: g.ten, dem: dem[g.ma] || 0 }))
  ]
  const tatCaChon = ds.length > 0 && ds.every((r) => chon.includes(r.id))

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">Ứng viên</span>
          <h1><b>{data ? data.tong : '…'}</b> hồ sơ{gd ? ' · ' + (gd === 'dang_xu_ly' ? 'đang xử lý' : GD[gd]?.ten.toLowerCase()) : <> · <b>{dem.moi || 0}</b> chờ xử lý</>}</h1>
        </div>
        <Segment trang ds={[{ v: 'bang', t: 'Bảng', icon: LayoutList }, { v: 'the', t: 'Thẻ ảnh', icon: ImageIc }]} giaTri={kieu} onChon={setKieu} />
        {s.vaiTro !== 'phong_van' && <Btn kieu="den" orb="trai" icon={Download} loading={dangXuat} onClick={() => xuat(false)}>Xuất Excel</Btn>}
      </header>

      <div className="loc-hang">
        <label className="input-tron">
          <Search size={17} />
          <input ref={timRef} aria-label="Tìm ứng viên" placeholder="Tên, SĐT, mã hồ sơ, địa chỉ…" value={tim} onChange={(e) => setTim(e.target.value)} />
          {tim ? <button className="icon-btn xs mem" onClick={() => setTim('')} aria-label="Xóa tìm"><X size={13} /></button> : <kbd>/</kbd>}
        </label>
        <Btn kieu={soLoc ? 'den' : 'trang'} co="md" icon={SlidersHorizontal} onClick={() => setMoLoc(true)}>Bộ lọc{soLoc ? ' · ' + soLoc : ''}</Btn>
        <Menu canh="trai" rong={200} nut={<Btn kieu="trang" co="md" icon={ArrowUpDown}>{SAP_XEP.find((x) => x.v === loc.sap_xep)?.t}</Btn>}>
          {(dong) => SAP_XEP.map((x) => <button key={x.v} className={loc.sap_xep === x.v ? 'on' : ''} onClick={() => { setLoc((l) => ({ ...l, sap_xep: x.v })); dong() }}>{x.t}{loc.sap_xep === x.v && <Check size={15} style={{ marginLeft: 'auto' }} />}</button>)}
        </Menu>
        {soLoc > 0 && <Btn kieu="trong" co="md" icon={X} onClick={() => setLoc((l) => ({ vi_tri_id: '', ma_nguon: '', phu_trach: '', uu_tien: false, tu: '', den: '', sap_xep: l.sap_xep }))}>Xóa lọc</Btn>}
      </div>
      <div className="loc-cuon" role="tablist" aria-label="Giai đoạn">
        {chipGD.map((c) => (
          <button key={c.v} role="tab" aria-selected={gd === c.v} className={'chip trang sm' + (gd === c.v ? ' on' : '')} onClick={() => datGD(c.v)}>
            {c.v && GD[c.v] && <span className="tag cham" style={{ width: 8, height: 8, padding: 0, borderRadius: '50%', background: GD[c.v].cham }} />}{c.t}<span className="dem">{c.dem}</span>
          </button>
        ))}
      </div>

      <div className="hang" style={{ alignItems: 'flex-start', gap: 18 }}>
        <div className="gian">
          {loading && !data ? (
            <div className="bang-uv" style={{ padding: 18 }}><div className="cot">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={50} />)}</div></div>
          ) : !ds.length ? (
            <div className="card"><Empty icon={Search} tieuDe="Không có hồ sơ phù hợp">Thử đổi từ khóa hoặc bộ lọc.</Empty></div>
          ) : kieu === 'the' ? (
            <div className="luoi-the">
              {ds.map((r, i) => (
                <div key={r.id} className="the-uv" data-hang={i} onClick={() => mo(r)} style={hl === i ? { boxShadow: '0 0 0 3px var(--pink)' } : null}>
                  <div className="anh">
                    {r.anh ? <AnhKho path={r.anh} alt={r.ho_ten} /> : <div className="hang" style={{ height: '100%', justifyContent: 'center' }}><Avatar ten={r.ho_ten} co="xl" /></div>}
                    <div className="tren"><StageTag ma={r.trang_thai} />{r.diem_tb != null && <Diem v={r.diem_tb} />}</div>
                    <div className="duoi"><b className="cat" style={{ display: 'block' }}>{r.ho_ten} {r.uu_tien && <Star size={13} fill="#F5A524" color="#F5A524" />}</b><span>{r.tuoi} tuổi · {r.chieu_cao}cm · {r.khu_vuc_mong_muon || r.cho_o}</span></div>
                  </div>
                  <div className="chan">
                    <span className="nho cat gian" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{r.vi_tri}</span>
                    {r.video_giay != null && <span className="tag"><Film size={12} />{fmtGiay(r.video_giay)}</span>}
                    <span className="nho muted">{tuongDoi(r.nop_luc)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bang-uv">
              <div className="cuon cuon-mong">
                <div className="luoi">
                  <div className="dau">
                    {s.coSua ? <button className={'o-chon' + (tatCaChon ? ' on' : '')} onClick={() => setChon(tatCaChon ? [] : ds.map((r) => r.id))} aria-label="Chọn tất cả">{tatCaChon && <Check size={13} strokeWidth={3} />}</button> : <span>#</span>}
                    <button className={loc.sap_xep === 'ten' ? 'on' : ''} onClick={() => setLoc((l) => ({ ...l, sap_xep: 'ten' }))}>Ứng viên</button>
                    <span>Vị trí</span><span>Khu vực</span><span>Video</span><span>Giai đoạn</span>
                    <button className={loc.sap_xep === 'diem' ? 'on' : ''} onClick={() => setLoc((l) => ({ ...l, sap_xep: 'diem' }))}>Điểm</button>
                    <button className={['moi_nhat', 'cu_nhat'].includes(loc.sap_xep) ? 'on' : ''} onClick={() => setLoc((l) => ({ ...l, sap_xep: l.sap_xep === 'moi_nhat' ? 'cu_nhat' : 'moi_nhat' }))}>Nộp lúc</button>
                  </div>
                  {ds.map((r, i) => {
                    const daChon = chon.includes(r.id)
                    return (
                      <div key={r.id} data-hang={i} className={'dong' + (daChon ? ' chon' : '') + (xem?.id === r.id || hl === i ? ' dang-xem' : '')} onClick={() => { setHl(i); mo(r) }}>
                        {s.coSua ? <button className={'o-chon' + (daChon ? ' on' : '')} onClick={(e) => { e.stopPropagation(); setChon((c) => (daChon ? c.filter((y) => y !== r.id) : [...c, r.id])) }} aria-label={'Chọn ' + r.ho_ten}>{daChon && <Check size={13} strokeWidth={3} />}</button> : <span className="nho muted">{i + 1}</span>}
                        <div className="ten-uv">
                          <Avatar ten={r.ho_ten} path={r.anh} />
                          <div className="gian"><b className="cat">{r.ho_ten} {r.uu_tien && <Star size={12} className="uu-tien-sao" fill="currentColor" />}</b><span className="cat"><i className="chi-dt">{tenNgan(r.vi_tri)} · </i>{r.tuoi} tuổi · {r.chieu_cao}cm/{r.can_nang}kg · {fmtSdt(r.sdt)}</span></div>
                        </div>
                        <span className="cat">{tenNgan(r.vi_tri)}</span>
                        <span className="cat muted-2">{r.khu_vuc_mong_muon || r.cho_o}</span>
                        <span>{r.video_giay != null ? <span className="co-video"><i><Film size={10} /></i>{fmtGiay(r.video_giay)}</span> : <span className="muted">—</span>}</span>
                        <span><StageTag ma={r.trang_thai} /></span>
                        <span><Diem v={r.diem_tb} /></span>
                        <span className="nho muted">{tuongDoi(r.nop_luc)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {data && ds.length < data.tong && (
            <div className="chan-bang"><Btn kieu="trang" co="md" loading={loading} onClick={() => setSoDong((n) => n + 50)}>Xem thêm ({data.tong - ds.length})</Btn></div>
          )}
        </div>
        {xem && <XemNhanh r={ds.find((x) => x.id === xem.id) || xem} dong={() => setXem(null)} doiGD={doiGD} henPV={() => setHenCho(xem)} />}
      </div>

      {chon.length > 0 && (
        <div className="thanh-chon" role="toolbar" aria-label="Thao tác hàng loạt">
          <b>Đã chọn {chon.length}</b>
          <MenuGiaiDoan nut={<Btn kieu="trang" co="sm" icon={ArrowRight}>Chuyển giai đoạn</Btn>} chon={(tt) => doiGD(chon, tt, ds.filter((r) => chon.includes(r.id)))} />
          <Menu canh="trai" rong={240} nut={<Btn kieu="trang" co="sm" icon={UserCheck}>Phân công</Btn>}>
            {(dong) => <>
              <div className="tieu">Người phụ trách</div>
              {s.dm.nhanSu.filter((n) => n.hoat_dong).map((n) => (
                <button key={n.id} onClick={async () => { dong(); try { for (const id of chon) await rpc('td_cap_nhat_ho_so', { p_id: id, p: { nguoi_phu_trach: n.id } }); bao('Đã phân công ' + chon.length + ' hồ sơ cho ' + n.ho_ten); setChon([]); reload(true) } catch (e) { bao(e.message, 'loi') } }}>{n.ho_ten}</button>
              ))}
            </>}
          </Menu>
          {s.vaiTro !== 'phong_van' && <Btn kieu="trang" co="sm" icon={Download} onClick={() => xuat(true)}>Excel</Btn>}
          <button className="icon-btn sm kinh" onClick={() => setChon([])} aria-label="Bỏ chọn"><X size={16} /></button>
        </div>
      )}

      <Modal mo={moLoc} dong={() => setMoLoc(false)} tieuDe="Bộ lọc" moTa="Lọc hồ sơ theo vị trí, nguồn, người phụ trách, thời gian."
        chan={<><Btn kieu="trong" onClick={() => setLoc((l) => ({ vi_tri_id: '', ma_nguon: '', phu_trach: '', uu_tien: false, tu: '', den: '', sap_xep: l.sap_xep }))}>Đặt lại</Btn><Btn kieu="den" onClick={() => setMoLoc(false)}>Xem {data?.tong ?? ''} hồ sơ</Btn></>}>
        <div className="cot" style={{ gap: 16 }}>
          <div><span className="nhan-nhom">Vị trí</span><Chips co="sm" ds={[{ v: '', t: 'Tất cả' }, ...s.dm.viTri.map((v) => ({ v: String(v.id), t: v.ten }))]} giaTri={String(loc.vi_tri_id || '')} onChon={(v) => setLoc((l) => ({ ...l, vi_tri_id: v }))} /></div>
          <div><span className="nhan-nhom">Kênh / mã QR</span><Chips co="sm" ds={[{ v: '', t: 'Tất cả' }, ...s.dm.nguon.map((n) => ({ v: n.ma, t: n.ten }))]} giaTri={loc.ma_nguon || ''} onChon={(v) => setLoc((l) => ({ ...l, ma_nguon: v }))} /></div>
          <div><span className="nhan-nhom">Người phụ trách</span><Chips co="sm" ds={[{ v: '', t: 'Tất cả' }, { v: 'toi', t: 'Của tôi' }, { v: 'chua', t: 'Chưa phân công' }, ...s.dm.nhanSu.filter((n) => n.hoat_dong).map((n) => ({ v: n.id, t: n.ho_ten }))]} giaTri={loc.phu_trach || ''} onChon={(v) => setLoc((l) => ({ ...l, phu_trach: v }))} /></div>
          <div className="luoi-2">
            <Field nhan="Nộp từ ngày" type="date" value={loc.tu} onChange={(e) => setLoc((l) => ({ ...l, tu: e.target.value }))} />
            <Field nhan="Đến ngày" type="date" value={loc.den} onChange={(e) => setLoc((l) => ({ ...l, den: e.target.value }))} />
          </div>
          <Chips ds={[{ v: 'uu', t: 'Chỉ hồ sơ ưu tiên ★' }]} nhieu tick co="sm" giaTri={loc.uu_tien ? ['uu'] : []} onChon={(v) => setLoc((l) => ({ ...l, uu_tien: v.includes('uu') }))} />
        </div>
      </Modal>
      {giaoDienGD}
      {henCho && <LichModal hoSo={henCho} dong={() => setHenCho(null)} xong={() => { setHenCho(null); reload(true); s.taiDem() }} />}
    </>
  )
}

function XemNhanh({ r, dong, doiGD, henPV }) {
  const s = useStaff()
  return (
    <aside className="xem-nhanh" aria-label="Xem nhanh hồ sơ">
      <div className="bia">
        {r.anh ? <AnhKho path={r.anh} alt={r.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="glow hong" style={{ width: 200, height: 200, left: 60, top: -40, opacity: 0.6 }} />}
        <button className="icon-btn sm kinh dong-x" onClick={dong} aria-label="Đóng"><X size={16} /></button>
      </div>
      <div className="noi">
        <div>
          <span className="eyebrow">{r.ma}</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{r.ho_ten}</h2>
          <p className="nho muted-2" style={{ marginTop: 4 }}>{r.vi_tri} · {r.tuoi} tuổi · {r.chieu_cao}cm/{r.can_nang}kg</p>
        </div>
        <div className="hang wrap" style={{ gap: 6 }}><StageTag ma={r.trang_thai} lg /><Diem v={r.diem_tb} />{r.uu_tien && <span className="tag lg" style={{ background: '#FFF4DB', color: '#9A6A00' }}><Star size={12} fill="currentColor" />Ưu tiên</span>}</div>
        <dl className="cap-tl" style={{ gridTemplateColumns: '1fr' }}>
          <dt>Điện thoại</dt><dd><a href={'tel:' + r.sdt}>{fmtSdt(r.sdt)}</a></dd>
          <dt>Chỗ ở · khu vực mong muốn</dt><dd>{r.cho_o}{r.khu_vuc_mong_muon ? ' · ' + r.khu_vuc_mong_muon : ''}</dd>
          <dt>Học vấn</dt><dd>{r.hoc_van || '—'}</dd>
          <dt>Nguồn</dt><dd>{(r.nguon || []).join(', ') || '—'}</dd>
          <dt>Nộp lúc</dt><dd>{fmtNgayGio(r.nop_luc)}</dd>
        </dl>
        <div className="cot" style={{ gap: 8 }}>
          <Link to={'/quan-tri/ung-vien/' + r.id} className="btn den rong co-orb" style={{ justifyContent: 'space-between' }}>Mở hồ sơ đầy đủ<span className="orb sm"><ExternalLink size={15} /></span></Link>
          {s.coSua && <div className="luoi-2">
            <Btn co="md" icon={CalendarPlus} onClick={henPV}>Hẹn PV</Btn>
            <MenuGiaiDoan nut={<Btn co="md" icon={Filter} className="rong">Giai đoạn</Btn>} chon={(tt) => doiGD([r.id], tt, [r])} />
          </div>}
          <a className="btn md vien" href={'tel:' + r.sdt}><Phone size={16} />Gọi {fmtSdt(r.sdt)}</a>
        </div>
      </div>
    </aside>
  )
}
