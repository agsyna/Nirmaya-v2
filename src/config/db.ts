import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env";

// Create pool with serverless-optimized settings
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 2, // Serverless: low connection limit
  min: 0,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 8000,
});

export const db = drizzle(pool);

export default db;
