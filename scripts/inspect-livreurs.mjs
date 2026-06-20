import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const livreurs = await client.query(`
    select p.id, p.full_name, p.phone, p.badge_id, p.city_scope,
           p.password_hash is not null as has_password,
           left(p.password_hash, 7) as hash_prefix
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role = 'livreur'
    order by p.badge_id
  `);
  console.log(JSON.stringify(livreurs.rows, null, 2));

  // Test bcrypt verify for LIV001 if we know password - we don't, skip
  const ext = await client.query(`select extname from pg_extension where extname in ('pgcrypto')`);
  console.log("extensions:", ext.rows);
} finally {
  await client.end();
}
