import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Configure PostgreSQL connection pool with environment fallback
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.PG_POOL_MAX || "20", 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || "30000", 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || "5000", 10),
    }
  : {
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "mini_crm",
      password: process.env.PGPASSWORD || "postgres123",
      port: parseInt(process.env.PGPORT || "5432", 10),
      max: parseInt(process.env.PG_POOL_MAX || "20", 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || "30000", 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || "5000", 10),
    };

const pool = new Pool(poolConfig);

/**
 * Executes a database query with performance telemetry and error wrapping.
 * @param {string} text - SQL query text
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === "true") {
      console.log("Executed query", { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error("Database query error:", { text, error: error.message });
    throw error;
  }
}

/**
 * Health check function to verify database connectivity.
 * @returns {Promise<{ status: string, latencyMs: number }>}
 */
export async function checkHealth() {
  const start = Date.now();
  await pool.query("SELECT 1 AS health");
  return {
    status: "healthy",
    latencyMs: Date.now() - start,
  };
}

export default pool;