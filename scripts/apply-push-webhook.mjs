import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;
if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL");
  process.exit(1);
}

const sql = await fs.readFile(new URL("./setup-push-webhook.sql", import.meta.url), "utf8");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(sql);
  const triggers = await client.query(`
    select tgname from pg_trigger
    where tgrelid = 'public.notifications'::regclass and not tgisinternal
  `);
  console.log("notifications triggers:", triggers.rows.map((r) => r.tgname).join(", "));
} finally {
  await client.end();
}
