import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

// Hosts we are willing to proxy images from (listing images + our survey blobs).
const ALLOWED = [
  /(^|\.)daitheky\.net$/i,
  /(^|\.)blob\.vercel-storage\.com$/i,
  /(^|\.)thangbk\.com$/i,
];

function hostAllowed(h: string) {
  return ALLOWED.some((re) => re.test(h));
}

// GET /api/download?url=<img>&name=<filename>
// Streams the image back with an attachment header so the browser saves it.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  const name = (u.searchParams.get("name") || "anh.jpg").replace(/[^\w.\-]/g, "_");
  if (!target) return NextResponse.json({ error: "Thiếu url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !hostAllowed(parsed.hostname)) {
    return NextResponse.json({ error: "Nguồn ảnh không được phép" }, { status: 403 });
  }

  const res = await fetch(parsed.toString());
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "Không tải được ảnh" }, { status: 502 });
  }
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
