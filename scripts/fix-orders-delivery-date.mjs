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
  const before = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name in ('delivery_date', 'delivery_time')
    order by column_name
  `);
  console.log("Before:", before.rows);

  await client.query(`
    alter table public.orders
      add column if not exists delivery_date date,
      add column if not exists delivery_time text;
  `);

  const after = await client.query(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name in ('delivery_date', 'delivery_time')
    order by column_name
  `);
  console.log("After:", after.rows);
  console.log("OK — delivery_date and delivery_time added to orders.");
} finally {
  await client.end();
}
