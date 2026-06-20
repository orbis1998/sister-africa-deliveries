import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const r = await client.query(`
    select
      password_hash,
      extensions.crypt('1234', password_hash) = password_hash as works_1234
    from public.couriers where badge_id = 'TSA-2041'
  `);
  console.log(r.rows[0]);
} finally {
  await client.end();
}
