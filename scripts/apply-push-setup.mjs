import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL");
  process.exit(1);
}

const sql = await fs.readFile(new URL("./setup-push-notifications.sql", import.meta.url), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(sql);
  const { rows } = await client.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'push_subscriptions'
    order by ordinal_position
  `);
  console.log("push_subscriptions columns:", rows.map((r) => r.column_name).join(", "));
} finally {
  await client.end();
}
