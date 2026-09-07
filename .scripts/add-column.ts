import { db } from '../server/db.ts';
import { sql } from 'drizzle-orm';
async function main() {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS app_open_count integer DEFAULT 0;`);
    console.log('Added app_open_count');
    process.exit(0);
}
main();
