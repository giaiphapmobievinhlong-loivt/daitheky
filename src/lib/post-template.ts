import { formatPrice, publicAddress } from "./mapper";

const CONTACT_LINE =
  "☎️ Liên hệ ngay em Lợi Phúc Minh để đi xem nhà trực tiếp 0379386629";

export type PostInput = {
  floor?: number | null;
  front?: number | null; // ngang (mặt tiền)
  lengthM?: number | null; // dài
  area?: number | null;
  structure?: string | null;
  districtName?: string | null;
  wardName?: string | null;
  street?: string | null;
  priceValue?: number | null;
  priceAbsolute?: number | null;
  attribute?: string[] | null;
};

/**
 * Build a social-media post from a listing. House number is hidden;
 * only street / ward / district are shown.
 */
export function buildPost(l: PostInput): string {
  const lines: string[] = [];

  const headlineBits: string[] = [];
  if (l.floor && l.floor > 0) headlineBits.push(`NHÀ ${l.floor} TẦNG`);
  if (l.front && l.front > 0) headlineBits.push(`NGANG ${l.front}M`);
  headlineBits.push(`GIÁ ${formatPrice(l)}`);
  if (l.districtName) headlineBits.push(l.districtName.toUpperCase());
  lines.push(`🏡🔥 ${headlineBits.join(" – ")} 🔥🏡`);
  lines.push("");

  const addr = publicAddress(l);
  if (addr) lines.push(`📍 Địa chỉ: ${addr}`);

  const specs: string[] = [];
  if (l.area != null) specs.push(`Diện tích: ${l.area}m²`);
  if (l.front != null && l.front > 0 && l.lengthM != null && l.lengthM > 0) {
    specs.push(`Kích thước: ${l.front}m x ${l.lengthM}m (ngang x dài)`);
  } else if (l.front != null && l.front > 0) {
    specs.push(`Ngang: ${l.front}m`);
  } else if (l.lengthM != null && l.lengthM > 0) {
    specs.push(`Dài: ${l.lengthM}m`);
  }
  if (l.structure) specs.push(`Kết cấu: ${l.structure}`);
  if (specs.length) {
    lines.push("");
    lines.push("✨ Thông tin:");
    for (const s of specs) lines.push(`• ${s}`);
  }

  lines.push("");
  lines.push(`💰 Giá bán: ${formatPrice(l)}`);

  if (l.attribute && l.attribute.length) {
    lines.push("");
    lines.push(`🏷️ ${l.attribute.map((a) => `#${a.replace(/\s+/g, "")}`).join(" ")}`);
  }

  lines.push("");
  lines.push(CONTACT_LINE);

  return lines.join("\n");
}

export { CONTACT_LINE };
