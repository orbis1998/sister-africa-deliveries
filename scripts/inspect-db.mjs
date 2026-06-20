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
  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  console.log("=== PUBLIC TABLES ===");
  console.log(tables.rows.map((r) => r.table_name).join(", "));

  for (const name of ["profiles", "profils", "couriers", "users", "staff", "employees", "livreurs", "delivery_agents"]) {
    const exists = tables.rows.some((r) => r.table_name === name);
    if (!exists) continue;
    const cols = await client.query(
      `select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,
      [name],
    );
    const count = await client.query(`select count(*)::int as n from public.${name}`);
    console.log(`\n=== ${name} (${count.rows[0].n} rows) ===`);
    console.log(cols.rows.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
    const sample = await client.query(`select * from public.${name} limit 5`);
    console.log(JSON.stringify(sample.rows, null, 2));
  }

  const courierCount = await client.query(`select count(*)::int as n from public.couriers`);
  console.log(`\n=== couriers count: ${courierCount.rows[0].n} ===`);
  const couriers = await client.query(`select id, badge_id, full_name, phone, zone, active from public.couriers`);
  console.log(JSON.stringify(couriers.rows, null, 2));
} finally {
  await client.end();
}
