const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const postgres = require("postgres");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = readFileSync(join(__dirname, "init.sql"), "utf8");
  const client = postgres(url, { max: 1 });

  try {
    console.log("Applying schema…");
    await client.unsafe(sql);
    console.log("Schema applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
