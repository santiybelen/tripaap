import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../drizzle/schema";

let _db: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(pool, { schema });
  }
  return _db;
}
