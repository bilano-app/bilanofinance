import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 🚀 OPTIMASI SULTAN: KONEKSI POOLING (Anti Database Down/Timeout)
export const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10, // Batasi jumlah antrean koneksi per server
    idleTimeoutMillis: 30000 // Matikan koneksi yang tidak terpakai
});
export const db = drizzle(pool, { schema });