import type { Province } from "./source-api";

export type LocationIndex = {
  provinces: Province[];
  resolve: (
    provinceCode?: string,
    districtCode?: string,
    wardCode?: string
  ) => { province?: string; district?: string; ward?: string };
};

export function buildLocationIndex(provinces: Province[]): LocationIndex {
  const provMap = new Map<string, Province>();
  for (const p of provinces) {
    if (p.id) provMap.set(String(p.id), p);
  }

  function resolve(provinceCode?: string, districtCode?: string, wardCode?: string) {
    const out: { province?: string; district?: string; ward?: string } = {};
    const prov = provinceCode ? provMap.get(String(provinceCode)) : undefined;
    if (prov) {
      out.province = prov.name;
      const dist = districtCode
        ? prov.districts.find((d) => String(d.id) === String(districtCode))
        : undefined;
      if (dist) {
        out.district = dist.name;
        const ward = wardCode
          ? dist.wards.find((w) => String(w.id) === String(wardCode))
          : undefined;
        if (ward) out.ward = ward.name;
      }
    }
    return out;
  }

  return { provinces, resolve };
}
