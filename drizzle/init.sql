-- Run these in Railway → Postgres → Data tab → SQL query bar.
-- Each block matches the corresponding pgTable in drizzle/schema.ts.

CREATE TABLE IF NOT EXISTS trips (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  origin_name  TEXT,
  start_date   DATE,
  end_date     DATE,
  share_token  TEXT NOT NULL DEFAULT substring(md5(random()::text), 1, 12),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_destinations (
  id              SERIAL PRIMARY KEY,
  trip_id         INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  order_index     INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  arrival_mode    TEXT NOT NULL DEFAULT 'avion',
  arrival_date    DATE,
  departure_date  DATE,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_destinations_trip_id_idx ON trip_destinations(trip_id);

CREATE TABLE IF NOT EXISTS items (
  id             SERIAL PRIMARY KEY,
  destination_id INTEGER NOT NULL REFERENCES trip_destinations(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  name           TEXT NOT NULL,
  start_at       TIMESTAMPTZ,
  end_at         TIMESTAMPTZ,
  cost           NUMERIC(12,2),
  link           TEXT,
  notes          TEXT,
  created_by_name TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_destination_id_idx ON items(destination_id);
