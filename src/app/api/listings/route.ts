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
  const title = (q.get("title") ?? "").trim();
  const address = (q.get("address") ?? "").trim();
  const district = q.get("district") ?? "";
  const ward = q.get("ward") ?? "";
  const surveyed = q.get("surveyed") ?? ""; // "", "yes", "no"
  const floors = q.get("floors") ?? ""; // exact floor count
  const sortBy = q.get("sortBy") ?? "area"; // area | front | price | modified | date
  const sortDir = q.get("sortDir") ?? "desc"; // asc | desc

  const num = (k: string) => {
    const v = parseFloat(q.get(k) ?? "");
    return Number.isNaN(v) ? null : v;
  };
  const minArea = num("minArea");
  const maxArea = num("maxArea");
  const minFront = num("minFront");
  const minPrice = num("minPrice");
  const maxPrice = num("maxPrice");
  // date range in unix seconds (from yyyy-mm-dd)
  const dateFrom = q.get("dateFrom")
    ? Math.floor(new Date(q.get("dateFrom")!).getTime() / 1000)
    : null;
  const dateTo = q.get("dateTo")
    ? Math.floor(new Date(q.get("dateTo")!).getTime() / 1000) + 86399
    : null;
  const dateExpr = sql`coalesce(${listings.sourcePublished}, ${listings.sourceModified}, ${listings.sourceCreated})`;

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
  if (title) conds.push(ilike(listings.title, `%${title}%`));
  if (address) {
    const like = `%${address}%`;
    conds.push(
      or(
        ilike(listings.street, like),
        ilike(listings.wardName, like),
        ilike(listings.districtName, like)
      )!
    );
  }
  if (district) conds.push(eq(listings.districtName, district));
  if (ward) conds.push(eq(listings.wardName, ward));
  if (surveyed === "yes") conds.push(eq(listings.surveyed, true));
  if (surveyed === "no") conds.push(eq(listings.surveyed, false));
  if (minArea != null) conds.push(sql`${listings.area} >= ${minArea}`);
  if (maxArea != null) conds.push(sql`${listings.area} <= ${maxArea}`);
  if (minFront != null) conds.push(sql`${listings.front} >= ${minFront}`);
  if (minPrice != null) conds.push(sql`${listings.priceValue} >= ${minPrice}`);
  if (maxPrice != null) conds.push(sql`${listings.priceValue} <= ${maxPrice}`);
  if (dateFrom != null) conds.push(sql`${dateExpr} >= ${dateFrom}`);
  if (dateTo != null) conds.push(sql`${dateExpr} <= ${dateTo}`);
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
      : sortBy === "date"
      ? (dateExpr as unknown as typeof listings.area)
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
