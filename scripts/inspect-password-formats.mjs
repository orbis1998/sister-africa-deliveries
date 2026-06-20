import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const rows = await client.query(`
    select p.badge_id,
           left(p.password_hash, 10) as profile_hash,
           left(au.encrypted_password, 10) as auth_hash
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role = 'livreur'
    join auth.users au on au.id = p.id
  `);
  console.log(rows.rows);

  // test crypt against profile hash for a wrong password format check
  const test = await client.query(`
    select extensions.crypt('test', '$2b$12$63668lX3OJ8PGHTjwak9DetfIYvqWa3XLjU4ioayyL3xeHS8eoet.') =
           '$2b$12$63668lX3OJ8PGHTjwak9DetfIYvqWa3XLjU4ioayyL3xeHS8eoet.' as profile_crypt_works
  `);
  console.log("profile crypt test:", test.rows[0]);
} finally {
  await client.end();
}
