import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams;

  const page = Math.max(parseInt(q.get("page") ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(q.get("pageSize") ?? "20", 10) || 20, 1), 100);
  const keyword = (q.get("keyword") ?? "").trim();
  const district = q.get("district") ?? "";
  const ward = q.get("ward") ?? "";
  const surveyed = q.get("surveyed") ?? ""; // "", "yes", "no"
  const minFront = parseFloat(q.get("minFront") ?? "");
  const floors = q.get("floors") ?? ""; // exact floor count
  const sortBy = q.get("sortBy") ?? "area"; // area | front | price | modified
  const sortDir = q.get("sortDir") ?? "desc"; // asc | desc

  const conds: SQL[] = [];
  if (keyword) {
    const like = `%${keyword}%`;
    conds.push(
      or(
        ilike(listings.title, like),
        ilike(listings.description, like),
        ilike(listings.street, like)
      )!
    );
  }
  if (district) conds.push(eq(listings.districtName, district));
  if (ward) conds.push(eq(listings.wardName, ward));
  if (surveyed === "yes") conds.push(eq(listings.surveyed, true));
  if (surveyed === "no") conds.push(eq(listings.surveyed, false));
  if (!Number.isNaN(minFront)) conds.push(sql`${listings.front} >= ${minFront}`);
  if (floors) {
    const f = parseInt(floors, 10);
    if (!Number.isNaN(f)) conds.push(eq(listings.floor, f));
  }

  const where = conds.length ? and(...conds) : undefined;

  const sortCol =
    sortBy === "front"
      ? listings.front
      : sortBy === "price"
      ? listings.priceValue
      : sortBy === "modified"
      ? listings.sourceModified
      : listings.area;
  const orderBy = sortDir === "asc" ? asc(sortCol) : desc(sortCol);

  const rows = await db
    .select()
    .from(listings)
    .where(where)
    .orderBy(orderBy, desc(listings.sourceModified))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(where);
  const total = totalRes[0]?.count ?? 0;

  return NextResponse.json({ rows, total, page, pageSize });
}
