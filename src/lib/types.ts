export type ListingDTO = {
  id: string;
  title: string | null;
  description: string | null;
  provinceName: string | null;
  districtName: string | null;
  wardName: string | null;
  street: string | null;
  houseNumber: string | null;
  addressExtra: string | null;
  priceValue: number | null;
  priceAbsolute: number | null;
  area: number | null;
  front: number | null;
  frontLabel: string | null;
  lengthM: number | null;
  floor: number | null;
  room: number | null;
  toilet: number | null;
  structure: string | null;
  attribute: string[] | null;
  avatar: string | null;
  images: string[] | null;
  surveyed: boolean;
  surveyNote: string | null;
  surveyPhotos: string[] | null;
  sourceModified: number | null;
};

export type FiltersData = {
  districts: { district: string; wards: string[] }[];
  floors: number[];
};
