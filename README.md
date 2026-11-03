# Đại Thế Kỷ – Quản lý & Đăng tin

Website đồng bộ danh sách nhà từ hệ thống `tuan123.daitheky.net` và hỗ trợ đăng
tin lên mạng xã hội.

Stack: **Next.js (App Router) · shadcn/ui · Drizzle ORM · Neon (Postgres) · Vercel**

## Tính năng (Giai đoạn 1)

- Đăng nhập bằng tài khoản `tuan123.daitheky.net`.
- Nút **Đồng bộ dữ liệu**: kéo toàn bộ danh sách nhà về Neon (giữ nguyên trạng thái khảo sát đã lưu).
- Bảng danh sách với bộ lọc: diện tích giảm dần, đường trước nhà (≥ m), kết cấu (số tầng), quận, phường, và trạng thái khảo sát.
- Cột **địa chỉ** hiển thị đường/phường/quận, **ẩn số nhà** để đăng tin.
- Đánh dấu **đã/chưa khảo sát**, ghi chú và **upload ảnh khảo sát** cho từng căn.
- Nút **Đăng tin**: sinh nội dung theo mẫu (kèm SĐT 0379386629) để sao chép.
- Nút **Tạo video** và đăng tự động FB/Group/Zalo/Threads: khung sẵn, sẽ mở dần ở giai đoạn sau.

## Cài đặt

### 1. Biến môi trường

Sao chép `.env.example` thành `.env.local` và điền:

| Biến | Lấy ở đâu |
|------|-----------|
| `DATABASE_URL` | Neon Console → project → Connection string (chọn *Pooled*) |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự (vd: `openssl rand -base64 32`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob → Create store → token |

### 2. Tạo bảng trong Neon

```bash
npm run db:push     # đẩy schema trực tiếp
# hoặc chạy SQL trong drizzle/0000_*.sql
```

### 3. Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000 → đăng nhập → bấm **Đồng bộ dữ liệu**.

## Deploy Vercel

1. Push code lên GitHub, import vào Vercel.
2. Thêm 3 biến môi trường ở trên trong Project Settings → Environment Variables.
3. Tạo Blob store (tab Storage) để có `BLOB_READ_WRITE_TOKEN`.
4. Deploy. Sau khi deploy chạy `npm run db:push` một lần (hoặc dùng SQL migration) để tạo bảng.

## Lưu ý về đăng nhập nguồn

Hệ thống nguồn chỉ cho **1 thiết bị/phiên**. Khi app này đăng nhập, phiên trên
trình duyệt cũ ở `tuan123.daitheky.net` có thể bị đăng xuất, và ngược lại. Token
phiên có hạn ~2–4 tuần; hết hạn chỉ cần đăng nhập lại trong app.
# daitheky
