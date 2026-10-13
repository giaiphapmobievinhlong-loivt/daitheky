import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { isNotNull, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .selectDistinct({
      district: listings.districtName,
      ward: listings.wardName,
    })
    .from(listings)
    .where(isNotNull(listings.districtName));

  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.district) continue;
    if (!map.has(r.district)) map.set(r.district, new Set());
    if (r.ward) map.get(r.district)!.add(r.ward);
  }

  const districts = [...map.entries()]
    .map(([district, wards]) => ({
      district,
      wards: [...wards].sort((a, b) => a.localeCompare(b, "vi")),
    }))
    .sort((a, b) => a.district.localeCompare(b.district, "vi"));

  const floorRows = await db
    .selectDistinct({ floor: listings.floor })
    .from(listings)
    .where(isNotNull(listings.floor))
    .orderBy(sql`floor asc`);
  const floors = floorRows.map((f) => f.floor).filter((f): f is number => f != null);

  return NextResponse.json({ districts, floors });
}
