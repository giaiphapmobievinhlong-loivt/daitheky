import { NextResponse } from "next/server";
import { getSession, isAdminUsername } from "@/lib/auth";
import { db } from "@/db";
import { listings, surveys } from "@/db/schema";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const isAdmin = isAdminUsername(session.username);

  const url = new URL(req.url);
  const q = url.searchParams;

  const page = Math.max(parseInt(q.get("page") ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(q.get("pageSize") ?? "20", 10) || 20, 1), 100);
  const keyword = (q.get("keyword") ?? "").trim();
  const district = q.get("district") ?? "";
  const ward = q.get("ward") ?? "";
  const surveyed = q.get("surveyed") ?? ""; // "", "yes", "no"
  const floors = q.get("floors") ?? "";
  const sortBy = q.get("sortBy") ?? "area";
  const sortDir = q.get("sortDir") ?? "desc";

  const num = (k: string) => {
    const v = parseFloat(q.get(k) ?? "");
    return Number.isNaN(v) ? null : v;
  };
  const minFront = num("minFront");

  // Who's survey are we viewing? Members always see their own.
  const viewUser = q.get("viewUser") ?? ""; // admin only: a userId, or "all"
  const viewAll = isAdmin && viewUser === "all";
  const targetUserId = isAdmin && viewUser && viewUser !== "all" ? viewUser : session.userId;

  const conds: SQL[] = [];
  if (keyword) {
    const like = `%${keyword}%`;
    conds.push(
      or(ilike(listings.title, like), ilike(listings.description, like), ilike(listings.street, like))!
    );
  }
  if (district) conds.push(eq(listings.districtName, district));
  if (ward) conds.push(eq(listings.wardName, ward));
  if (minFront != null) conds.push(sql`${listings.front} >= ${minFront}`);
  if (floors) {
    const f = parseInt(floors, 10);
    if (!Number.isNaN(f)) conds.push(eq(listings.floor, f));
  }

  // survey filter
  if (surveyed === "yes" || surveyed === "no") {
    if (viewAll) {
      const ex = sql`exists (select 1 from ${surveys} s where s.listing_id = ${listings.id} and s.surveyed = true)`;
      conds.push(surveyed === "yes" ? ex : sql`not ${ex}`);
    } else {
      const ex = sql`exists (select 1 from ${surveys} s where s.listing_id = ${listings.id} and s.user_id = ${targetUserId} and s.surveyed = true)`;
      conds.push(surveyed === "yes" ? ex : sql`not ${ex}`);
    }
  }

  const where = conds.length ? and(...conds) : undefined;

  const sortCol =
    sortBy === "front" ? listings.front
    : sortBy === "price" ? listings.priceValue
    : sortBy === "modified" ? listings.sourceModified
    : sortBy === "date" ? (sql`coalesce(${listings.sourcePublished}, ${listings.sourceModified}, ${listings.sourceCreated})` as unknown as typeof listings.area)
    : listings.area;
  const orderBy = sortDir === "asc" ? asc(sortCol) : desc(sortCol);

  const listingRows = await db
    .select()
    .from(listings)
    .where(where)
    .orderBy(orderBy, desc(listings.sourceModified))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const ids = listingRows.map((r) => r.id);

  // Attach survey data.
  let rows;
  if (viewAll) {
    const allSurveys = ids.length
      ? await db.select().from(surveys).where(inArray(surveys.listingId, ids))
      : [];
    const byListing = new Map<string, typeof allSurveys>();
    for (const s of allSurveys) {
      if (!byListing.has(s.listingId)) byListing.set(s.listingId, []);
      byListing.get(s.listingId)!.push(s);
    }
    rows = listingRows.map((l) => {
      const list = (byListing.get(l.id) ?? []).filter((s) => s.surveyed || (s.photos?.length ?? 0) > 0 || s.note);
      return {
        ...l,
        surveyed: list.some((s) => s.surveyed),
        surveyNote: null,
        surveyPhotos: [],
        surveyList: list.map((s) => ({
          userId: s.userId,
          username: s.username,
          fullName: s.fullName,
          surveyed: s.surveyed,
          note: s.note,
          photos: s.photos ?? [],
          surveyedAt: s.surveyedAt,
        })),
      };
    });
  } else {
    const mine = ids.length
      ? await db
          .select()
          .from(surveys)
          .where(and(inArray(surveys.listingId, ids), eq(surveys.userId, targetUserId)))
      : [];
    const map = new Map(mine.map((s) => [s.listingId, s]));
    rows = listingRows.map((l) => {
      const s = map.get(l.id);
      return {
        ...l,
        surveyed: s?.surveyed ?? false,
        surveyNote: s?.note ?? null,
        surveyPhotos: s?.photos ?? [],
        surveyList: undefined,
      };
    });
  }

  const totalRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(where);
  const total = totalRes[0]?.count ?? 0;

  return NextResponse.json({ rows, total, page, pageSize, isAdmin });
}
