import fs from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const sql = await fs.readFile(new URL("./fix-delivery-currency-rdc.sql", import.meta.url), "utf8");
  await client.query(sql);

  const syncSql = await fs.readFile(new URL("./sync-orders-to-deliveries.sql", import.meta.url), "utf8");
  await client.query(syncSql);

  const rows = await client.query(`
    select d.reference, d.country_code, d.product_amount_fcfa, d.delivery_fee_fcfa,
           d.amount_to_collect_fcfa, o.total_usd, o.total_fcfa, c.badge_id
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    join public.couriers c on c.id = d.courier_id
    order by d.created_at desc
    limit 8
  `);
  console.log(JSON.stringify(rows.rows, null, 2));
} finally {
  await client.end();
}
