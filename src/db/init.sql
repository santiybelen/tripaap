-- Initial schema for Tripaap. Idempotent: safe to run on every deploy.

-- ===== enums =====
DO $$ BEGIN
  CREATE TYPE "item_category" AS ENUM ('flight', 'hotel', 'car', 'excursion', 'restaurant', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "item_status" AS ENUM ('confirmed', 'proposed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "member_role" AS ENUM ('owner', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Auth.js tables =====
CREATE TABLE IF NOT EXISTS "user" (
  "id"            text PRIMARY KEY,
  "name"          text,
  "email"         text UNIQUE,
  "emailVerified" timestamp,
  "image"         text,
  "password_hash" text
);

CREATE TABLE IF NOT EXISTS "account" (
  "userId"            text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type"              text NOT NULL,
  "provider"          text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token"     text,
  "access_token"      text,
  "expires_at"        integer,
  "token_type"        text,
  "scope"             text,
  "id_token"          text,
  "session_state"     text,
  PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY,
  "userId"       text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires"      timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token"      text NOT NULL,
  "expires"    timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- ===== domain tables =====
CREATE TABLE IF NOT EXISTS "trip" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"               text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name"                   text NOT NULL,
  "destination"            text,
  "start_date"             timestamp,
  "end_date"               timestamp,
  "start_date_confirmed"   boolean NOT NULL DEFAULT true,
  "end_date_confirmed"     boolean NOT NULL DEFAULT true,
  "share_token"            varchar(32) NOT NULL UNIQUE,
  "created_at"             timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trip_member" (
  "trip_id"   uuid NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
  "user_id"   text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role"      "member_role" NOT NULL DEFAULT 'member',
  "joined_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("trip_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "decision" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id"          uuid NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
  "category"         "item_category" NOT NULL,
  "title"            text NOT NULL,
  "decided_item_id"  uuid,
  "created_at"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "item" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id"           uuid NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
  "category"          "item_category" NOT NULL,
  "status"            "item_status" NOT NULL DEFAULT 'confirmed',
  "decision_id"       uuid REFERENCES "decision"("id") ON DELETE CASCADE,
  "title"             text NOT NULL,
  "description"       text,
  "location"          text,
  "start_at"          timestamp,
  "end_at"            timestamp,
  "confirmation_code" text,
  "booking_url"       text,
  "price_amount"      numeric(12, 2),
  "price_currency"    varchar(3),
  "notes"             text,
  "created_at"        timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "vote" (
  "decision_id" uuid NOT NULL REFERENCES "decision"("id") ON DELETE CASCADE,
  "item_id"     uuid NOT NULL REFERENCES "item"("id") ON DELETE CASCADE,
  "user_id"     text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("decision_id", "user_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vote_item_user_idx" ON "vote" ("item_id", "user_id");

CREATE TABLE IF NOT EXISTS "attachment" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_id"        uuid NOT NULL REFERENCES "item"("id") ON DELETE CASCADE,
  "file_name"      text NOT NULL,
  "file_url"       text NOT NULL,
  "mime_type"      text,
  "size_bytes"     integer,
  "uploaded_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "uploaded_at"    timestamp NOT NULL DEFAULT now()
);
