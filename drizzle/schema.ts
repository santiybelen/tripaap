import {
  pgTable,
  serial,
  integer,
  text,
  date,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  destination: text("destination"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ITEM_KINDS = [
  "vuelo",
  "hotel",
  "auto",
  "excursion",
  "restaurante",
  "otro",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    link: text("link"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tripIdIdx: index("items_trip_id_idx").on(t.tripId),
  })
);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
