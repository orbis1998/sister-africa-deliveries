import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const authUsers = await client.query(`
    select column_name from information_schema.columns
    where table_schema='auth' and table_name='users'
    order by ordinal_position
  `);
  console.log("auth.users cols:", authUsers.rows.map((r) => r.column_name).slice(0, 15));

  const profileAuth = await client.query(`
    select p.id, p.badge_id, p.full_name, au.email, au.encrypted_password is not null as has_auth_pw
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role = 'livreur'
    left join auth.users au on au.id = p.id
  `);
  console.log(JSON.stringify(profileAuth.rows, null, 2));
} finally {
  await client.end();
}
