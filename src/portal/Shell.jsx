import { Link, useLocation } from 'react-router-dom'
import { Clock, MapPin, Search, Sparkles } from 'lucide-react'

// Khung chung của cổng ứng viên: nền tối + quả cầu, tiêu đề lớn, tấm trắng chứa nội dung
export function PortalShell({ hero, buoc, loiChao, children, sheetRef, phai, xong }) {
  const loc = useLocation()
  const traCuu = loc.pathname.startsWith('/tra-cuu')
  return (
    <div className="portal">
      <div className="portal-nen" aria-hidden="true">
        <div className="glow hong" style={{ width: 340, height: 340, left: -110, top: -130, opacity: 0.85 }} />
        <div className="glow tim" style={{ width: 260, height: 260, right: -90, top: 30, opacity: 0.55, filter: 'blur(80px)' }} />
        <div className="glow hong hien-lon" style={{ width: 420, height: 420, left: '30%', bottom: -220, opacity: 0.35, filter: 'blur(110px)' }} />
      </div>
      <div className="portal-khung">
        <div className="portal-trai">
          <header className="portal-dau">
            <Link to="/" className="portal-ten" aria-label="Trang ứng tuyển">NÓN SƠN</Link>
            {phai || (traCuu
              ? <Link to="/" className="link">Ứng tuyển</Link>
              : buoc != null ? <span className="buoc">Bước {buoc + 1} / 4</span> : <Link to="/tra-cuu" className="link"><Search size={14} />Tra cứu</Link>)}
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
