import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  surveyed: z.boolean().optional(),
  surveyNote: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  if (parsed.data.surveyed !== undefined) {
    set.surveyed = parsed.data.surveyed;
    set.surveyedAt = parsed.data.surveyed ? new Date() : null;
  }
  if (parsed.data.surveyNote !== undefined) set.surveyNote = parsed.data.surveyNote;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
  }

  const updated = await db
    .update(listings)
    .set(set)
    .where(eq(listings.id, id))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy căn nhà" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, listing: updated[0] });
}
