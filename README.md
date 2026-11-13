# NS TUYỂN DỤNG

Hệ thống tuyển dụng & quản lý phỏng vấn của **Nón Sơn**.

- **Trang ứng tuyển** (`#/`): ứng viên nộp hồ sơ không cần đăng nhập, tải ảnh + video (nén ảnh ngay trên máy, tải video tiếp nối khi rớt mạng), nhận mã hồ sơ.
- **Tra cứu** (`#/tra-cuu`): ứng viên xem tiến độ, xác nhận hoặc xin đổi lịch phỏng vấn.
- **Quản trị** (`#/quan-tri`): tổng quan, danh sách ứng viên (bảng / thẻ ảnh, lọc, xuất Excel), quy trình kéo thả, lịch phỏng vấn, phiếu chấm điểm độc lập, vị trí & tiêu chí, báo cáo, nhân sự, kênh QR, cài đặt biểu mẫu.

Kênh tuyển dụng: thêm `?src=<mã>` vào link (VD: `https://baohan2909.github.io/tuyendung/?src=bill`) để ghi nhận nguồn hồ sơ.

## Công nghệ

React 18 + Vite · Supabase (Postgres, Auth, Storage, Realtime; region Sydney) · GitHub Pages (tự build bằng GitHub Actions khi push lên `main`).

Mọi quyền truy cập dữ liệu do RLS + hàm phía máy chủ kiểm soát; trình duyệt chỉ giữ khóa công khai trong `src/config.js`. Cơ sở dữ liệu được quản lý riêng, không lưu trong repo.

## Chạy thử

```bash
npm install
npm run dev
```
