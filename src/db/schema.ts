import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  numeric,
  primaryKey,
  uniqueIndex,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- enums ----------

export const itemCategory = pgEnum("item_category", [
  "flight",
  "hotel",
  "car",
  "excursion",
  "restaurant",
  "other",
]);

export const itemStatus = pgEnum("item_status", [
  "confirmed",
  "proposed", // an option waiting on a vote
]);

export const memberRole = pgEnum("member_role", ["owner", "member"]);

// ---------- Auth.js tables (compatible with @auth/drizzle-adapter) ----------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"), // for credentials login
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => ({
    pk: primaryKey({ columns: [a.provider, a.providerAccountId] }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ---------- domain tables ----------

export const trips = pgTable("trip", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  destination: text("destination"),
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  startDateConfirmed: boolean("start_date_confirmed").notNull().default(true),
  endDateConfirmed: boolean("end_date_confirmed").notNull().default(true),
  shareToken: varchar("share_token", { length: 32 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tripMembers = pgTable(
  "trip_member",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tripId, t.userId] }),
  })
);

// A group of items that participants vote on (e.g. "3 hotels to choose from").
export const decisions = pgTable("decision", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  category: itemCategory("category").notNull(),
  title: text("title").notNull(),
  decidedItemId: uuid("decided_item_id"), // FK set when the organizer confirms
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const items = pgTable("item", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  category: itemCategory("category").notNull(),
  status: itemStatus("status").notNull().default("confirmed"),
  decisionId: uuid("decision_id").references(() => decisions.id, {
    onDelete: "cascade",
  }), // not null = this item is one of several options in a decision

  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  confirmationCode: text("confirmation_code"),
  bookingUrl: text("booking_url"),

  priceAmount: numeric("price_amount", { precision: 12, scale: 2 }),
  priceCurrency: varchar("price_currency", { length: 3 }),

  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const votes = pgTable(
  "vote",
  {
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (v) => ({
    pk: primaryKey({ columns: [v.decisionId, v.userId] }),
    itemIdx: uniqueIndex("vote_item_user_idx").on(v.itemId, v.userId),
  })
);

export const attachments = pgTable("attachment", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  uploadedById: text("uploaded_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// ---------- relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  ownedTrips: many(trips),
  memberships: many(tripMembers),
  votes: many(votes),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  owner: one(users, { fields: [trips.ownerId], references: [users.id] }),
  members: many(tripMembers),
  items: many(items),
  decisions: many(decisions),
}));

export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, { fields: [tripMembers.tripId], references: [trips.id] }),
  user: one(users, { fields: [tripMembers.userId], references: [users.id] }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  trip: one(trips, { fields: [items.tripId], references: [trips.id] }),
  decision: one(decisions, {
    fields: [items.decisionId],
    references: [decisions.id],
  }),
  attachments: many(attachments),
  votes: many(votes),
}));

export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  trip: one(trips, { fields: [decisions.tripId], references: [trips.id] }),
  options: many(items),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  decision: one(decisions, {
    fields: [votes.decisionId],
    references: [decisions.id],
  }),
  item: one(items, { fields: [votes.itemId], references: [items.id] }),
  user: one(users, { fields: [votes.userId], references: [users.id] }),
}));
