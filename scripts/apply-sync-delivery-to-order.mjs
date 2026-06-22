import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL");
  process.exit(1);
}

const sql = await fs.readFile(new URL("./sync-delivery-to-order.sql", import.meta.url), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(sql);

  const rows = await client.query(`
    select d.reference, d.status as delivery_status, o.status as order_status, o.delivered_at
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.status in ('livre', 'en_livraison', 'echec')
    order by d.created_at desc
    limit 15
  `);

  console.log("Delivery -> order sync applied:");
  console.log(JSON.stringify(rows.rows, null, 2));
} finally {
  await client.end();
}
