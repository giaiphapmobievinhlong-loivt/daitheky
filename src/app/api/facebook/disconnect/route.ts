import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await db.delete(socialAccounts).where(eq(socialAccounts.id, `facebook:${session.userId}`));
  return NextResponse.json({ ok: true });
}
