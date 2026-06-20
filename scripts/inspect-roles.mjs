import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const roles = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema='public' and table_name='user_roles'
    order by ordinal_position
  `);
  console.log("user_roles columns:", roles.rows);

  const roleData = await client.query(`
    select ur.*, p.full_name, p.badge_id, p.phone
    from public.user_roles ur
    left join public.profiles p on p.id = ur.user_id
    order by ur.created_at
  `);
  console.log("user_roles data:", JSON.stringify(roleData.rows, null, 2));

  const enums = await client.query(`
    select t.typname, e.enumlabel
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by t.typname, e.enumsortorder
  `);
  console.log("enums:", enums.rows);
} finally {
  await client.end();
}
