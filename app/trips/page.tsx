import { Pool } from "pg";

export const dynamic = "force-dynamic";

let pool: Pool | undefined;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export default async function TripsPage() {
  let dbStatus: string;
  let dbTime: string | null = null;

  try {
    const result = await getPool().query<{ now: Date }>("SELECT NOW() as now");
    dbStatus = "OK";
    dbTime = result.rows[0].now.toISOString();
  } catch (err) {
    dbStatus = "ERROR: " + (err instanceof Error ? err.message : String(err));
  }

  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "3rem 1.5rem",
        maxWidth: "720px",
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Trips</h1>
      <p>
        Estado de la DB: <strong>{dbStatus}</strong>
      </p>
      {dbTime && (
        <p style={{ color: "#444" }}>
          <code>SELECT NOW()</code> = {dbTime}
        </p>
      )}
    </main>
  );
}
