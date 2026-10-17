import type { SourceRecord } from "./source-api";
import type { LocationIndex } from "./location";
import type { NewListing } from "@/db/schema";

/**
 * Title syntax from the source:
 *   (Địa chỉ) (Diện tích) (Tầng) (Ngang) (Dài) (Giá) tỷ (Phường) (Quận) ...
 * We anchor on the price (number right before "tỷ"/"tỉ") and read the two
 * numbers before it: Ngang (may be a "120/155" form) then Dài. The source's
 * structured `front` field is unreliable (often 1), so the title wins.
 */
export function parseDims(title?: string | null): {
  widthLabel?: string;
  widthNum?: number;
  lengthM?: number;
} {
  if (!title) return {};
  // <ngang> <dài> <giá> tỷ|tỉ   (ngang may contain a slash: 120/155)
  const m = title.match(
    /([0-9]+(?:[.,/][0-9]+)*)\s+([0-9]+(?:[.,][0-9]+)?)\s+[0-9]+(?:[.,][0-9]+)?\s*[Tt][ỷỉ]/u
  );
  if (!m) return {};
  const out: { widthLabel?: string; widthNum?: number; lengthM?: number } = {};
  const widthLabel = m[1];
  const len = parseFloat(m[2].replace(",", "."));
  const widthNum = parseFloat(widthLabel.split("/")[0].replace(",", "."));
  if (widthLabel) out.widthLabel = widthLabel;
  if (Number.isFinite(widthNum) && widthNum > 0 && widthNum <= 1000) out.widthNum = widthNum;
  if (Number.isFinite(len) && len > 0 && len <= 1000) out.lengthM = len;
  return out;
}

const DIMS_RE =
  /([0-9]+(?:[.,/][0-9]+)*)\s+([0-9]+(?:[.,][0-9]+)?)\s+[0-9]+(?:[.,][0-9]+)?\s*[Tt][ỷỉ]/u;
const MESSY_STREET_RE = /\s\+\s|Thửa|Tờ|Mặt phố/iu;

/**
 * The source `street` sometimes holds a long list of parcels
 * ("Mặt phố 562 + 561 ... Tờ 6 Đường 220") instead of a clean road name.
 * When it does, derive the road name from the title's leading address
 * (everything before the Diện tích value), dropping the house number.
 */
export function cleanStreet(
  rawStreet?: string | null,
  title?: string | null,
  area?: number | null,
  floor?: number | null
): string | null {
  const src = (rawStreet ?? "").trim();

  let toks: string[];
  if (src && !MESSY_STREET_RE.test(src)) {
    // source street is already a clean road name
    toks = src.split(/\s+/).filter(Boolean);
  } else if (title) {
    // derive the road name from the title's leading address (before Diện tích)
    const m = title.match(DIMS_RE);
    const prefix = (m && m.index != null ? title.slice(0, m.index) : title).trim();
    toks = prefix.split(/\s+/).filter(Boolean);

    // Cut everything from the Diện tích (area) token to the end.
    const areaS = area != null ? String(area) : null;
    let cut = -1;
    if (areaS) {
      for (let i = toks.length - 1; i >= 0; i--) {
        if (toks[i] === areaS) { cut = i; break; }
      }
    }
    if (cut >= 0) {
      toks = toks.slice(0, cut);
    } else {
      const floorS = floor != null ? String(floor) : null;
      while (toks.length > 1) {
        const t = toks[toks.length - 1];
        if (
          /^[0-9]+(?:[.,/][0-9]+)*$/.test(t) ||
          /^C\d+$/i.test(t) ||
          /^(Đất|đất|CC|NH)$/u.test(t) ||
          (floorS && t === floorS)
        ) {
          toks.pop();
        } else break;
      }
    }
  } else {
    return src || null;
  }

  // Drop a single leading house-number token ("XXX", "161.3.2", "85/100", "426")
  // so the detailed house number stays hidden for posting.
  if (toks.length > 1 && /^[0-9Xx]+(?:[.,/\-][0-9A-Za-z]+)*$/u.test(toks[0])) {
    toks.shift();
  }

  const out = toks.join(" ").trim();
  return out || src || null;
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
  const dims = parseDims(r.title);
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
    street: cleanStreet(r.location?.street, r.title, r.area, r.additional?.floor),
    houseNumber:
      r.location?.number && r.location.number !== "NaN"
        ? r.location.number
        : null,
    addressExtra: r.location?.address ?? null,

    priceValue: r.price?.value ?? null,
    priceUnit: r.price?.unit ?? null,
    priceAbsolute: r.price?.absolute ?? null,

    area: r.area ?? null,
    // Ngang & dài parsed from the title (source's structured `front` is unreliable).
    front: dims.widthNum ?? r.additional?.front ?? null,
    frontLabel:
      dims.widthLabel ??
      (r.additional?.front != null ? String(r.additional.front) : null),
    lengthM: dims.lengthM ?? null,
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
