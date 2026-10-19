import "dotenv/config";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`
      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp'
      WHERE id = 1 OR slug = 'logika-akuntansi';
    `);

    await db.execute(sql`
      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Tiga_Buku_Akuntansi_Interaktif.webp'
      WHERE id = 2 OR slug = 'paket-bundling-3-buku';
    `);

    await db.execute(sql`
      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp'
      WHERE id = 3 OR slug = 'full-accounting';
    `);

    await db.execute(sql`
      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp'
      WHERE id = 4 OR slug = 'gudang-akuntansi';
    `);

    console.log("SUCCESS: Database cover_urls updated to WebP!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating DB:", err);
    process.exit(1);
  }
}

main();
