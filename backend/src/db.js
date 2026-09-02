import pg from "pg";

const { Pool } = pg;

export function createDatabase(databaseUrl) {
  const pool = databaseUrl
    ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 8,
    })
    : null;

  async function query(text, values = []) {
    if (!pool) throw new Error("DATABASE_URL is not configured.");
    return pool.query(text, values);
  }

  return {
    configured: Boolean(pool),
    query,
    async health() {
      if (!pool) return { ok: false, error: "DATABASE_URL is not configured." };
      try {
        await query("SELECT 1");
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "PostgreSQL health check failed." };
      }
    },
    async close() {
      await pool?.end();
    },
  };
}
