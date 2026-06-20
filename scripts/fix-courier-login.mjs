import pg from "pg";

const { Client } = pg;
const connectionString = process.env.SAD_DATABASE_URL;

if (!connectionString) {
  console.error("Missing SAD_DATABASE_URL environment variable.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(`
    create or replace function public.courier_login(
      p_badge_id text,
      p_password text
    )
    returns jsonb
    language plpgsql
    security definer
    set search_path = public, extensions
    as $$
    declare
      v_courier public.couriers%rowtype;
    begin
      select *
        into v_courier
      from public.couriers
      where badge_id = upper(trim(p_badge_id))
        and active = true
      limit 1;

      if v_courier.id is null or v_courier.password_hash <> extensions.crypt(p_password, v_courier.password_hash) then
        return jsonb_build_object('error', 'Identifiants invalides.');
      end if;

      return jsonb_build_object(
        'courier',
        jsonb_build_object(
          'id', v_courier.id,
          'badge_id', v_courier.badge_id,
          'full_name', v_courier.full_name,
          'phone', v_courier.phone,
          'zone', v_courier.zone,
          'avatar_initials', v_courier.avatar_initials
        )
      );
    end;
    $$;

    revoke all on function public.courier_login(text, text) from public;
    grant execute on function public.courier_login(text, text) to anon, authenticated;
  `);

  console.log("courier_login fixed");
} finally {
  await client.end();
}
