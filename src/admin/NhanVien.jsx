import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Briefcase, Check, ChevronDown, ExternalLink, FileText, Lock, MapPin, Paperclip, Phone, Search, Store, Upload, UserCheck } from 'lucide-react'
import { docBang, moGiayTo, rpc, taiGiayTo } from '../lib/api'
import { useAsync, useDebounced } from '../lib/hooks'
import { fmtNgay, fmtNgayGio, fmtSdt, khongDau, ngayVN, tuongDoi } from '../lib/format'
import { GT_TT, NV_TT } from '../lib/stages'
import { xuatExcel } from '../lib/excel'
import { Avatar, Bao, Btn, Empty, Field, IconBtn, Menu, Modal, Segment, Skeleton, Spinner, useToast } from '../components/ui'
import { useStaff } from './context'
import { NhatKyDs } from './NhatKy'

const nd = (s) => (s ? fmtNgay(s + 'T12:00:00+07:00') : '—')
const Tag = ({ m, ma }) => { const g = m[ma]; return g ? <span className="tag" style={{ background: g.bg, color: g.fg }}>{g.ten}</span> : null }
function Thanh({ xong, tong, tre }) {
  const p = tong ? Math.round((xong / tong) * 100) : 0
  return (
    <span className="hang" style={{ gap: 8, minWidth: 0 }}>
      <span className="thanh gian" style={{ height: 8, minWidth: 60 }}><i style={{ width: p + '%', background: p === 100 ? '#12A37F' : 'var(--pink)' }} /></span>
      <b className="so nho">{xong}/{tong}</b>{tre > 0 && <span className="tag" style={{ height: 22, background: 'var(--err-bg)', color: 'var(--err)' }}>{tre} trễ</span>}
    </span>
  )
}

