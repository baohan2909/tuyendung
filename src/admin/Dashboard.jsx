import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus, ChevronRight, Film, Search, Star } from 'lucide-react'
import { rpc } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { chaoTheoGio, congNgay, fmtGiay, fmtGio, ngayDai, ngayVN, phanTram, tenGoi, thu, tuongDoi } from '../lib/format'
import { HINH_THUC } from '../lib/stages'
import { Avatar, BieuDoCot, Btn, Empty, LichTag, Segment, Skeleton, StageTag } from '../components/ui'
import { useStaff } from './context'
import LichModal from './LichModal'
import { ChiTietNgay, GioNopHoSo, NutDong } from './ThongKeGio'

export const tenNgan = (t) => { const x = String(t || '').replace(/^Cộng tác viên.*/i, 'CTV').replace(/^Nhân viên /i, ''); return x.charAt(0).toUpperCase() + x.slice(1) }
const MAU_PHEU = ['#F3C6DA', '#EC9CC0', '#E26FA2', '#D6006C', '#A3004F', '#17111A']
const BUOC_PHEU = [['nop', 'Nộp hồ sơ'], ['hen_pv', 'Vào phỏng vấn'], ['da_pv', 'Đã phỏng vấn'], ['dat', 'Trúng tuyển'], ['nhan_viec', 'Nhận việc']]

function Kpi({ to, nhan, so, delta, kieuDelta = 'len', ghi, cham, nen }) {
  const Goc = to ? Link : 'div'
  return (
    <Goc to={to} className="kpi">
      <span className="blob" style={{ background: nen }} />
      <span className="nhan"><i style={{ background: cham }} />{nhan}</span>
      <span className="so-lon"><b>{so ?? '—'}</b>{delta && <span className={'delta ' + kieuDelta}>{delta}</span>}</span>
      <span className="ghi">{ghi}</span>
    </Goc>
  )
}

