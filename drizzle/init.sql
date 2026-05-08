-- Run this once in Railway → Postgres → Data tab → Query.
-- Creates the trips table that drizzle/schema.ts maps to.

CREATE TABLE IF NOT EXISTS trips (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  destination  TEXT,
  start_date   DATE,
  end_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
