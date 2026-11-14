import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarPlus, Check, ChevronLeft, ChevronRight, ClipboardCheck, Copy, MapPin, MoreHorizontal, Pencil, Phone, UserX, Video } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { congNgay, dauTuan, fmtGio, ngayVN, thu } from '../lib/format'
import { HINH_THUC, LICH_TT } from '../lib/stages'
import { Avatar, Btn, Diem, Empty, IconBtn, LichTag, Menu, Segment, Skeleton, StageTag, useToast, useXacNhan } from '../components/ui'
import { useStaff } from './context'
import LichModal, { tinMoi } from './LichModal'

export default function Interviews() {
  const s = useStaff()
  const bao = useToast()
  const xacNhan = useXacNhan()
  const hnay = ngayVN()
  const [tuan, setTuan] = useState(dauTuan(hnay))
  const [loc, setLoc] = useState(s.vaiTro === 'phong_van' ? 'toi' : 'tat_ca')
  const [moLich, setMoLich] = useState(null)
  const den = congNgay(tuan, 6)
  const { data, loading, reload } = useAsync(() => rpc('td_ds_lich', { p_tu: tuan, p_den: den }), [tuan, s.nhip])
  const ds = useMemo(() => (data || []).filter((l) => (loc === 'toi' ? l.cua_toi : true) && (loc === 'cho' ? ['cho_xac_nhan', 'xin_doi'].includes(l.trang_thai) : true)), [data, loc])
  const theoNgay = useMemo(() => {
    const g = {}
    for (const l of ds) (g[ngayVN(l.bat_dau)] = g[ngayVN(l.bat_dau)] || []).push(l)
    return g
  }, [ds])
  const dem = (tt) => (data || []).filter((l) => tt.includes(l.trang_thai)).length

  async function doi(l, tt) {
    if (tt === 'huy' && !(await xacNhan({ tieuDe: 'Hủy lịch phỏng vấn?', moTa: l.ho_so.ho_ten + ' · ' + fmtGio(l.bat_dau), nut: 'Hủy lịch', nguyHiem: true }))) return
    try { await rpc('td_doi_lich', { p_id: l.id, p_trang_thai: tt }); bao('Đã cập nhật: ' + LICH_TT[tt].ten); reload(true); s.taiDem() } catch (e) { bao(e.message, 'loi') }
  }
  const nhanTuan = (() => { const a = tuan.split('-'), b = den.split('-'); return a[2] + '/' + a[1] + ' – ' + b[2] + '/' + b[1] + '/' + b[0] })()

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <span className="eyebrow">Phỏng vấn</span>
          <h1>Lịch tuần <b>{nhanTuan}</b></h1>
        </div>
        <div className="hang" style={{ gap: 6 }}>
          <IconBtn icon={ChevronLeft} nhan="Tuần trước" onClick={() => setTuan((t) => congNgay(t, -7))} />
          <Btn kieu="trang" co="md" onClick={() => setTuan(dauTuan(hnay))} disabled={tuan === dauTuan(hnay)}>Tuần này</Btn>
          <IconBtn icon={ChevronRight} nhan="Tuần sau" onClick={() => setTuan((t) => congNgay(t, 7))} />
        </div>
        {s.coSua && <Btn kieu="den" orb="trai" icon={CalendarPlus} onClick={() => setMoLich({})}>Hẹn phỏng vấn</Btn>}
      </header>

      <div className="hang wrap" style={{ gap: 10 }}>
        <Segment trang ds={[{ v: 'tat_ca', t: 'Tất cả · ' + (data || []).length }, { v: 'toi', t: 'Của tôi · ' + (data || []).filter((l) => l.cua_toi).length }, { v: 'cho', t: 'Cần xử lý · ' + dem(['cho_xac_nhan', 'xin_doi']) }]} giaTri={loc} onChon={setLoc} />
        <span className="day hang wrap nho muted-2" style={{ gap: 12, fontWeight: 600 }}>
          <span>✓ {dem(['da_xac_nhan'])} đã xác nhận</span><span>⏳ {dem(['cho_xac_nhan'])} chờ xác nhận</span><span style={{ color: 'var(--err)' }}>↻ {dem(['xin_doi'])} xin đổi lịch</span>
        </span>
      </div>

      {loading && !data ? <div className="cot" style={{ gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={86} style={{ borderRadius: 24 }} />)}</div> : (
        <div className="tuan">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const ngay = congNgay(tuan, i)
            const muc = theoNgay[ngay] || []
            if (!muc.length && ngay < hnay) return null
            return (
              <div key={ngay} className={'ngay-lich' + (ngay === hnay ? ' hom-nay' : '')}>
                <div className="nhan-ngay"><small>{ngay === hnay ? 'Hôm nay' : thu(ngay + 'T12:00:00+07:00')}</small><b>{ngay.slice(8, 10)}</b><small style={{ letterSpacing: 0, fontWeight: 600 }}>Th {Number(ngay.slice(5, 7))}</small></div>
                <div className="ds">
                  {!muc.length && <div className="trong-ngay">Không có lịch</div>}
                  {muc.map((l) => {
                    const h = l.ho_so
                    const xongLich = ['huy', 'da_dien_ra', 'vang_mat'].includes(l.trang_thai)
                    return (
                      <div key={l.id} className="muc-lich" style={l.trang_thai === 'huy' ? { opacity: 0.55 } : null}>
                        <div className="gio"><b>{fmtGio(l.bat_dau)}</b><span>{l.thoi_luong} phút</span></div>
                        <Link to={'/quantri/ung-vien/' + h.id} className="ai">
                          <Avatar ten={h.ho_ten} path={h.anh} />
                          <span className="gian"><b className="cat">{h.ho_ten}</b><span className="cat" style={{ display: 'block' }}>{h.vi_tri} · {h.tuoi} tuổi · {h.sdt}</span></span>
                        </Link>
                        <span className="nho muted-2 hang cat" style={{ gap: 6, flex: '1 1 180px', minWidth: 0 }}>{l.hinh_thuc === 'online' ? <Video size={14} /> : l.hinh_thuc === 'dien_thoai' ? <Phone size={14} /> : <MapPin size={14} />}<span className="cat">{HINH_THUC[l.hinh_thuc]}{l.dia_diem ? ' · ' + l.dia_diem : ''}</span></span>
                        <span className="av-nhom" title={l.nguoi.map((n) => n.ho_ten).join(', ')}>{l.nguoi.slice(0, 3).map((n) => <Avatar key={n.id} ten={n.ho_ten} co="xs" />)}</span>
                        <LichTag ma={l.trang_thai} />
                        {h.diem_tb != null && <Diem v={h.diem_tb} />}
                        <span className="hang" style={{ gap: 6 }}>
                          {s.coCham && l.cua_toi && !l.toi_da_cham && l.trang_thai !== 'huy' && l.trang_thai !== 'vang_mat' && new Date(l.bat_dau).getTime() - Date.now() < 3 * 3600e3 && (
                            <Link to={'/quantri/ung-vien/' + h.id + '/cham'} className="btn sm den"><ClipboardCheck size={15} />Chấm điểm</Link>
                          )}
                          {l.toi_da_cham && <span className="tag" style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}><Check size={12} />Đã chấm</span>}
                          <Menu rong={230} nut={<button className="icon-btn sm mem" aria-label="Thao tác"><MoreHorizontal size={17} /></button>}>
                            {(dong) => <>
                              <button onClick={() => { dong(); navigator.clipboard?.writeText(tinMoi(s.dm.caiDat.mau_tin_hen, h, l)).then(() => bao('Đã sao chép lời mời')) }}><Copy size={15} />Sao chép lời mời</button>
                              <button onClick={() => { dong(); window.open('https://zalo.me/' + h.sdt, '_blank') }}><Phone size={15} />Mở Zalo ứng viên</button>
                              {!xongLich && s.coCham && <><hr /><button onClick={() => { dong(); doi(l, 'da_dien_ra') }}><Check size={15} />Đã phỏng vấn</button>
                                <button onClick={() => { dong(); doi(l, 'vang_mat') }}><UserX size={15} />Ứng viên vắng mặt</button></>}
                              {s.coSua && <><hr /><button onClick={() => { dong(); setMoLich({ hoSo: h, lich: l }) }}><Pencil size={15} />Sửa / dời lịch</button>
                                {l.trang_thai !== 'huy' && <button onClick={() => { dong(); doi(l, 'huy') }} style={{ color: 'var(--err)' }}><Ban size={15} />Hủy lịch</button>}</>}
                            </>}
                          </Menu>
                        </span>
                        {l.ung_vien_phan_hoi && <div className="nho" style={{ flexBasis: '100%', background: l.trang_thai === 'xin_doi' ? 'var(--err-bg)' : 'var(--soft)', color: l.trang_thai === 'xin_doi' ? 'var(--err)' : 'var(--ink-2)', borderRadius: 14, padding: '8px 12px' }}>Ứng viên: “{l.ung_vien_phan_hoi}”</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {!ds.length && <div className="card"><Empty tieuDe="Tuần này chưa có lịch">{s.coSua ? 'Bấm “Hẹn phỏng vấn” để tạo lịch mới.' : 'Lịch được phân công cho bạn sẽ hiện ở đây.'}</Empty></div>}
        </div>
      )}
      {moLich && <LichModal hoSo={moLich.hoSo} lich={moLich.lich} dong={() => setMoLich(null)} xong={() => { setMoLich(null); reload(true); s.taiDem() }} />}
    </>
  )
}
