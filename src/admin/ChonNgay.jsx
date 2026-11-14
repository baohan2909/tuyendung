import { CalendarRange, Check, ChevronDown, X } from 'lucide-react'
import { congNgay, ngayVN } from '../lib/format'
import { Field, Menu } from '../components/ui'

// Khoảng ngày dùng chung: chọn nhanh hoặc tự chọn Từ – Đến
export const KHOANG = [
  { v: '', t: 'Mọi thời gian' },
  { v: 'hom_nay', t: 'Hôm nay' },
  { v: 'hom_qua', t: 'Hôm qua' },
  { v: '7', t: '7 ngày qua' },
  { v: '30', t: '30 ngày qua' },
  { v: '90', t: '90 ngày qua' },
  { v: 'thang_nay', t: 'Tháng này' },
  { v: 'tuy_chon', t: 'Tự chọn từ – đến' }
]

export function tinhKhoang(k) {
  const hn = ngayVN()
  switch (k?.v) {
    case 'hom_nay': return [hn, hn]
    case 'hom_qua': { const h = congNgay(hn, -1); return [h, h] }
    case '7': return [congNgay(hn, -6), hn]
    case '30': return [congNgay(hn, -29), hn]
    case '90': return [congNgay(hn, -89), hn]
    case 'thang_nay': return [hn.slice(0, 8) + '01', hn]
    case 'tuy_chon': return [k.tu || null, k.den || null]
    default: return [null, null]
  }
}

const dd = (s) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '…')
export function nhanKhoang(k) {
  if (k?.v === 'tuy_chon') return (k.tu || k.den) ? dd(k.tu) + ' – ' + dd(k.den) : 'Tự chọn'
  return KHOANG.find((x) => x.v === (k?.v || ''))?.t
}

export default function ChonNgay({ giaTri, onDoi, nhan = 'Ngày nộp', canh = 'trai', coBo = true }) {
  const k = giaTri || { v: '' }
  const co = !!k.v
  return (
    <span className={'nut-loc' + (co ? ' on' : '')}>
      <Menu canh={canh} rong={330} nut={<button type="button" className="nl-chinh"><CalendarRange size={14} />{co && <i className="nl-nhan">{nhan}</i>}<span className="cat">{co ? nhanKhoang(k) : nhan}</span>{!co && <ChevronDown size={14} />}</button>}>
        {(dong) => <>
          <div className="khoang-nhanh">
            {KHOANG.filter((x) => x.v !== 'tuy_chon').map((x) => (
              <button key={x.v} type="button" className={k.v === x.v ? 'on' : ''} onClick={() => { onDoi({ v: x.v }); dong() }}>{x.t}{k.v === x.v && <Check size={14} />}</button>
            ))}
          </div>
          <div className="khoang-tu-chon">
            <span className="nhan-nhom">Tự chọn từ – đến</span>
            <div className="luoi-2">
              <Field kieu="gon" nhan="Từ ngày" type="date" value={k.v === 'tuy_chon' ? k.tu || '' : ''} onChange={(e) => onDoi({ v: 'tuy_chon', tu: e.target.value, den: k.v === 'tuy_chon' ? k.den : '' })} />
              <Field kieu="gon" nhan="Đến ngày" type="date" value={k.v === 'tuy_chon' ? k.den || '' : ''} onChange={(e) => onDoi({ v: 'tuy_chon', tu: k.v === 'tuy_chon' ? k.tu : '', den: e.target.value })} />
            </div>
          </div>
        </>}
      </Menu>
      {co && coBo && <button type="button" className="nl-bo" onClick={() => onDoi({ v: '' })} aria-label={'Bỏ lọc ' + nhan}><X size={13} strokeWidth={2.6} /></button>}
    </span>
  )
}
