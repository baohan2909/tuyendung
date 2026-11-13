// Xuất Excel (tải thư viện khi cần để trang mở nhanh)
export async function xuatExcel(tenTep, bangs) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const b of bangs) {
    const dau = b.cot.map((c) => c.ten)
    const dong = b.dong.map((r) => b.cot.map((c) => {
      const v = typeof c.lay === 'function' ? c.lay(r) : r[c.k]
      return v == null ? '' : Array.isArray(v) ? v.join(', ') : v
    }))
    const ws = XLSX.utils.aoa_to_sheet([dau, ...dong])
    ws['!cols'] = b.cot.map((c) => ({ wch: c.w || Math.max(10, c.ten.length + 2) }))
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, dong.length), c: dau.length - 1 } }) }
    XLSX.utils.book_append_sheet(wb, ws, b.ten.slice(0, 31))
  }
  XLSX.writeFile(wb, tenTep)
}

export async function anhQR(noiDung, kichThuoc = 720) {
  const QR = await import('qrcode')
  return QR.toDataURL(noiDung, { width: kichThuoc, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#17111A', light: '#FFFFFF' } })
}
