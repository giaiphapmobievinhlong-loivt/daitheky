import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

// POST: upload one or more survey photos (multipart form-data, field "files")
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
  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy căn nhà" }, { status: 404 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Không có tệp nào" }, { status: 400 });
  }

  const urls: string[] = [];
  for (const file of files) {
    const blob = await put(`survey/${id}/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    urls.push(blob.url);
  }

  const current = existing[0].surveyPhotos ?? [];
  const next = [...current, ...urls];
  await db
    .update(listings)
    .set({ surveyPhotos: next, surveyed: true, surveyedAt: existing[0].surveyedAt ?? new Date() })
    .where(eq(listings.id, id));

  return NextResponse.json({ ok: true, photos: next, added: urls });
}

// DELETE: remove one survey photo by url (?url=...)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Thiếu url" }, { status: 400 });

  const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy căn nhà" }, { status: 404 });
  }
  const next = (existing[0].surveyPhotos ?? []).filter((p) => p !== url);
  await db.update(listings).set({ surveyPhotos: next }).where(eq(listings.id, id));
  return NextResponse.json({ ok: true, photos: next });
}
