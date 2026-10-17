import type { SourceRecord } from "./source-api";
import type { LocationIndex } from "./location";
import type { NewListing } from "@/db/schema";

/**
 * Title syntax from the source:
 *   (Địa chỉ) (Diện tích) (Tầng) (Ngang) (Dài) (Giá) tỷ (Phường) (Quận) ...
 * The length (dài) is the number immediately before the price. We anchor on
 * the price (the number right before "tỷ"/"tỉ") and take the number before it.
 * Returns the parsed length, or null when the title does not match.
 */
export function parseLength(title?: string | null): number | null {
  if (!title) return null;
  // <length> <price> tỷ|tỉ  (length is the number just before the price)
  const m = title.match(
    /([0-9]+(?:[.,][0-9]+)?)\s+[0-9]+(?:[.,][0-9]+)?\s*[Tt][ỷỉ]/u
  );
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return n;
}

function structureSummary(a?: SourceRecord["additional"]): string {
  if (!a) return "";
  const parts: string[] = [];
  if (a.floor && a.floor > 0) parts.push(`${a.floor} tầng`);
  if (a.room && a.room > 0) parts.push(`${a.room} PN`);
  if (a.toilet && a.toilet > 0) parts.push(`${a.toilet} WC`);
  return parts.join(" · ");
}

export function mapRecord(r: SourceRecord, loc: LocationIndex): NewListing {
  const names = loc.resolve(
    r.location?.province,
    r.location?.district,
    r.location?.ward
  );
  return {
    id: r.id,
    title: r.title ?? null,
    description: r.description ?? null,

    provinceCode: r.location?.province ?? null,
    districtCode: r.location?.district ?? null,
    wardCode: r.location?.ward ?? null,
    provinceName: names.province ?? null,
    districtName: names.district ?? null,
    wardName: names.ward ?? null,
    street: r.location?.street ?? null,
    houseNumber: r.location?.number ?? null,
    addressExtra: r.location?.address ?? null,

    priceValue: r.price?.value ?? null,
    priceUnit: r.price?.unit ?? null,
    priceAbsolute: r.price?.absolute ?? null,

    area: r.area ?? null,
    front: r.additional?.front ?? null,
    lengthM: parseLength(r.title),
    floor: r.additional?.floor ?? null,
    room: r.additional?.room ?? null,
    toilet: r.additional?.toilet ?? null,
    structure: structureSummary(r.additional),
    segment: r.segment ?? null,
    type: r.type ?? null,
    attribute: r.attribute ?? [],

    avatar: r.avatar ?? null,
    imagesAlbum: r.images_album ?? null,
    images: Array.isArray(r.images) ? r.images : [],

    zoneGroup: r.zone_group ?? null,
    saleType: r.sale_type ?? null,
    transferStatus: r.transfer_status ?? null,
    level: r.level ?? null,
    sourceCreated: r.created ?? null,
    sourceModified: r.modified ?? null,
    sourcePublished: r.published ?? null,
    raw: r as unknown as Record<string, unknown>,

    syncedAt: new Date(),
  };
}

/** Public address for posting: hides the house number. */
export function publicAddress(l: {
  street?: string | null;
  wardName?: string | null;
  districtName?: string | null;
  provinceName?: string | null;
}): string {
  return [l.street, l.wardName, l.districtName]
    .filter(Boolean)
    .join(", ");
}

/** Full address incl. house number (internal use). */
export function fullAddress(l: {
  houseNumber?: string | null;
  street?: string | null;
  wardName?: string | null;
  districtName?: string | null;
}): string {
  const head = [l.houseNumber, l.street].filter(Boolean).join(" ");
  return [head, l.wardName, l.districtName].filter(Boolean).join(", ");
}

export function formatPrice(l: { priceValue?: number | null; priceAbsolute?: number | null }): string {
  if (l.priceValue != null) {
    // value is in tỷ when >= small; source "value" like 3.9 => tỷ
    return `${l.priceValue} tỷ`;
  }
  if (l.priceAbsolute != null) {
    const ty = l.priceAbsolute / 1000;
    return `${ty.toFixed(2)} tỷ`;
  }
  return "Thỏa thuận";
}
