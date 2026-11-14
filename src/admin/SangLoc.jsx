import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Film, Mic, Phone, SkipForward, Sparkles, ThumbsDown } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync, usePhim } from '../lib/hooks'
import { fmtNgayGio, fmtSdt, tuongDoi } from '../lib/format'
import { AnhKho, Avatar, Btn, Chips, Empty, Lightbox, Skeleton, useToast } from '../components/ui'
import { useStaff } from './context'
import { TrinhPhat } from './Profile'

const LY_DO = ['Hồ sơ chưa đủ ảnh/video', 'Chưa phù hợp ngoại hình, tác phong', 'Khu vực quá xa', 'Không đúng độ tuổi', 'Thông tin không rõ ràng', 'Trùng hồ sơ']

// Sàng lọc nhanh: xem lần lượt từng hồ sơ chờ sàng lọc, quyết định bằng 1 chạm (← loại · → qua)
export default function SangLoc() {
  const s = useStaff()
  const nav = useNavigate()
  const bao = useToast()
  const { data, loading, reload } = useAsync(() => rpc('td_ds_ho_so', { p: { trang_thai: ['moi', 'sang_loc'], sap_xep: 'cu_nhat', so_dong: 200 } }), [])
  const [bo, setBo] = useState([])
  const [i, setI] = useState(0)
  const [ct, setCt] = useState(null)
  const [loai, setLoai] = useState(false)
  const [lyDo, setLyDo] = useState('')
  const [dang, setDang] = useState(false)
  const [anhMo, setAnhMo] = useState(null)
  const [daXu, setDaXu] = useState(0)
  const ds = (data?.dong || []).filter((r) => !bo.includes(r.id))
  const r = ds[i] || ds[0]

  useEffect(() => {
    if (!r) { setCt(null); return }
    let song = true
    setCt(null); setLoai(false); setLyDo('')
    rpc('td_chi_tiet', { p_id: r.id }).then((x) => { if (song) setCt(x) }).catch(() => {})
    return () => { song = false }
  }, [r?.id])

  async function quyet(kq) {
    if (!r || dang || !s.coSua) return
    if (kq === 'khong_qua' && !loai) { setLoai(true); return }
    if (kq === 'qua') { nav('/quantri/ung-vien/' + r.id + '/cham'); return }
    setDang(true)
    try {
      await rpc('td_ket_qua_pv', { p_id: r.id, p: { ket_qua: 'khong_dat', ghi_chu: lyDo || null } })
      bao(r.ho_ten + ': đã loại', 'hong')
      setBo((b) => [...b, r.id]); setDaXu((n) => n + 1); s.taiDem()
    } catch (e) { bao(e.message, 'loi') }
    setDang(false)
  }
  usePhim(['ArrowRight', 'ArrowLeft', ' ', 'Escape'], (e) => {
    if (anhMo != null) return
    if (e.key === 'ArrowRight') { e.preventDefault(); quyet('qua') }
    if (e.key === 'ArrowLeft') { e.preventDefault(); quyet('khong_qua') }
    if (e.key === ' ') { e.preventDefault(); setI((x) => (x + 1) % Math.max(1, ds.length)) }
    if (e.key === 'Escape') setLoai(false)
  })

  const h = ct?.ho_so
  const anh = ct ? ct.tep.filter((t) => t.loai === 'anh') : []
  const video = ct ? ct.tep.filter((t) => t.loai === 'video') : []

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">Xem nhanh hồ sơ mới</span>
          <h1><b>{data ? ds.length : '…'}</b> hồ sơ chờ xử lý{daXu ? <span className="nho muted" style={{ fontSize: 14, marginLeft: 10 }}>· đã xử lý {daXu}</span> : null}</h1>
          <p className="phu">Xem ảnh, video rồi quyết định: <b>→</b> phỏng vấn ngay · <b>←</b> loại · <b>Space</b> để sau</p>
        </div>
        <Btn kieu="trang" co="md" onClick={() => { setBo([]); setI(0); reload() }}>Làm mới</Btn>
      </header>

      {loading && !data ? <Skeleton h={520} style={{ borderRadius: 30 }} /> : !r ? (
        <div className="card"><Empty icon={Sparkles} tieuDe="Đã xử lý hết!">Không còn hồ sơ nào chờ xử lý. Hồ sơ mới sẽ tự hiện ở đây.</Empty></div>
      ) : (
        <>
          <div className="loc-cuon" aria-label="Hàng đợi">
            {ds.slice(0, 30).map((x, j) => (
              <button key={x.id} type="button" onClick={() => setI(j)} title={x.ho_ten} style={{ border: 'none', background: 'none', padding: 2, borderRadius: '50%', boxShadow: x.id === r.id ? '0 0 0 3px var(--pink)' : 'none', flex: 'none' }}>
                <Avatar ten={x.ho_ten} path={x.anh} co="sm" />
              </button>
            ))}
          </div>
          <div className="hai-cot">
            <section className="card lon" style={{ padding: 18 }}>
              {!ct ? <Skeleton h={480} /> : (
                <div className="hang" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px', minWidth: 0, maxWidth: 420 }}>
                    {video[0] ? <TrinhPhat v={video[0]} /> : <div className="video-khung hang" style={{ justifyContent: 'center', color: '#fff' }}><Film size={28} />&nbsp;Không có video</div>}
                  </div>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }} className="luoi-anh-hs">
                    {anh.map((a, j) => <div key={a.id} className="o" onClick={() => setAnhMo(j)}><AnhKho path={a.duong_dan_nho || a.duong_dan} alt="" /></div>)}
                  </div>
                </div>
              )}
            </section>
            <section className="card nho-cot" style={{ position: 'sticky', top: 16 }}>
              <div className="hang" style={{ gap: 14 }}>
                <Avatar ten={r.ho_ten} path={r.anh} co="lg" />
                <div className="gian"><h2 style={{ fontSize: 21 }}>{r.ho_ten}</h2><p className="nho muted-2">{r.vi_tri} · {r.tuoi} tuổi · {r.chieu_cao}cm/{r.can_nang}kg</p></div>
              </div>
              <dl className="cap-tl" style={{ gridTemplateColumns: '1fr', marginTop: 14 }}>
                <dt>Chỗ ở · khu vực muốn làm</dt><dd>{r.cho_o}{r.khu_vuc_mong_muon ? ' · ' + r.khu_vuc_mong_muon : ''}</dd>
                <dt>Học vấn</dt><dd>{r.hoc_van || '—'}</dd>
                {h && <><dt>Kinh nghiệm</dt><dd style={{ fontWeight: 500 }}>{h.kinh_nghiem || '—'}</dd><dt>Thu nhập mong muốn · định hướng</dt><dd>{h.thu_nhap_mong_muon || '—'} · {h.dinh_huong || '—'}</dd></>}
                <dt>Điện thoại · nộp lúc</dt><dd><a href={'tel:' + r.sdt}>{fmtSdt(r.sdt)}</a> · {tuongDoi(r.nop_luc)}</dd>
              </dl>
              {ct?.trung_sdt?.length > 0 && <div className="bao vang" style={{ marginBottom: 12 }}><AlertTriangle size={16} /><div>SĐT đã nộp {ct.trung_sdt.length} hồ sơ khác (gần nhất {fmtNgayGio(ct.trung_sdt[0].nop_luc)}).</div></div>}
              {loai && (
                <div className="cot" style={{ gap: 8, marginBottom: 12 }}>
                  <span className="nhan-nhom" style={{ margin: 0 }}>Lý do loại (không bắt buộc)</span>
                  <Chips ds={LY_DO} giaTri={lyDo} onChon={setLyDo} co="sm" />
                </div>
              )}
              {s.coSua ? (
                <div className="luoi-2">
                  <Btn kieu="do" co="lg" icon={ThumbsDown} loading={dang && loai} onClick={() => quyet('khong_qua')}>{loai ? 'Xác nhận loại' : 'Loại'}</Btn>
                  <Btn kieu="den" co="lg" icon={Mic} onClick={() => quyet('qua')}>Phỏng vấn</Btn>
                </div>
              ) : <p className="nho muted">Vai trò của bạn chỉ xem.</p>}
              <div className="hang" style={{ marginTop: 10, justifyContent: 'space-between' }}>
                <Btn kieu="trong" co="sm" icon={SkipForward} onClick={() => setI((x) => (x + 1) % ds.length)}>Bỏ qua</Btn>
                <a className="btn sm trong" href={'tel:' + r.sdt}><Phone size={15} />Gọi</a>
                <Link to={'/quantri/ung-vien/' + r.id} className="btn sm trong"><ExternalLink size={15} />Hồ sơ đầy đủ</Link>
              </div>
            </section>
          </div>
        </>
      )}
      {anhMo != null && <Lightbox ds={anh.map((a) => a.duong_dan)} chiSo={anhMo} dong={() => setAnhMo(null)} />}
    </>
  )
}