export default function Dashboard() {
  const s = useStaff()
  const nav = useNavigate()
  const { data: d, loading, reload } = useAsync(() => rpc('td_tong_quan'), [s.nhip])
  const [vt, setVt] = useState('tat_ca')
  const [tim, setTim] = useState('')
  const [moLich, setMoLich] = useState(false)
  const [ngayGio, setNgayGio] = useState(null)

  const k = d?.kpi || {}
  const pheu = useMemo(() => {
    if (!d) return null
    if (vt === 'tat_ca') return d.pheu
    return (d.pheu_vi_tri || []).find((x) => String(x.id) === vt) || null
  }, [d, vt])
  const tongNguon = (d?.nguon || []).reduce((a, x) => a + x.n, 0)
  const doiTuan = k.moi_7n_truoc ? Math.round(((k.moi_7n - k.moi_7n_truoc) / k.moi_7n_truoc) * 100) : null
  const xuHuong = (d?.xu_huong || []).map((x) => ({ ngay: x.ngay, n: x.n, nhan: x.ngay.slice(8, 10) + '/' + x.ngay.slice(5, 7), nhanDai: thu(x.ngay + 'T12:00:00+07:00') + ' ' + x.ngay.slice(8, 10) + '/' + x.ngay.slice(5, 7) }))
  const hnay = ngayVN()
  const tu14 = xuHuong[0]?.ngay || congNgay(hnay, -13)
  const { data: g14 } = useAsync(() => rpc('td_hs_theo_gio', { p: { tu: tu14, den: hnay } }), [tu14, hnay, s.nhip])
  const iChon = ngayGio ? xuHuong.findIndex((x) => x.ngay === ngayGio) : -1

  return (
    <>
      <header className="trang-dau">
        <div className="tieu">
          <h1 style={{ fontWeight: 800, fontSize: 26 }}>{chaoTheoGio()}, {tenGoi(s.toi.ho_ten)}</h1>
          <p className="phu">{ngayDai()} · {loading && !d ? '…' : (k.cho_xu_ly || 0) + ' hồ sơ mới chờ xử lý'}</p>
        </div>
        <form className="input-tron" style={{ flex: '0 1 320px' }} onSubmit={(e) => { e.preventDefault(); nav('/quantri/ung-vien?tim=' + encodeURIComponent(tim)) }}>
          <Search size={18} />
          <input aria-label="Tìm ứng viên" placeholder="Tìm tên, số điện thoại, mã hồ sơ…" value={tim} onChange={(e) => setTim(e.target.value)} />
        </form>
        {s.coSua && <Btn kieu="den" orb="trai" icon={CalendarPlus} onClick={() => setMoLich(true)}>Hẹn phỏng vấn</Btn>}
      </header>

      <section className="kpis" aria-label="Chỉ số">
        {loading && !d ? [0, 1, 2, 3].map((i) => <div key={i} className="kpi"><Skeleton h={14} w="60%" /><Skeleton h={36} w="40%" /><Skeleton h={12} w="70%" /></div>) : <>
          <Kpi to="/quantri/ung-vien" nhan="Hồ sơ mới · 7 ngày" so={k.moi_7n} cham="#D6006C" nen="#FDEBF3"
            delta={doiTuan == null ? null : (doiTuan > 0 ? '+' : doiTuan < 0 ? '−' : '') + Math.abs(doiTuan) + '%'} kieuDelta={doiTuan > 0 ? 'len' : doiTuan < 0 ? 'xuong' : 'trung'} ghi={'So với 7 ngày trước (' + (k.moi_7n_truoc || 0) + ')'} />
          <Kpi to="/quantri/sang-loc" nhan="Chờ xử lý" so={k.cho_xu_ly} cham="#D98A1C" nen="#FDF3E3" delta={(k.moi_hom_nay || 0) + ' hôm nay'} kieuDelta="trung" ghi="Hồ sơ ở giai đoạn Mới" />
          <Kpi to="/quantri/phong-van" nhan="Phỏng vấn tuần này" so={k.pv_tuan} cham="#3B6FE0" nen="#EAF0FD" delta={(k.pv_hom_nay || 0) + ' hôm nay'} kieuDelta="trung" ghi="Lịch đã hẹn trong tuần" />
          {s.vaiTro === 'phong_van'
            ? <Kpi to="/quantri/phong-van" nhan="Chờ bạn chấm điểm" so={k.cho_cham} cham="#7B2CBF" nen="#EFE8FB" ghi="Phỏng vấn đã diễn ra, chưa gửi phiếu" />
            : <Kpi to="/quantri/ung-vien?gd=nhan_viec" nhan="Nhận việc · tháng" so={k.nhan_viec_thang} cham="#12A37F" nen="#E6F6F0" delta={(k.dat_thang || 0) + ' đạt'} kieuDelta="len" ghi="Ứng viên đã nhận việc trong tháng" />}
        </>}
      </section>

      <div className="hai-cot">
        <section className="card lon" aria-label="Phễu tuyển dụng">
          <div className="dau-the" style={{ flexWrap: 'wrap' }}>
            <h2 style={{ flex: '1 1 220px' }}>Phễu tuyển dụng · 30 ngày</h2>
            <Segment ds={[{ v: 'tat_ca', t: 'Tất cả' }, ...(d?.pheu_vi_tri || []).map((x) => ({ v: String(x.id), t: tenNgan(x.ten) }))]} giaTri={vt} onChon={setVt} />
          </div>
          {!pheu ? <div className="cot">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={24} />)}</div> : (
            <div className="pheu">
              {BUOC_PHEU.map(([ma, ten], i) => {
                const n = pheu[ma] || 0
                const tong = pheu.nop || 0
                return (
                  <div key={ma} className="d" title={ten + ': ' + n + ' (' + phanTram(n, tong) + '%)'}>
                    <span className="ten">{ten}</span>
                    <span className="ray"><i style={{ width: (tong ? (n / tong) * 100 : 0) + '%', background: MAU_PHEU[i] }} /></span>
                    <span className="sl">{n}<small>{i ? phanTram(n, tong) + '%' : '100%'}</small></span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card-dark nho-cot" aria-label="Phỏng vấn hôm nay">
          <div className="glow hong" style={{ width: 220, height: 220, right: -70, top: -90, opacity: 0.55, filter: 'blur(60px)' }} />
          <div className="glow tim" style={{ width: 160, height: 160, left: -60, bottom: -70, opacity: 0.4, filter: 'blur(60px)' }} />
          <div className="dau-the">
            <h2>Phỏng vấn hôm nay</h2>
            <span className="tag" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>{(d?.hom_nay || []).length} lịch</span>
          </div>
          <div className="cot" style={{ gap: 8 }}>
            {(d?.hom_nay || []).map((l) => (
              <Link key={l.id} to={'/quantri/ung-vien/' + l.ho_so_id} className="lich-dong">
                <span className="gio">{fmtGio(l.bat_dau)}</span>
                <span className="gian"><b className="cat">{l.ho_ten}</b><span className="cat" style={{ display: 'block' }}>{l.vi_tri} · {HINH_THUC[l.hinh_thuc]}</span></span>
                <LichTag ma={l.trang_thai} />
              </Link>
            ))}
            {d && !(d.hom_nay || []).length && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13.5, padding: '18px 4px' }}>Hôm nay chưa có lịch phỏng vấn.</p>}
            <Link to="/quantri/phong-van" className="hang nho" style={{ color: '#FF8CC0', fontWeight: 700, marginTop: 6, gap: 4 }}>Xem lịch cả tuần <ChevronRight size={15} /></Link>
          </div>
        </section>
      </div>

      <div className="hai-cot">
        <section className="card lon" aria-label="Hồ sơ mới nhất">
          <div className="dau-the"><h2>Hồ sơ mới nhất</h2><Link to="/quantri/ung-vien" className="nho dam">Xem tất cả</Link></div>
          {loading && !d ? <div className="cot">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={48} />)}</div>
            : !(d?.moi_nhat || []).length ? <Empty tieuDe="Chưa có hồ sơ">Hồ sơ ứng viên nộp sẽ xuất hiện tại đây.</Empty>
            : d.moi_nhat.map((r) => (
              <Link key={r.id} to={'/quantri/ung-vien/' + r.id} className="dong-hs">
                <Avatar ten={r.ho_ten} path={r.anh} />
                <span className="gian"><b className="cat">{r.ho_ten} {r.uu_tien && <Star size={13} className="uu-tien-sao" fill="currentColor" style={{ verticalAlign: -1 }} />}</b><span className="cat" style={{ display: 'block' }}>{r.vi_tri} · {r.tuoi} tuổi · {r.khu_vuc_mong_muon || r.cho_o}</span></span>
                {r.video_giay != null && <span className="vid"><Film size={15} />{fmtGiay(r.video_giay)}</span>}
                <StageTag ma={r.trang_thai} />
                <span className="khi">{tuongDoi(r.nop_luc)}</span>
              </Link>
            ))}
        </section>

        <div className="nho-cot cot" style={{ gap: 20 }}>
          <section className="card" aria-label="Hồ sơ theo ngày">
            <div className="dau-the" style={{ marginBottom: 6 }}><h2>Hồ sơ 14 ngày</h2>{ngayGio ? <NutDong onClick={() => setNgayGio(null)} /> : <span className="nho muted">{xuHuong.reduce((a, x) => a + x.n, 0)} hồ sơ</span>}</div>
            {d ? <BieuDoCot ds={xuHuong.map((x) => ({ ...x, mau: x.ngay === hnay ? 'var(--pink)' : '#F09BC3' }))} nhanMoi={4}
              chon={iChon < 0 ? null : iChon} onChon={(i) => setNgayGio(i == null ? null : xuHuong[i].ngay)} /> : <Skeleton h={130} />}
            {ngayGio ? (g14 ? <ChiTietNgay ngay={ngayGio} dong={g14.dong} dong14={g14.dong} soNgay={xuHuong.length || 14} /> : <Skeleton h={170} style={{ marginTop: 14 }} />)
              : d && <p className="tkg-goi-y-bam">Bấm vào một cột để xem số hồ sơ theo giờ trong ngày</p>}
          </section>
          <section className="card" aria-label="Nguồn hồ sơ">
            <h2 style={{ marginBottom: 16 }}>Nguồn hồ sơ · 30 ngày</h2>
            <div className="cot" style={{ gap: 14 }}>
              {(d?.nguon || []).map((x) => (
                <div key={x.ten} title={x.ten + ': ' + x.n + ' hồ sơ'}>
                  <div className="hang" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span className="cat" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{x.ten}</span><b className="so">{phanTram(x.n, tongNguon)}%</b></div>
                  <div className="thanh"><i style={{ width: phanTram(x.n, tongNguon) + '%' }} /></div>
                </div>
              ))}
              {d && !(d.nguon || []).length && <p className="nho muted">Chưa có dữ liệu.</p>}
            </div>
          </section>
        </div>
      </div>
      <GioNopHoSo nhip={s.nhip} />
      {moLich && <LichModal dong={() => setMoLich(false)} xong={() => { setMoLich(false); reload(true); s.lamMoi() }} />}
    </>
  )
}
