import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SAD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const authHash = await client.query(`
    select au.encrypted_password
    from auth.users au
    join public.profiles p on p.id = au.id
    where p.badge_id = 'LIV002'
  `);
  const hash = authHash.rows[0]?.encrypted_password;
  console.log("LIV002 auth hash prefix:", hash?.slice(0, 20));

  // We can't know the password, but test crypt mechanism with auth hash
  const tests = await client.query(`
    select
      extensions.crypt('dummy', encrypted_password) = encrypted_password as auth_crypt_dummy
    from auth.users au
    join public.profiles p on p.id = au.id
    where p.badge_id = 'LIV002'
  `);
  console.log(tests.rows[0]);
} finally {
  await client.end();
}
