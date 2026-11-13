import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Save, Lock, ListChecks, MessageSquarePlus } from 'lucide-react'
import { luuDong, themDong, xoaDong } from '../lib/api'
import { ICON_VI_TRI, iconViTri } from '../lib/icons'
import { Bao, Btn, Empty, Field, IconBtn, Modal, Switch, useToast, useXacNhan } from '../components/ui'
import { useStaff } from './context'

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30)

export default function Positions() {
  const s = useStaff()
  const bao = useToast()
  const xacNhan = useXacNhan()
  const [sua, setSua] = useState(null)
  const [suaTC, setSuaTC] = useState(null)
  if (!s.coSua) return <div className="card"><Empty icon={Lock} tieuDe="Bạn không có quyền quản lý vị trí" /></div>

  const tcCua = (id) => s.dm.tieuChi.filter((t) => t.vi_tri_id === id)
  async function batTat(v, on) {
    try { await luuDong('vi_tri', { ...v, dang_tuyen: on }); await s.taiDanhMuc(); bao(on ? 'Đã mở tuyển ' + v.ten : 'Đã tạm ngừng tuyển ' + v.ten) } catch (e) { bao(e.message, 'loi') }
  }
  async function xoaTC(t) {
    if (!(await xacNhan({ tieuDe: 'Xóa tiêu chí “' + t.ten + '”?', moTa: 'Phiếu chấm cũ vẫn giữ nguyên điểm đã chấm.', nut: 'Xóa', nguyHiem: true }))) return
    try { await xoaDong('tieu_chi', 'id', t.id); await s.taiDanhMuc(); bao('Đã xóa tiêu chí') } catch (e) { bao(e.message, 'loi') }
  }
  const chung = tcCua(null)

  return (
    <>
      <header className="trang-dau">
        <div className="tieu"><span className="eyebrow">Vị trí tuyển</span><h1><b>{s.dm.viTri.filter((v) => v.dang_tuyen).length}</b> vị trí đang tuyển</h1></div>
        <Btn kieu="den" orb="trai" icon={Plus} onClick={() => setSua({ ten: '', ma: '', mo_ta: '', chi_tiet: '', icon: 'tui', dang_tuyen: true, thu_tu: (s.dm.viTri.length + 1), cau_hoi_them: [] })}>Thêm vị trí</Btn>
      </header>
      <div className="cot" style={{ gap: 18 }}>
        {s.dm.viTri.map((v) => {
          const Ic = iconViTri(v.icon)
          const tc = tcCua(v.id)
          return (
            <section key={v.id} className="card" style={{ opacity: v.dang_tuyen ? 1 : 0.75 }}>
              <div className="hang wrap" style={{ gap: 14 }}>
                <span className="orb" style={{ width: 52, height: 52, background: v.dang_tuyen ? 'var(--orb)' : '#CFC7D4' }}><Ic size={22} /></span>
                <div className="gian" style={{ flex: '1 1 220px' }}>
                  <h2 style={{ fontSize: 19 }}>{v.ten}</h2>
                  <p className="nho muted-2">{v.mo_ta || 'Chưa có mô tả ngắn'} · {(v.cau_hoi_them || []).length} câu hỏi thêm</p>
                </div>
                <label className="hang nho" style={{ gap: 8, fontWeight: 700 }}><Switch on={v.dang_tuyen} onDoi={(on) => batTat(v, on)} nhan="Đang tuyển" />{v.dang_tuyen ? 'Đang tuyển' : 'Tạm ngừng'}</label>
                <Btn co="sm" icon={Pencil} onClick={() => setSua(v)}>Sửa</Btn>
              </div>
              <hr className="vach" style={{ margin: '16px 0 6px' }} />
              <div className="dau-the" style={{ marginBottom: 8 }}><h2 style={{ fontSize: 14.5 }}><ListChecks size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Tiêu chí chấm phỏng vấn · {tc.length}</h2><Btn kieu="trong" co="sm" icon={Plus} onClick={() => setSuaTC({ vi_tri_id: v.id, ten: '', mo_ta: '', trong_so: 1, thu_tu: tc.length + 1, hoat_dong: true })}>Thêm</Btn></div>
              <DsTieuChi ds={tc} sua={setSuaTC} xoa={xoaTC} />
            </section>
          )
        })}
        <section className="card">
          <div className="dau-the" style={{ marginBottom: 8 }}><h2>Tiêu chí chung (mọi vị trí) · {chung.length}</h2><Btn kieu="trong" co="sm" icon={Plus} onClick={() => setSuaTC({ vi_tri_id: null, ten: '', mo_ta: '', trong_so: 1, thu_tu: chung.length + 1, hoat_dong: true })}>Thêm</Btn></div>
          {chung.length ? <DsTieuChi ds={chung} sua={setSuaTC} xoa={xoaTC} /> : <p className="nho muted">Không bắt buộc. Tiêu chí ở đây được cộng thêm vào phiếu chấm của mọi vị trí.</p>}
        </section>
      </div>
      {sua && <SuaViTri v={sua} dong={() => setSua(null)} />}
      {suaTC && <SuaTieuChi t={suaTC} dong={() => setSuaTC(null)} />}
    </>
  )
}

