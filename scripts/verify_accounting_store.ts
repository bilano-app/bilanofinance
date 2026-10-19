import "dotenv/config";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import { getEbookPdfBuffer } from "../server/adrienStore.js";

async function verify() {
  console.log("=== VERIFYING ADRIEN FANDRA STORE PRODUCTS & PDF ACCESS ===");
  const products = await db.execute(sql`
    SELECT id, slug, title, sale_price, regular_price, cover_url, pdf_filename, sort_order 
    FROM adrien_products 
    WHERE is_active = true 
    ORDER BY sort_order ASC, id ASC
  `);

  console.log(`Found ${products.rows.length} active products in database:`);
  for (const [index, p] of (products.rows as any[]).entries()) {
    console.log(`\n[#${index + 1}] Order: ${p.sort_order} | ID: ${p.id}`);
    console.log(`Title: ${p.title}`);
    console.log(`Sale Price: Rp ${Number(p.sale_price).toLocaleString('id-ID')} (Coret: Rp ${Number(p.regular_price).toLocaleString('id-ID')})`);
    console.log(`Cover: ${p.cover_url}`);
    console.log(`PDF Filename: ${p.pdf_filename}`);

    const res = await getEbookPdfBuffer(p, "Budi Santoso", `ORDER-TEST-${p.id}`);
    console.log(`Resolved PDF: ${res.filename} (${(res.buffer.length / 1024 / 1024).toFixed(2)} MB, ${res.buffer.length} bytes)`);
  }

  console.log("\n=== ALL PRODUCTS & PDFS VERIFIED SUCCESSFULLY! ===");
  process.exit(0);
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