export function DsNhanVien() {
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const [tt, setTt] = useState('')
  const [tim, setTim] = useState('')
  const timTre = useDebounced(tim, 250)
  const { data, loading } = useAsync(() => rpc('td_ds_nhan_vien', { p: { trang_thai: tt || null, tim: timTre || null } }), [tt, timTre, s.nhip])
  if (s.vaiTro === 'phong_van') return <div className="card"><Empty icon={Lock} tieuDe="Mục này dành cho bộ phận nhân sự" /></div>
  const ds = data || []
  async function xuat() {
    await xuatExcel('NS-nhan-vien-moi-' + ngayVN() + '.xlsx', [{ ten: 'Nhân viên mới', cot: [
      { k: 'ma_nv', ten: 'Mã NV', w: 12 }, { k: 'ho_ten', ten: 'Họ tên', w: 24 }, { k: 'sdt', ten: 'SĐT', w: 13 }, { k: 'vi_tri', ten: 'Vị trí', w: 22 },
      { k: 'cua_hang_ma', ten: 'Mã CH', w: 10 }, { k: 'cua_hang', ten: 'Cửa hàng', w: 26 }, { k: 'khu_vuc', ten: 'Khu vực', w: 20 },
      { k: 'ngay_nhan_viec', ten: 'Ngày nhận việc', w: 13 }, { k: 'trang_thai', ten: 'Trạng thái', w: 12, lay: (r) => NV_TT[r.trang_thai]?.ten },
      { k: 'gt', ten: 'Giấy tờ', w: 9, lay: (r) => r.gt_xong + '/' + r.gt_tong }, { k: 'moc', ten: 'Hội nhập', w: 9, lay: (r) => r.moc_xong + '/' + r.moc_tong }], dong: ds }])
    bao('Đã xuất ' + ds.length + ' nhân viên')
  }
  return (
    <>
      <header className="trang-dau">
        <div className="tieu"><span className="eyebrow">Sau tuyển dụng</span><h1><b>{data ? ds.length : '…'}</b> nhân viên mới</h1><p className="phu">Hồ sơ nhận việc, giấy tờ, hội nhập và cửa hàng phân công</p></div>
        <Btn kieu="den" orb="trai" icon={FileText} onClick={xuat} disabled={!ds.length}>Xuất Excel</Btn>
      </header>
      <div className="loc-hang">
        <label className="input-tron"><Search size={17} /><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tên, SĐT, mã NV, cửa hàng…" aria-label="Tìm nhân viên" /></label>
        <Segment trang ds={[{ v: '', t: 'Tất cả' }, { v: 'thu_viec', t: 'Thử việc' }, { v: 'chinh_thuc', t: 'Chính thức' }, { v: 'nghi_viec', t: 'Nghỉ việc' }]} giaTri={tt} onChon={setTt} />
      </div>
      {loading && !data ? <Skeleton h={300} style={{ borderRadius: 30 }} /> : !ds.length ? (
        <div className="card"><Empty icon={UserCheck} tieuDe="Chưa có nhân viên mới">Ứng viên trúng tuyển được “Nhận việc & phân công” sẽ xuất hiện ở đây.</Empty></div>
      ) : (
        <div className="bang-uv">
          {ds.map((r) => (
            <div key={r.id} className="dong" style={{ gridTemplateColumns: 'minmax(220px,2fr) 1.6fr 1fr 1fr 1fr 90px', display: 'grid', gap: 12, alignItems: 'center', padding: '0 14px' }} onClick={() => nav('/quantri/nhan-vien/' + r.id)}>
              <div className="ten-uv"><Avatar ten={r.ho_ten} path={r.anh} /><div className="gian"><b className="cat">{r.ho_ten}</b><span className="cat">{r.ma_nv || 'Chưa có mã NV'} · {r.vi_tri}</span></div></div>
              <span className="cat"><Store size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{r.cua_hang || '—'}</span>
              <span className="nho muted-2">{nd(r.ngay_nhan_viec)}</span>
              <span title="Giấy tờ"><Thanh xong={r.gt_xong} tong={r.gt_tong} /></span>
              <span title="Hội nhập"><Thanh xong={r.moc_xong} tong={r.moc_tong} tre={r.moc_tre} /></span>
              <span><Tag m={NV_TT} ma={r.trang_thai} /></span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function ChiTietNhanVien() {
  const { id } = useParams()
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const { data: d, loading, error, reload } = useAsync(() => rpc('td_chi_tiet_nhan_vien', { p_id: id }), [id, s.nhip])
  const [chuyen, setChuyen] = useState(false)
  const [dangTai, setDangTai] = useState(null)
  const [maNv, setMaNv] = useState(null)
  if (s.vaiTro === 'phong_van') return <div className="card"><Empty icon={Lock} tieuDe="Mục này dành cho bộ phận nhân sự" /></div>
  if (error) return <div className="card"><Empty tieuDe="Không mở được hồ sơ nhân viên">{error.message}</Empty></div>
  if (loading && !d) return <Skeleton h={480} style={{ borderRadius: 30 }} />
  const n = d.nhan_vien
  const hn = ngayVN()
  async function goi(fn, args, tb) { try { await rpc(fn, args); if (tb) bao(tb); reload(true) } catch (e) { bao(e.message, 'loi') } }
  async function tai(g, files) {
    setDangTai(g.id)
    try {
      const moi = []
      for (const f of files) {
        const duoi = (/\.([a-z0-9]{2,5})$/i.exec(f.name)?.[1] || 'jpg').toLowerCase()
        moi.push(await taiGiayTo(n.id + '/' + g.loai + '-' + Date.now() + '-' + moi.length + '.' + duoi, f))
      }
      await rpc('td_cap_nhat_giay_to', { p_id: g.id, p: { trang_thai: g.trang_thai === 'da_duyet' ? 'da_duyet' : 'da_nop', duong_dan: [...(g.duong_dan || []), ...moi] } })
      bao('Đã tải ' + moi.length + ' tệp: ' + g.ten); reload(true)
    } catch (e) { bao(e.message, 'loi') }
    setDangTai(null)
  }
  async function xem(p) { try { const u = await moGiayTo(p); if (u) window.open(u, '_blank') } catch (e) { bao(e.message, 'loi') } }
  const gtXong = d.giay_to.filter((g) => g.bat_buoc && ['da_nop', 'da_duyet'].includes(g.trang_thai)).length
  const gtTong = d.giay_to.filter((g) => g.bat_buoc).length

  return (
    <>
      <section className="ho-so-hero">
        <div className="glow hong" style={{ width: 340, height: 340, right: -110, top: -160, opacity: 0.5, filter: 'blur(90px)' }} />
        <IconBtn icon={ArrowLeft} nhan="Quay lại" kieu="kinh" onClick={() => nav('/quantri/nhan-vien')} />
        <span className="av-lon" style={{ cursor: 'default' }}><Avatar ten={n.ho_ten} path={n.anh} co="xl" /></span>
        <div className="gian" style={{ flex: '1 1 260px' }}>
          <p className="eyebrow sang" style={{ marginBottom: 6 }}>{n.ma_nv || 'Chưa có mã NV'} · nhận việc {nd(n.ngay_nhan_viec)}</p>
          <h1>{n.ho_ten}</h1>
          <div className="hang wrap" style={{ gap: 8, marginTop: 10 }}>
            <span className="the-tt">{n.vi_tri}</span>
            <span className="the-tt"><Store size={13} />{n.cua_hang?.ten || '—'}</span>
            <span className="the-tt" style={{ background: NV_TT[n.trang_thai].bg, color: NV_TT[n.trang_thai].fg, fontWeight: 700 }}>{NV_TT[n.trang_thai].ten}</span>
          </div>
        </div>
        {s.coSua && (
          <div className="hang wrap" style={{ gap: 8 }}>
            <Btn kieu="trang" co="md" icon={ArrowRightLeft} onClick={() => setChuyen(true)}>Điều chuyển</Btn>
            <Menu rong={200} nut={<Btn kieu="vien-sang" co="md" icon={ChevronDown}>Trạng thái</Btn>}>
              {(dong) => Object.entries(NV_TT).map(([k, v]) => <button key={k} className={n.trang_thai === k ? 'on' : ''} onClick={() => { dong(); goi('td_cap_nhat_nhan_vien', { p_id: n.id, p: { trang_thai: k } }, 'Đã chuyển: ' + v.ten) }}>{v.ten}</button>)}
            </Menu>
            <Link to={'/quantri/ung-vien/' + n.ho_so_id} className="btn md vien-sang"><ExternalLink size={16} />Hồ sơ ứng tuyển</Link>
          </div>
        )}
      </section>

      <div className="hang wrap" style={{ gap: 8 }}>
        <a className="btn trang md" href={'tel:' + n.sdt}><Phone size={16} />{fmtSdt(n.sdt)}</a>
        {n.cua_hang?.dia_chi && <span className="btn trang md" style={{ cursor: 'default', whiteSpace: 'normal', height: 'auto', minHeight: 44, padding: '10px 18px', maxWidth: '100%', textAlign: 'left' }}><MapPin size={16} style={{ flex: 'none' }} />{n.cua_hang.dia_chi}</span>}
        {s.coSua && (maNv == null
          ? <Btn kieu="trang" co="md" icon={Briefcase} onClick={() => setMaNv(n.ma_nv || '')}>{n.ma_nv ? 'Sửa mã NV' : 'Gán mã NV'}</Btn>
          : <span className="hang" style={{ gap: 6 }}><input className="chip" style={{ width: 140, border: 'none', outline: 'none', background: '#fff' }} value={maNv} onChange={(e) => setMaNv(e.target.value.toUpperCase())} placeholder="Mã NV" autoFocus /><Btn kieu="den" co="sm" onClick={async () => { await goi('td_cap_nhat_nhan_vien', { p_id: n.id, p: { ma_nv: maNv } }, 'Đã lưu mã NV'); setMaNv(null) }}>Lưu</Btn></span>)}
      </div>

      <div className="hai-cot">
        <section className="card lon">
          <div className="dau-the"><h2>Giấy tờ nhận việc</h2><Thanh xong={gtXong} tong={gtTong} /></div>
          {d.giay_to.map((g) => (
            <div key={g.id} className="dong-ns">
              <span className="orb sm" style={g.trang_thai === 'da_duyet' ? { background: '#12A37F' } : g.trang_thai === 'chua_nop' ? { background: '#DCD6E0' } : null}>{g.trang_thai === 'da_duyet' ? <Check size={15} /> : <Paperclip size={14} />}</span>
              <div className="gian" style={{ flex: '1 1 200px' }}>
                <b>{g.ten}{!g.bat_buoc && <span className="tag" style={{ marginLeft: 8, height: 22 }}>Không bắt buộc</span>}</b>
                <span>{g.duong_dan?.length ? g.duong_dan.map((p, i) => <button key={p} type="button" onClick={() => xem(p)} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--pink-deep)', fontWeight: 700, marginRight: 10, cursor: 'pointer' }}>Tệp {i + 1}</button>) : 'Chưa có tệp'}{g.nguoi ? ' · ' + g.nguoi + ' · ' + tuongDoi(g.cap_nhat_luc) : ''}</span>
              </div>
              <Tag m={GT_TT} ma={g.trang_thai} />
              {s.coSua && <>
                <label className="btn sm trang" style={{ position: 'relative' }}>{dangTai === g.id ? <Spinner size={14} /> : <Upload size={15} />}Tải lên
                  <input type="file" accept="image/*,application/pdf" multiple style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={(e) => { tai(g, [...e.target.files]); e.target.value = '' }} /></label>
                <Menu rong={190} nut={<IconBtn icon={ChevronDown} nhan="Đổi trạng thái" co="sm" kieu="mem" size={15} />}>
                  {(dong) => Object.entries(GT_TT).map(([k, v]) => <button key={k} className={g.trang_thai === k ? 'on' : ''} onClick={() => { dong(); goi('td_cap_nhat_giay_to', { p_id: g.id, p: { trang_thai: k } }) }}>{v.ten}</button>)}
                </Menu>
              </>}
            </div>
          ))}
        </section>
        <div className="nho-cot cot" style={{ gap: 18 }}>
          <section className="card">
            <div className="dau-the"><h2>Lộ trình hội nhập</h2><Thanh xong={d.moc.filter((m) => m.hoan_thanh).length} tong={d.moc.length} /></div>
            {d.moc.map((m) => {
              const tre = !m.hoan_thanh && m.han && m.han < hn
              return (
                <div key={m.id} className="hang" style={{ alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <button type="button" className={'o-chon' + (m.hoan_thanh ? ' on' : '')} disabled={!s.coSua} onClick={() => goi('td_cap_nhat_moc', { p_id: m.id, p_hoan_thanh: !m.hoan_thanh })} aria-label={m.ten}>{m.hoan_thanh && <Check size={13} strokeWidth={3} />}</button>
                  <div className="gian"><b style={{ fontSize: 13.5, textDecoration: m.hoan_thanh ? 'line-through' : 'none', color: m.hoan_thanh ? 'var(--muted)' : undefined }}>{m.ten}</b>
                    <div className="nho" style={{ color: tre ? 'var(--err)' : 'var(--muted)' }}>{m.hoan_thanh ? 'Xong · ' + (m.nguoi || '') + ' · ' + fmtNgayGio(m.hoan_thanh_luc) : 'Hạn ' + nd(m.han) + (tre ? ' · trễ hạn' : '')}</div></div>
                </div>
              )
            })}
          </section>
          <section className="card">
            <div className="dau-the"><h2>Lịch sử phân công cửa hàng</h2></div>
            <div className="dong-thoi-gian">
              {d.phan_cong.map((p, i) => (
                <div key={p.id} className="m">
                  <span className="ic" style={i === 0 ? { background: 'var(--ink)', color: '#fff' } : null}><Store size={15} /></span>
                  <div className="nd"><p>{p.cua_hang} <span className="muted" style={{ fontWeight: 500 }}>· {p.cua_hang_ma}</span></p>
                    <span>{nd(p.tu_ngay)} → {p.den_ngay ? nd(p.den_ngay) : 'nay'} · {p.nguoi || '—'}{p.ly_do ? ' · ' + p.ly_do : ''}</span></div>
                </div>
              ))}
            </div>
          </section>
          {(s.vaiTro === 'quan_tri' || s.vaiTro === 'tuyen_dung') && (
            <section className="card"><div className="dau-the"><h2>Nhật ký thay đổi</h2></div><NhatKyDs loc={{ nhan_vien_id: n.id, so_dong: 30 }} gon /></section>
          )}
        </div>
      </div>
      {chuyen && <DieuChuyen n={n} dong={() => setChuyen(false)} xong={() => { setChuyen(false); reload(true) }} />}
    </>
  )
}

function DieuChuyen({ n, dong, xong }) {
  const bao = useToast()
  const { data: ch } = useAsync(() => docBang('cua_hang', [['ten', true]]), [])
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState(null)
  const [ngay, setNgay] = useState(ngayVN())
  const [lyDo, setLyDo] = useState('')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const ds = useMemo(() => {
    const t = khongDau(tim).trim().split(/\s+/).filter(Boolean)
    return (ch || []).filter((c) => c.hoat_dong && c.ma !== n.cua_hang_ma && t.every((w) => khongDau(c.ten + ' ' + c.ma + ' ' + (c.khu_vuc || '') + ' ' + (c.dia_chi || '')).includes(w))).slice(0, 40)
  }, [ch, tim, n.cua_hang_ma])
  async function luu() {
    setLoi(null)
    if (!chon) return setLoi('Chọn cửa hàng mới')
    setDang(true)
    try { await rpc('td_dieu_chuyen', { p_nhan_vien_id: n.id, p_cua_hang_ma: chon.ma, p_tu_ngay: ngay, p_ly_do: lyDo }); bao('Đã điều chuyển về ' + chon.ten); xong() } catch (e) { setLoi(e.message) }
    setDang(false)
  }
  return (
    <Modal mo rong dong={dong} tieuDe="Điều chuyển cửa hàng" moTa={'Hiện tại: ' + (n.cua_hang?.ten || '—') + ' · lịch sử được lưu lại đầy đủ'}
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={ArrowRightLeft} loading={dang} onClick={luu}>Xác nhận điều chuyển</Btn></>}>
      <div className="cot" style={{ gap: 12 }}>
        <div className="luoi-2">
          <Field kieu="gon" nhan="Làm tại cửa hàng mới từ ngày" type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
          <Field kieu="gon" nhan="Lý do" value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Bổ sung nhân sự CH mới" />
        </div>
        <label className="input-tron" style={{ background: 'var(--soft)', boxShadow: 'none' }}><Search size={17} /><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm cửa hàng…" autoFocus /></label>
        {chon && <div className="bao ok"><Store size={17} /><div><b>{chon.ten}</b> · {chon.ma}</div></div>}
        <div className="cot cuon-mong" style={{ gap: 4, maxHeight: 260, overflow: 'auto' }}>
          {!ch ? <Spinner /> : ds.map((c) => (
            <button key={c.ma} type="button" className="dong-hs" style={{ border: 'none', background: chon?.ma === c.ma ? 'var(--soft)' : 'none', textAlign: 'left', width: '100%', padding: '8px 10px' }} onClick={() => setChon(c)}>
              <span className="orb xs"><Store size={13} /></span><span className="gian"><b className="cat">{c.ten}</b><span className="cat" style={{ display: 'block' }}>{c.ma} · {c.khu_vuc || ''}</span></span>
            </button>
          ))}
        </div>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}
