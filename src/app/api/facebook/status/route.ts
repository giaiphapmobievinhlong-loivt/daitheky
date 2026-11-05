import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fbConfigured } from "@/lib/facebook";

// GET /api/facebook/status → current user's connection + pages (no tokens leaked)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.id, `facebook:${session.userId}`))
    .limit(1);

  const acc = rows[0];
  return NextResponse.json({
    configured: fbConfigured(),
    connected: !!acc,
    name: acc?.name ?? null,
    pages: (acc?.pages ?? []).map((p) => ({ id: p.id, name: p.name, category: p.category })),
  });
}
