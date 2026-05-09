-- Run these in Railway → Postgres → Data tab → SQL query bar, in order.
-- Each block matches the corresponding pgTable in drizzle/schema.ts.

CREATE TABLE IF NOT EXISTS trips (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  destination       TEXT,
  start_date        DATE,
  end_date          DATE,
  cover_image_url   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id          SERIAL PRIMARY KEY,
  trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  name        TEXT NOT NULL,
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  cost        NUMERIC(12,2),
  link        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_trip_id_idx ON items(trip_id);
