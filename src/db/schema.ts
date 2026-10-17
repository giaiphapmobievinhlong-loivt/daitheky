import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";

/**
 * Listings mirrored from the source API (bi-kip-tong) plus local-only fields
 * (survey state, survey photos). `id` is the source record id.
 */
export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  title: text("title"),
  description: text("description"),

  // location
  provinceCode: text("province_code"),
  districtCode: text("district_code"),
  wardCode: text("ward_code"),
  provinceName: text("province_name"),
  districtName: text("district_name"),
  wardName: text("ward_name"),
  street: text("street"),
  houseNumber: text("house_number"),
  addressExtra: text("address_extra"),

  // price
  priceValue: real("price_value"), // as shown (e.g. 3.9)
  priceUnit: integer("price_unit"),
  priceAbsolute: real("price_absolute"), // normalized (triệu)

  // specs
  area: real("area"),
  front: real("front"), // chiều ngang (số, để lọc/sắp xếp)
  frontLabel: text("front_label"), // chiều ngang hiển thị (vd "120/155")
  lengthM: real("length_m"), // chiều dài (tách từ tiêu đề)
  floor: integer("floor"),
  room: integer("room"),
  toilet: integer("toilet"),
  structure: text("structure"), // kết cấu (text summary)
  segment: integer("segment"),
  type: integer("type"),
  attribute: jsonb("attribute").$type<string[]>(),

  // media
  avatar: text("avatar"),
  imagesAlbum: text("images_album"),
  images: jsonb("images").$type<string[]>(),

  // source meta
  zoneGroup: text("zone_group"),
  saleType: text("sale_type"),
  transferStatus: integer("transfer_status"),
  level: integer("level"),
  sourceCreated: bigint("source_created", { mode: "number" }),
  sourceModified: bigint("source_modified", { mode: "number" }),
  sourcePublished: bigint("source_published", { mode: "number" }),
  raw: jsonb("raw"),

  // local-only
  surveyed: boolean("surveyed").notNull().default(false),
  surveyNote: text("survey_note"),
  surveyPhotos: jsonb("survey_photos").$type<string[]>().default([]),
  surveyedAt: timestamp("surveyed_at"),

  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
