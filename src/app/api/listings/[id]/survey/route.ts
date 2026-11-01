import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { sql } from "drizzle-orm";

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

  const surveyId = `${id}:${session.userId}`;
  const now = new Date();

  // Build the row to insert / the fields to update on conflict.
  const insertRow = {
    id: surveyId,
    listingId: id,
    userId: session.userId,
    username: session.username,
    fullName: session.fullName ?? session.username,
    surveyed: parsed.data.surveyed ?? false,
    note: parsed.data.surveyNote ?? null,
    photos: [] as string[],
    surveyedAt: parsed.data.surveyed ? now : null,
    updatedAt: now,
  };

  const updateSet: Record<string, unknown> = { updatedAt: now };
  if (parsed.data.surveyed !== undefined) {
    updateSet.surveyed = parsed.data.surveyed;
    updateSet.surveyedAt = parsed.data.surveyed ? now : null;
  }
  if (parsed.data.surveyNote !== undefined) updateSet.note = parsed.data.surveyNote;

  const rows = await db
    .insert(surveys)
    .values(insertRow)
    .onConflictDoUpdate({ target: surveys.id, set: updateSet })
    .returning();

  return NextResponse.json({ ok: true, survey: rows[0] });
}
