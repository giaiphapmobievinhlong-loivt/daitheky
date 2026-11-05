import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { postToPage } from "@/lib/facebook";

export const maxDuration = 60;

const schema = z.object({
  pageId: z.string().min(1),
  message: z.string().min(1).max(5000),
  photoUrls: z.array(z.string().url()).max(10).optional(),
});

// POST /api/facebook/post → publish to one of the user's connected Pages.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const rows = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.id, `facebook:${session.userId}`))
    .limit(1);
  const acc = rows[0];
  if (!acc) return NextResponse.json({ error: "Bạn chưa kết nối Facebook" }, { status: 400 });

  const page = (acc.pages ?? []).find((p) => p.id === parsed.data.pageId);
  if (!page) return NextResponse.json({ error: "Không tìm thấy Trang đã kết nối" }, { status: 400 });

  const result = await postToPage(
    page.id,
    page.accessToken,
    parsed.data.message,
    parsed.data.photoUrls ?? []
  );
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, postId: result.id });
}
