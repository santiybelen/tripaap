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
  originName: text("origin_name"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const TRANSPORT_MODES = [
  "avion",
  "auto",
  "tren",
  "bus",
  "barco",
  "otro",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const tripDestinations = pgTable(
  "trip_destinations",
  {
    id: serial("id").primaryKey(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    coverImageUrl: text("cover_image_url"),
    arrivalMode: text("arrival_mode").notNull().default("avion"),
    arrivalDate: date("arrival_date"),
    departureDate: date("departure_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tripIdIdx: index("trip_destinations_trip_id_idx").on(t.tripId),
  })
);

export const ITEM_KINDS = [
  "vuelo",
  "hotel",
  "auto",
  "restaurante",
  "bar",
  "disco",
  "excursion",
  "otro",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    destinationId: integer("destination_id")
      .notNull()
      .references(() => tripDestinations.id, { onDelete: "cascade" }),
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
    destinationIdIdx: index("items_destination_id_idx").on(t.destinationId),
  })
);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripDestination = typeof tripDestinations.$inferSelect;
export type NewTripDestination = typeof tripDestinations.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
