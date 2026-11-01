export const metadata = { title: "Xoá dữ liệu — Đại Thế Kỷ" };

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Hướng dẫn xoá dữ liệu</h1>
      <p className="text-sm text-muted-foreground mb-6">Cập nhật: 01/11/2026</p>

      <p className="mb-4">
        Người dùng có quyền yêu cầu xoá dữ liệu cá nhân và thông tin kết nối mạng xã hội
        khỏi ứng dụng &ldquo;Đại Thế Kỷ&rdquo;.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Cách yêu cầu xoá</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Trong ứng dụng: ngắt kết nối Facebook ở mục &ldquo;Kết nối nền tảng&rdquo; để xoá
          token và liên kết Trang của bạn.
        </li>
        <li>
          Hoặc gửi yêu cầu tới <b>giaiphapmobie.vinhlong@gmail.com</b> (hoặc gọi{" "}
          <b>0379386629</b>) kèm tài khoản của bạn; chúng tôi sẽ xoá dữ liệu trong vòng 7 ngày.
        </li>
      </ul>

      <p className="mt-6">
        Việc ngắt kết nối sẽ xoá toàn bộ token truy cập Facebook và liên kết Trang của bạn
        khỏi hệ thống của chúng tôi. Dữ liệu khảo sát của bạn cũng có thể được xoá theo yêu cầu.
      </p>
    </main>
  );
}
