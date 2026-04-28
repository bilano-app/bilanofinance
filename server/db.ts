import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 🚀 OPTIMASI SERVERLESS UNTUK AIVEN (Satpam Antrean Ketat)
export const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1, // KUNCI UTAMA: Cukup 1 koneksi per instance Vercel agar tidak melebihi limit 20 Aiven
    idleTimeoutMillis: 5000, // Tutup antrean lebih cepat (5 detik) jika sudah tidak dipakai
    connectionTimeoutMillis: 10000, // Cegah loading muter-muter tanpa batas
});

export const db = drizzle(pool, { schema });