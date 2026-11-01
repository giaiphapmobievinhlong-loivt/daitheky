export const metadata = { title: "Chính sách bảo mật — Đại Thế Kỷ" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 prose prose-sm">
      <h1 className="text-2xl font-bold mb-2">Chính sách bảo mật</h1>
      <p className="text-sm text-muted-foreground mb-6">Cập nhật: 01/11/2026</p>

      <p className="mb-4">
        Ứng dụng &ldquo;Đại Thế Kỷ&rdquo; (sau đây gọi là &ldquo;Ứng dụng&rdquo;) là công cụ nội bộ
        giúp đội ngũ môi giới quản lý danh sách bất động sản và hỗ trợ đăng tin lên
        mạng xã hội. Trang này mô tả cách Ứng dụng thu thập và sử dụng dữ liệu.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Dữ liệu chúng tôi sử dụng</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Thông tin đăng nhập hệ thống nội bộ (số điện thoại, họ tên) để xác thực người dùng.</li>
        <li>Dữ liệu bất động sản được đồng bộ từ hệ thống nội bộ của công ty.</li>
        <li>Dữ liệu khảo sát do người dùng nhập (ghi chú, hình ảnh khảo sát).</li>
        <li>
          Khi người dùng kết nối Facebook: tên, ảnh đại diện, danh sách Trang (Page)
          mà người dùng quản lý và quyền đăng bài lên Trang đó — chỉ để phục vụ việc
          đăng tin do chính người dùng thực hiện.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Cách sử dụng</h2>
      <p className="mb-4">
        Dữ liệu chỉ dùng trong phạm vi vận hành Ứng dụng: hiển thị danh sách, lọc, quản lý
        khảo sát và đăng tin lên nền tảng do người dùng chọn. Chúng tôi không bán dữ liệu
        cho bên thứ ba.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Lưu trữ</h2>
      <p className="mb-4">
        Dữ liệu được lưu trên hạ tầng đám mây (Neon, Vercel). Token kết nối mạng xã hội
        được lưu an toàn và chỉ dùng để đăng bài theo yêu cầu của người dùng.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Liên hệ</h2>
      <p>Email: giaiphapmobie.vinhlong@gmail.com — Điện thoại: 0379386629.</p>
    </main>
  );
}
