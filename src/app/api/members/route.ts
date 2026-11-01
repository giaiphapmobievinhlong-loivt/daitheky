import { NextResponse } from "next/server";
import { getSession, isAdminUsername } from "@/lib/auth";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { sql } from "drizzle-orm";

// Admin-only: list members who have any survey, with their survey counts.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!isAdminUsername(session.username)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const rows = await db
    .select({
      userId: surveys.userId,
      username: surveys.username,
      fullName: surveys.fullName,
      total: sql<number>`count(*)::int`,
      surveyedCount: sql<number>`count(*) filter (where ${surveys.surveyed})::int`,
    })
    .from(surveys)
    .groupBy(surveys.userId, surveys.username, surveys.fullName)
    .orderBy(sql`count(*) filter (where ${surveys.surveyed}) desc`);

  return NextResponse.json({ members: rows });
}
