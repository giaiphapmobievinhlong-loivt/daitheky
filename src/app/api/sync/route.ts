import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sourceSearch, sourceLocal } from "@/lib/source-api";
import { buildLocationIndex } from "@/lib/location";
import { mapRecord } from "@/lib/mapper";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { sql } from "drizzle-orm";

export const maxDuration = 60;

/**
 * POST /api/sync
 * body: { offset?: number, pageSize?: number, keyword?: string }
 *
 * Syncs exactly ONE page (pageSize, default 100) from the source per call.
 * The client loops: pass the returned `nextOffset` back until `done` is true.
 * Local survey fields are preserved on conflict.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    offset?: number;
    pageSize?: number;
    keyword?: string;
  };
  const pageSize = Math.min(Math.max(body.pageSize ?? 100, 1), 100);
  const offset = Math.max(body.offset ?? 0, 0);
  const keyword = body.keyword ?? "";

  try {
    // Location names are only needed to resolve codes; fetch once per call.
    const provinces = await sourceLocal(session.sourceToken);
    const loc = buildLocationIndex(provinces);

    const { data, total } = await sourceSearch(session.sourceToken, {
      size: pageSize,
      offset,
      keyword,
    });

    let fetched = 0;
    if (data.length > 0) {
      const rows = data.map((r) => mapRecord(r, loc));
      await db
        .insert(listings)
        .values(rows)
        .onConflictDoUpdate({
          target: listings.id,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            provinceCode: sql`excluded.province_code`,
            districtCode: sql`excluded.district_code`,
            wardCode: sql`excluded.ward_code`,
            provinceName: sql`excluded.province_name`,
            districtName: sql`excluded.district_name`,
            wardName: sql`excluded.ward_name`,
            street: sql`excluded.street`,
            houseNumber: sql`excluded.house_number`,
            addressExtra: sql`excluded.address_extra`,
            priceValue: sql`excluded.price_value`,
            priceUnit: sql`excluded.price_unit`,
            priceAbsolute: sql`excluded.price_absolute`,
            area: sql`excluded.area`,
            front: sql`excluded.front`,
            floor: sql`excluded.floor`,
            room: sql`excluded.room`,
            toilet: sql`excluded.toilet`,
            structure: sql`excluded.structure`,
            segment: sql`excluded.segment`,
            type: sql`excluded.type`,
            attribute: sql`excluded.attribute`,
            avatar: sql`excluded.avatar`,
            imagesAlbum: sql`excluded.images_album`,
            images: sql`excluded.images`,
            zoneGroup: sql`excluded.zone_group`,
            saleType: sql`excluded.sale_type`,
            transferStatus: sql`excluded.transfer_status`,
            level: sql`excluded.level`,
            sourceCreated: sql`excluded.source_created`,
            sourceModified: sql`excluded.source_modified`,
            sourcePublished: sql`excluded.source_published`,
            raw: sql`excluded.raw`,
            syncedAt: sql`excluded.synced_at`,
            // survey fields intentionally NOT overwritten
          },
        });
      fetched = data.length;
    }

    const nextOffset = offset + fetched;
    const done = fetched < pageSize || nextOffset >= total;

    return NextResponse.json({ ok: true, fetched, nextOffset, total, done });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Đồng bộ thất bại" },
      { status: 500 }
    );
  }
}
