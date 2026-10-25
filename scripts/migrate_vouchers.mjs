process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("1. Adding applicable_product_id to adrien_vouchers...");
    await client.query(`ALTER TABLE adrien_vouchers ADD COLUMN IF NOT EXISTS applicable_product_id INTEGER;`);

    console.log("2. Upserting AF14 voucher (40% discount for bundling)...");
    await client.query(`
      INSERT INTO adrien_vouchers (code, discount_type, discount_value, min_spend, usage_limit, times_used, is_active, applicable_product_id)
      VALUES 
      ('AF14', 'PERCENT', 40, 0, 99999, 0, true, 2),
      ('SEREBU', 'SET_PRICE', 1000, 0, 99999, 0, true, NULL)
      ON CONFLICT (code) 
      DO UPDATE SET 
        discount_type = EXCLUDED.discount_type,
        discount_value = EXCLUDED.discount_value,
        is_active = true,
        applicable_product_id = EXCLUDED.applicable_product_id;
    `);

    console.log("3. Querying vouchers in DB...");
    const res = await client.query(`SELECT id, code, discount_type, discount_value, min_spend, is_active, applicable_product_id FROM adrien_vouchers ORDER BY id ASC;`);
    console.log("CURRENT VOUCHERS IN DB:", JSON.stringify(res.rows, null, 2));

    console.log("Migration complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
