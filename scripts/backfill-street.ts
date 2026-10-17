import { db } from "@/db";
import { listings } from "@/db/schema";
import { cleanStreet } from "@/lib/mapper";
import { eq } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: listings.id,
      raw: listings.raw,
      title: listings.title,
      area: listings.area,
      floor: listings.floor,
      street: listings.street,
    })
    .from(listings);

  let updated = 0;
  for (const r of rows) {
    const rawStreet =
      (r.raw as { location?: { street?: string } } | null)?.location?.street ??
      null;
    const next = cleanStreet(rawStreet, r.title, r.area, r.floor);
    if (next !== r.street) {
      await db.update(listings).set({ street: next }).where(eq(listings.id, r.id));
      updated++;
    }
  }
  console.log(`Done. Updated ${updated}/${rows.length} streets.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
