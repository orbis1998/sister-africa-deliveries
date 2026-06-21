import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL");
  process.exit(1);
}

const sql = await fs.readFile(new URL("./add-delivery-amount-breakdown.sql", import.meta.url), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(sql);

  const rows = await client.query(`
    select reference, product_amount_fcfa, delivery_fee_fcfa, amount_to_collect_fcfa, payment_method
    from public.deliveries
    order by created_at desc
    limit 10
  `);

  console.log("Delivery amount breakdown applied:");
  console.log(JSON.stringify(rows.rows, null, 2));
} finally {
  await client.end();
}