function DsTieuChi({ ds, sua, xoa }) {
  if (!ds.length) return <p className="nho muted">Chưa có tiêu chí.</p>
  return (
    <div className="cot" style={{ gap: 0 }}>
      {ds.map((t) => (
        <div key={t.id} className="dong-ns" style={{ opacity: t.hoat_dong ? 1 : 0.5 }}>
          <span className="tag" style={{ minWidth: 26, justifyContent: 'center', padding: 0 }}>{t.thu_tu}</span>
          <div className="gian"><b>{t.ten}{Number(t.trong_so) !== 1 && <span className="tag" style={{ marginLeft: 8, height: 22 }}>×{Number(t.trong_so)}</span>}{!t.hoat_dong && <span className="tag" style={{ marginLeft: 8, height: 22 }}>Đã tắt</span>}</b><span>{t.mo_ta}</span></div>
          <IconBtn icon={Pencil} nhan="Sửa tiêu chí" co="xs" kieu="mem" onClick={() => sua(t)} size={14} />
          <IconBtn icon={Trash2} nhan="Xóa tiêu chí" co="xs" kieu="mem" onClick={() => xoa(t)} size={14} />
        </div>
      ))}
    </div>
  )
}

function SuaViTri({ v, dong }) {
  const s = useStaff()
  const bao = useToast()
  const [f, setF] = useState({ ...v, cau_hoi_them: Array.isArray(v.cau_hoi_them) ? v.cau_hoi_them : [] })
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState(null)
  const moi = !v.id
  const datCH = (i, o) => setF((x) => ({ ...x, cau_hoi_them: x.cau_hoi_them.map((q, j) => (j === i ? { ...q, ...o } : q)) }))
  async function luu() {
    setLoi(null)
    if (f.ten.trim().length < 2) return setLoi('Nhập tên vị trí')
    const dong_ = { ten: f.ten.trim(), ma: moi ? (f.ma || slug(f.ten)) : f.ma, mo_ta: f.mo_ta?.trim() || null, chi_tiet: f.chi_tiet?.trim() || null, icon: f.icon, dang_tuyen: f.dang_tuyen, thu_tu: Number(f.thu_tu) || 0,
      cau_hoi_them: f.cau_hoi_them.filter((q) => q.cau_hoi && q.cau_hoi.trim()).map((q) => ({ cau_hoi: q.cau_hoi.trim(), bat_buoc: !!q.bat_buoc, lua_chon: (typeof q.lua_chon === 'string' ? q.lua_chon.split(',') : q.lua_chon || []).map((x) => x.trim()).filter(Boolean) })) }
    setDang(true)
    try {
      if (moi) await themDong('vi_tri', dong_)
      else await luuDong('vi_tri', { id: v.id, ...dong_ })
      await s.taiDanhMuc()
      bao(moi ? 'Đã thêm vị trí' : 'Đã lưu vị trí')
      dong()
    } catch (e) { setLoi(/duplicate/i.test(e.message) ? 'Mã vị trí đã tồn tại' : e.message) }
    setDang(false)
  }
  async function xoa() {
    setDang(true)
    try { await xoaDong('vi_tri', 'id', v.id); await s.taiDanhMuc(); bao('Đã xóa vị trí'); dong() } catch (e) { setLoi('Vị trí đã có hồ sơ ứng tuyển — hãy chuyển sang “Tạm ngừng” thay vì xóa.') }
    setDang(false)
  }
  return (
    <Modal mo rong dong={dong} tieuDe={moi ? 'Thêm vị trí tuyển' : 'Sửa vị trí'} moTa="Hiển thị cho ứng viên ở bước 1 của trang ứng tuyển."
      chan={<>{!moi && <Btn kieu="do" icon={Trash2} onClick={xoa} style={{ marginRight: 'auto' }}>Xóa</Btn>}<Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={Save} loading={dang} onClick={luu}>Lưu</Btn></>}>
      <div className="cot" style={{ gap: 12 }}>
        <div className="luoi-2">
          <Field kieu="gon" nhan="Tên vị trí" value={f.ten} onChange={(e) => setF((x) => ({ ...x, ten: e.target.value }))} placeholder="VD: Nhân viên bán hàng" />
          <Field kieu="gon" nhan="Mô tả ngắn (dưới ô chọn)" value={f.mo_ta || ''} onChange={(e) => setF((x) => ({ ...x, mo_ta: e.target.value }))} placeholder="VD: Toàn thời gian tại cửa hàng" maxLength={40} />
        </div>
        <Field kieu="gon" nhan="Thông tin chi tiết (quyền lợi, yêu cầu…)"><textarea rows={3} value={f.chi_tiet || ''} onChange={(e) => setF((x) => ({ ...x, chi_tiet: e.target.value }))} placeholder="Hiện ngay dưới khi ứng viên chọn vị trí này" /></Field>
        <div>
          <span className="nhan-nhom">Biểu tượng</span>
          <div className="chips">
            {Object.entries(ICON_VI_TRI).map(([k, o]) => <button key={k} type="button" className={'chip sm' + (f.icon === k ? ' on' : '')} onClick={() => setF((x) => ({ ...x, icon: k }))}><o.ic size={15} />{o.ten}</button>)}
          </div>
        </div>
        <div className="luoi-2">
          <Field kieu="gon" nhan="Thứ tự hiển thị" value={f.thu_tu} onChange={(e) => setF((x) => ({ ...x, thu_tu: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" />
          <label className="field gon hang" style={{ cursor: 'default' }}><span className="gian nhan" style={{ display: 'block' }}>Đang tuyển</span><Switch on={f.dang_tuyen} onDoi={(on) => setF((x) => ({ ...x, dang_tuyen: on }))} nhan="Đang tuyển" /></label>
        </div>
        <div>
          <div className="hang" style={{ marginBottom: 8 }}><span className="nhan-nhom gian" style={{ margin: 0 }}>Câu hỏi thêm cho vị trí này</span><Btn kieu="trong" co="sm" icon={MessageSquarePlus} onClick={() => setF((x) => ({ ...x, cau_hoi_them: [...x.cau_hoi_them, { cau_hoi: '', bat_buoc: false, lua_chon: '' }] }))}>Thêm câu hỏi</Btn></div>
          {!f.cau_hoi_them.length && <p className="nho muted">VD: “Bạn làm được ca tối không?” với lựa chọn “Được, Không được”.</p>}
          <div className="cot" style={{ gap: 10 }}>
            {f.cau_hoi_them.map((q, i) => (
              <div key={i} style={{ background: 'var(--soft)', borderRadius: 22, padding: 12 }} className="cot">
                <div className="hang"><Field kieu="gon" className="gian" nhan={'Câu hỏi ' + (i + 1)} value={q.cau_hoi} onChange={(e) => datCH(i, { cau_hoi: e.target.value })} style={{ background: '#fff' }} /><IconBtn icon={Trash2} nhan="Xóa câu hỏi" co="sm" onClick={() => setF((x) => ({ ...x, cau_hoi_them: x.cau_hoi_them.filter((_, j) => j !== i) }))} /></div>
                <Field kieu="gon" nhan="Lựa chọn (cách nhau dấu phẩy, bỏ trống = tự trả lời)" value={Array.isArray(q.lua_chon) ? q.lua_chon.join(', ') : q.lua_chon || ''} onChange={(e) => datCH(i, { lua_chon: e.target.value })} />
                <label className="hang nho" style={{ gap: 8, fontWeight: 600 }}><Switch on={q.bat_buoc} onDoi={(on) => datCH(i, { bat_buoc: on })} nhan="Bắt buộc" />Bắt buộc trả lời</label>
              </div>
            ))}
          </div>
        </div>
        {loi && <Bao kieu="loi">{loi}</Bao>}
      </div>
    </Modal>
  )
}

function SuaTieuChi({ t, dong }) {
  const s = useStaff()
  const bao = useToast()
  const [f, setF] = useState(t)
  const [dang, setDang] = useState(false)
  async function luu() {
    if (f.ten.trim().length < 2) return
    setDang(true)
    try {
      const d = { vi_tri_id: f.vi_tri_id, ten: f.ten.trim(), mo_ta: f.mo_ta?.trim() || null, trong_so: Math.min(10, Math.max(0.5, Number(f.trong_so) || 1)), thu_tu: Number(f.thu_tu) || 0, hoat_dong: f.hoat_dong }
      if (t.id) await luuDong('tieu_chi', { id: t.id, ...d }); else await themDong('tieu_chi', d)
      await s.taiDanhMuc(); bao('Đã lưu tiêu chí'); dong()
    } catch (e) { bao(e.message, 'loi') }
    setDang(false)
  }
  return (
    <Modal mo dong={dong} tieuDe={t.id ? 'Sửa tiêu chí' : 'Thêm tiêu chí'} moTa="Người phỏng vấn chấm mỗi tiêu chí từ 1 đến 5."
      chan={<><Btn kieu="trong" onClick={dong}>Hủy</Btn><Btn kieu="den" icon={Save} loading={dang} onClick={luu}>Lưu</Btn></>}>
      <div className="cot" style={{ gap: 12 }}>
        <Field kieu="gon" nhan="Tên tiêu chí" value={f.ten} onChange={(e) => setF((x) => ({ ...x, ten: e.target.value }))} placeholder="VD: Giao tiếp, tư vấn" autoFocus />
        <Field kieu="gon" nhan="Gợi ý chấm" value={f.mo_ta || ''} onChange={(e) => setF((x) => ({ ...x, mo_ta: e.target.value }))} placeholder="Điều người phỏng vấn cần quan sát" />
        <div className="luoi-3">
          <Field kieu="gon" nhan="Trọng số" value={f.trong_so} onChange={(e) => setF((x) => ({ ...x, trong_so: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" />
          <Field kieu="gon" nhan="Thứ tự" value={f.thu_tu} onChange={(e) => setF((x) => ({ ...x, thu_tu: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" />
          <label className="field gon hang" style={{ cursor: 'default' }}><span className="gian nhan" style={{ display: 'block' }}>Đang dùng</span><Switch on={f.hoat_dong} onDoi={(on) => setF((x) => ({ ...x, hoat_dong: on }))} nhan="Đang dùng" /></label>
        </div>
      </div>
    </Modal>
  )
}
