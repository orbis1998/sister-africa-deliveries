import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const sql = await fs.readFile("scripts/sync-livreurs.sql", "utf8");
  await client.query(sql);

  const couriers = await client.query(`
    select c.id, c.badge_id, c.full_name, c.profile_id, c.active,
           left(c.password_hash, 10) as hash_prefix
    from public.couriers c
    order by c.badge_id
  `);
  console.log("Couriers after sync:");
  console.log(JSON.stringify(couriers.rows, null, 2));
} finally {
  await client.end();
}
