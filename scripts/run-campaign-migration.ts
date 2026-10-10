import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No DATABASE_URL found');
    return;
  }

  const sqlPath = path.resolve('supabase/migrations/20260905000001_campaign_strategies_versioned.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to PostgreSQL database...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Executing migration 20260905000001_campaign_strategies_versioned.sql...');

    await client.query(sqlContent);
    console.log('Migration executed successfully!');

    // Verify tables created
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'campaign_%'
      ORDER BY table_name;
    `);
    console.log('Verified campaign tables:', res.rows.map(r => r.table_name));

    await client.end();
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    if (client) await client.end().catch(() => {});
  }
}

runMigration().catch(console.error);
