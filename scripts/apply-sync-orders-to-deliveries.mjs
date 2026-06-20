import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL");
  process.exit(1);
}

const sql = await fs.readFile(new URL("./sync-orders-to-deliveries.sql", import.meta.url), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(sql);

  const rows = await client.query(`
    select d.reference, d.status, c.badge_id, d.recipient_name, d.scheduled_for
    from public.deliveries d
    join public.couriers c on c.id = d.courier_id
    where d.order_id is not null
    order by d.created_at desc
  `);

  console.log("Synced deliveries from orders:");
  console.log(JSON.stringify(rows.rows, null, 2));
} finally {
  await client.end();
}
