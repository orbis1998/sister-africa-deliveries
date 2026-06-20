import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL environment variable.");
  process.exit(1);
}

const expectedTables = ["couriers", "deliveries", "delivery_events", "notifications"];
const expectedTypes = ["delivery_status", "payment_method"];
const expectedFunctions = ["courier_login"];

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function inspect() {
  const [tables, types, functions] = await Promise.all([
    client.query(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1)
        order by table_name
      `,
      [expectedTables],
    ),
    client.query(
      `
        select typname
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and typname = any($1)
        order by typname
      `,
      [expectedTypes],
    ),
    client.query(
      `
        select proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and proname = any($1)
        order by proname
      `,
      [expectedFunctions],
    ),
  ]);

  return {
    tables: tables.rows.map((r) => r.table_name),
    types: types.rows.map((r) => r.typname),
    functions: functions.rows.map((r) => r.proname),
  };
}

function diff(before, after) {
  return {
    tables: after.tables.filter((x) => !before.tables.includes(x)),
    types: after.types.filter((x) => !before.types.includes(x)),
    functions: after.functions.filter((x) => !before.functions.includes(x)),
  };
}

await client.connect();

try {
  const before = await inspect();
  console.log("Before:", JSON.stringify(before));

  const sql = await fs.readFile("supabase-setup.sql", "utf8");
  await client.query(sql);

  const after = await inspect();
  const added = diff(before, after);

  console.log("After:", JSON.stringify(after));
  console.log("Added:", JSON.stringify(added));

  const sample = await client.query(
    `
      select
        (select count(*)::int from public.couriers) as couriers,
        (select count(*)::int from public.deliveries) as deliveries,
        (select count(*)::int from public.delivery_events) as delivery_events,
        (select count(*)::int from public.notifications) as notifications
    `,
  );
  console.log("Counts:", JSON.stringify(sample.rows[0]));
} finally {
  await client.end();
}
