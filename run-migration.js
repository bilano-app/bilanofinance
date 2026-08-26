import pg from 'pg';
import dotenv from 'dotenv';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Menghubungkan ke database...");
  const client = await pool.connect();
  console.log("Tersambung ke PostgreSQL. Menjalankan migrasi kolom dan tabel...");

  const queries = [
    // USERS
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS cash_balance BIGINT DEFAULT 0;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_since TIMESTAMP;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_valid_until TIMESTAMP;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_id TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_plan TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_price BIGINT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_sources JSON DEFAULT '[]';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custom_password_set BOOLEAN DEFAULT FALSE;`,

    // TRANSACTIONS
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date TIMESTAMP DEFAULT NOW();`,

    // INVESTMENTS
    `ALTER TABLE investments ADD COLUMN IF NOT EXISTS sekuritas TEXT;`,
    `ALTER TABLE investments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'saham';`,
    `ALTER TABLE investments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`,

    // DEBTS
    `ALTER TABLE debts ADD COLUMN IF NOT EXISTS source TEXT;`,
    `ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE debts ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;`,
    `ALTER TABLE debts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`,

    // TARGETS
    `ALTER TABLE targets ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'static';`,
    `ALTER TABLE targets ADD COLUMN IF NOT EXISTS start_month INTEGER DEFAULT 1;`,
    `ALTER TABLE targets ADD COLUMN IF NOT EXISTS start_year INTEGER DEFAULT 2026;`,
    `ALTER TABLE targets ADD COLUMN IF NOT EXISTS monthly_budget BIGINT DEFAULT 0;`,

    // SUBSCRIPTIONS
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cycle TEXT DEFAULT 'bulanan';`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_billing TIMESTAMP;`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`,

    // FOREX ASSETS
    `CREATE TABLE IF NOT EXISTS forex_assets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // CATEGORIES
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      color TEXT
    );`,

    // OTP SESSIONS
    `CREATE TABLE IF NOT EXISTS otp_sessions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // PORTFOLIO SNAPSHOTS
    `CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      cash_balance REAL NOT NULL,
      invest_value REAL NOT NULL,
      total_value REAL NOT NULL,
      assets_detail TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // TRACKING EVENTS
    `CREATE TABLE IF NOT EXISTS tracking_events (
      id SERIAL PRIMARY KEY,
      anonymous_id TEXT NOT NULL,
      user_id INTEGER,
      event_name TEXT NOT NULL,
      properties TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // HELP TICKETS
    `CREATE TABLE IF NOT EXISTS help_tickets (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER,
      email TEXT,
      name TEXT,
      subject TEXT,
      message TEXT,
      status TEXT,
      date TIMESTAMP DEFAULT NOW()
    );`,

    // EBOOKS
    `CREATE TABLE IF NOT EXISTS ebooks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      category TEXT,
      description TEXT,
      cover_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS cover_url TEXT;`,

    // WEALTH BLUEPRINT TABLES
    `CREATE TABLE IF NOT EXISTS user_income_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      tujuan TEXT NOT NULL,
      pola_kerja TEXT NOT NULL,
      latar_belakang JSON,
      keahlian JSON,
      keahlian_bebas TEXT,
      aset JSON,
      konstrain_waktu JSON,
      completed_at TIMESTAMP DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS income_strategy_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      opportunity_id TEXT NOT NULL,
      current_stage INTEGER NOT NULL,
      action_items JSON NOT NULL,
      completed_actions JSON NOT NULL,
      current_bottlenecks JSON,
      kpi_status JSON,
      next_action_step TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS income_milestones (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_achieved BOOLEAN DEFAULT FALSE,
      target_date TIMESTAMP,
      achieved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS revenue_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount BIGINT NOT NULL,
      note TEXT,
      date TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );`
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log(`✅ Berhasil: ${q.slice(0, 60)}...`);
    } catch (err) {
      console.error(`❌ Gagal: ${q.slice(0, 60)}... Error: ${err.message}`);
    }
  }

  client.release();
  await pool.end();
  console.log("🎉 SEMUA MIGRASI BERHASIL DIJALANKAN!");
}

run().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
