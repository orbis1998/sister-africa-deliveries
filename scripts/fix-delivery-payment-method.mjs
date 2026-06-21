import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const result = await client.query(`
    update public.deliveries
    set payment_method = 'especes'::public.payment_method
    where payment_method = 'paye'::public.payment_method
    returning reference
  `);
  console.log(`Updated ${result.rowCount} deliveries to especes`);
} finally {
  await client.end();
}
