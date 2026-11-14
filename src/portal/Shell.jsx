import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Search, Sparkles } from 'lucide-react'

// Khung chung của cổng ứng viên: nền tối + quả cầu, tiêu đề lớn, tấm trắng chứa nội dung
export function PortalShell({ hero, buoc, loiChao, children, sheetRef, phai, xong }) {
  const loc = useLocation()
  const traCuu = loc.pathname.startsWith('/tra-cuu')
  return (
    <div className="portal">
      <div className="portal-nen" aria-hidden="true">
        <div className="bong-tron b1 chi-dt" />
        <div className="bong-tron b2 chi-dt" />
      </div>
      <div className="portal-khung">
        <div className="portal-trai">
          <div className="bong-cum" aria-hidden="true"><span className="bong-tron b1" /><span className="bong-tron b2" /></div>
          <header className="portal-dau">
            <Link to="/" className="portal-ten" aria-label="Trang ứng tuyển">NÓN SƠN</Link>
            {phai || (traCuu
              ? <Link to="/" className="link">Ứng tuyển</Link>
              : buoc != null ? <span className="buoc">Bước {buoc + 1} / 4</span> : <Link to="/tra-cuu" className="link nut-tra-cuu"><Search size={15} strokeWidth={2.6} />Tra cứu kết quả</Link>)}
          </header>
          <section className="hero">
            <p className="eyebrow sang">{xong ? 'Hoàn tất' : traCuu ? 'Tra cứu hồ sơ' : 'Đang tuyển dụng'}</p>
            {hero && (
              <h1 className="hero-chu" aria-label={hero.filter(Boolean).join(' ')}>
                <span className="d1">{hero[0]}</span>
                <span className="d2">{hero[1]}</span>
                {hero[2] && <span className="d3">{hero[2]}</span>}
              </h1>
            )}
            {loiChao && <p className="loi-chao">{loiChao}</p>}
            {!traCuu && !xong && (
              <Link to="/tra-cuu" className="the-tra-cuu">
                <span className="ttc-ic"><Search size={20} strokeWidth={2.6} /></span>
                <span className="gian"><b>Đã ứng tuyển? Tra cứu kết quả</b><small>Chỉ cần nhập số điện thoại · xem lịch phỏng vấn & nhận việc</small></span>
                <span className="ttc-mui"><ArrowRight size={18} /></span>
              </Link>
            )}
            <div className="hero-uu-diem">
              <span><Clock size={15} /> Nộp hồ sơ trong 3 phút</span>
              <span><MapPin size={15} /> Hơn 200 cửa hàng</span>
              <span><Sparkles size={15} /> Phản hồi nhanh</span>
            </div>
          </section>
        </div>
        <div className="portal-phai">
          <main className="sheet" ref={sheetRef}>{children}</main>
        </div>
      </div>
    </div>
  )
}
