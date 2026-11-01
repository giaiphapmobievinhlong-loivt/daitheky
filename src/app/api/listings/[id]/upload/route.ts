import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

async function getOrInit(surveyId: string, listingId: string, session: { userId: string; username: string; fullName?: string }) {
  const existing = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  if (existing.length) return existing[0];
  const now = new Date();
  const inserted = await db
    .insert(surveys)
    .values({
      id: surveyId,
      listingId,
      userId: session.userId,
      username: session.username,
      fullName: session.fullName ?? session.username,
      surveyed: true,
      photos: [],
      surveyedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted.length) return inserted[0];
  const again = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  return again[0];
}

// POST: upload one or more survey photos for the current user (multipart, field "files")
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Chưa cấu hình BLOB_READ_WRITE_TOKEN (Vercel Blob)" },
      { status: 500 }
    );
  }

  const { id } = await params;
  const surveyId = `${id}:${session.userId}`;
  const row = await getOrInit(surveyId, id, session);

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Không có tệp nào" }, { status: 400 });
  }

  const urls: string[] = [];
  for (const file of files) {
    const blob = await put(`survey/${id}/${session.userId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    urls.push(blob.url);
  }

  const next = [...(row.photos ?? []), ...urls];
  await db
    .update(surveys)
    .set({ photos: next, surveyed: true, surveyedAt: row.surveyedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(surveys.id, surveyId));

  return NextResponse.json({ ok: true, photos: next, added: urls });
}

// DELETE: remove one survey photo by url (?url=...) from the current user's survey
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Thiếu url" }, { status: 400 });

  const surveyId = `${id}:${session.userId}`;
  const existing = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy khảo sát" }, { status: 404 });
  }
  const next = (existing[0].photos ?? []).filter((p) => p !== url);
  await db.update(surveys).set({ photos: next, updatedAt: new Date() }).where(eq(surveys.id, surveyId));
  return NextResponse.json({ ok: true, photos: next });
}
