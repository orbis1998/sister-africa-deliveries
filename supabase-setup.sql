-- The Sister Africa Delivery - initial Supabase schema
-- Run this file in Supabase Dashboard > SQL Editor.
-- After this file, also run scripts/sync-livreurs.sql to link admin-created livreurs (profiles) to couriers.
-- Demo login inserted at the end:
--   Badge: TSA-2041
--   Password: 1234
-- Admin-created livreurs use their badge (e.g. LIV001) and the password set in admin.

create extension if not exists pgcrypto;

do $$
begin
  create type public.delivery_status as enum (
    'assignee',
    'en_route_pickup',
    'colis_recupere',
    'en_livraison',
    'livre',
    'echec',
    'retour'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('especes', 'mobile_money', 'paye');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.couriers (
  id uuid primary key default gen_random_uuid(),
  badge_id text not null unique,
  password_hash text not null,
  full_name text not null,
  phone text not null,
  zone text not null,
  avatar_initials text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status public.delivery_status not null default 'assignee',
  created_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  recipient_name text not null,
  recipient_phone text not null,
  address_line text not null,
  city text not null default 'Kinshasa',
  neighborhood text not null,
  geo jsonb,
  product_summary text not null,
  items_count integer not null default 1 check (items_count > 0),
  product_amount_fcfa integer not null default 0 check (product_amount_fcfa >= 0),
  delivery_fee_fcfa integer not null default 0 check (delivery_fee_fcfa >= 0),
  amount_to_collect_fcfa integer not null default 0 check (amount_to_collect_fcfa >= 0),
  payment_method public.payment_method not null default 'paye',
  notes text,
  courier_id uuid not null references public.couriers(id) on delete cascade
);

create table if not exists public.delivery_events (
  id text primary key,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  at timestamptz not null default now(),
  status public.delivery_status not null,
  note text,
  by text not null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.couriers(id) on delete cascade,
  type text not null default 'delivery',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deliveries_courier_id_idx on public.deliveries(courier_id);
create index if not exists deliveries_scheduled_for_idx on public.deliveries(scheduled_for);
create index if not exists delivery_events_delivery_id_idx on public.delivery_events(delivery_id);
create index if not exists notifications_courier_id_created_at_idx on public.notifications(courier_id, created_at desc);

alter table public.couriers enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "anon can read deliveries" on public.deliveries;
create policy "anon can read deliveries"
on public.deliveries
for select
to anon
using (true);

drop policy if exists "anon can update delivery status" on public.deliveries;
create policy "anon can update delivery status"
on public.deliveries
for update
to anon
using (true)
with check (true);

drop policy if exists "anon can read delivery events" on public.delivery_events;
create policy "anon can read delivery events"
on public.delivery_events
for select
to anon
using (true);

drop policy if exists "anon can insert delivery events" on public.delivery_events;
create policy "anon can insert delivery events"
on public.delivery_events
for insert
to anon
with check (true);

drop policy if exists "anon can read notifications" on public.notifications;
create policy "anon can read notifications"
on public.notifications
for select
to anon
using (true);

-- Login is handled through this RPC. It avoids exposing password_hash in direct table reads.
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

grant usage on schema public to anon, authenticated;
grant select, update on public.deliveries to anon, authenticated;
grant select, insert on public.delivery_events to anon, authenticated;
grant select on public.notifications to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.deliveries;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.delivery_events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

insert into public.couriers (
  id,
  badge_id,
  password_hash,
  full_name,
  phone,
  zone,
  avatar_initials
) values (
  '00000000-0000-0000-0000-000000000001',
  'TSA-2041',
  extensions.crypt('1234', extensions.gen_salt('bf')),
  'Amani Mwamba',
  '+243 812 445 902',
  'Kinshasa - Gombe / Limete',
  'AM'
)
on conflict (badge_id) do update set
  password_hash = excluded.password_hash,
  full_name = excluded.full_name,
  phone = excluded.phone,
  zone = excluded.zone,
  avatar_initials = excluded.avatar_initials,
  active = true;

insert into public.deliveries (
  id,
  reference,
  status,
  created_at,
  scheduled_for,
  recipient_name,
  recipient_phone,
  address_line,
  city,
  neighborhood,
  product_summary,
  items_count,
  product_amount_fcfa,
  delivery_fee_fcfa,
  amount_to_collect_fcfa,
  payment_method,
  notes,
  courier_id
) values
(
  '10000000-0000-0000-0000-000000000001',
  'TSA-10241',
  'en_livraison',
  now() - interval '4 hours',
  now() + interval '1 hour',
  'Grace Lumbala',
  '+243 819 220 410',
  '12 Av. Kasa-Vubu, Imm. Etoile, App 4B',
  'Kinshasa',
  'Gombe',
  'Mass Grainer - 2 sachets',
  2,
  25000,
  5000,
  30000,
  'especes',
  'Sonner deux fois. Code immeuble: 2407.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '10000000-0000-0000-0000-000000000002',
  'TSA-10242',
  'assignee',
  now() - interval '1 hour',
  now() + interval '3 hours',
  'Benedicte Okoye',
  '+243 822 117 833',
  '47 Bd Lumumba, Ref. pharmacie Espoir',
  'Kinshasa',
  'Limete',
  'Bouillie Croissance Enfant',
  1,
  12000,
  3000,
  15000,
  'mobile_money',
  null,
  '00000000-0000-0000-0000-000000000001'
),
(
  '10000000-0000-0000-0000-000000000003',
  'TSA-10243',
  'livre',
  now() - interval '26 hours',
  now() - interval '22 hours',
  'Sarah Mbenza',
  '+243 815 990 121',
  '8 Rue des Manguiers',
  'Kinshasa',
  'Bandal',
  'Mass Grainer - 1 sachet',
  1,
  12000,
  3000,
  15000,
  'paye',
  null,
  '00000000-0000-0000-0000-000000000001'
)
on conflict (reference) do update set
  status = excluded.status,
  scheduled_for = excluded.scheduled_for,
  recipient_name = excluded.recipient_name,
  recipient_phone = excluded.recipient_phone,
  address_line = excluded.address_line,
  city = excluded.city,
  neighborhood = excluded.neighborhood,
  product_summary = excluded.product_summary,
  items_count = excluded.items_count,
  product_amount_fcfa = excluded.product_amount_fcfa,
  delivery_fee_fcfa = excluded.delivery_fee_fcfa,
  amount_to_collect_fcfa = excluded.amount_to_collect_fcfa,
  payment_method = excluded.payment_method,
  notes = excluded.notes,
  courier_id = excluded.courier_id;

insert into public.delivery_events (id, delivery_id, at, status, by, note) values
  ('seed-e-1001-1', '10000000-0000-0000-0000-000000000001', now() - interval '4 hours', 'assignee', 'Dispatch', 'Course creee'),
  ('seed-e-1001-2', '10000000-0000-0000-0000-000000000001', now() - interval '2 hours', 'colis_recupere', 'Amani Mwamba', null),
  ('seed-e-1001-3', '10000000-0000-0000-0000-000000000001', now() - interval '30 minutes', 'en_livraison', 'Amani Mwamba', null),
  ('seed-e-1002-1', '10000000-0000-0000-0000-000000000002', now() - interval '1 hour', 'assignee', 'Dispatch', null),
  ('seed-e-1003-1', '10000000-0000-0000-0000-000000000003', now() - interval '26 hours', 'assignee', 'Dispatch', null),
  ('seed-e-1003-2', '10000000-0000-0000-0000-000000000003', now() - interval '22 hours', 'livre', 'Amani Mwamba', 'Remis en main propre')
on conflict (id) do nothing;

insert into public.notifications (courier_id, type, title, body, created_at) values
  ('00000000-0000-0000-0000-000000000001', 'delivery', 'Nouvelle livraison assignee', 'TSA-10242 - Benedicte Okoye, Limete', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000001', 'warning', 'Trafic dense sur Bd Lumumba', 'Prevoyez +15 min sur l''itineraire prevu.', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000001', 'payment', 'Paiement encaisse confirme', 'TSA-10241 - 30 000 FCFA recus', now() - interval '1 day')
on conflict do nothing;
