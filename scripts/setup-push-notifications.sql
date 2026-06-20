-- Web Push subscriptions + optional DB webhook target for send-push Edge Function.
-- VAPID keys: public -> VITE_VAPID_PUBLIC_KEY (Vercel), private -> Supabase Edge Function secrets.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.couriers(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (courier_id, endpoint)
);

create index if not exists push_subscriptions_courier_id_idx on public.push_subscriptions(courier_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "anon can manage push subscriptions" on public.push_subscriptions;
create policy "anon can manage push subscriptions"
on public.push_subscriptions
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;

comment on table public.push_subscriptions is
  'Web Push endpoints per courier device. Used by send-push Edge Function with VAPID.';

-- After deploying supabase/functions/send-push, create a Database Webhook in Supabase Dashboard:
--   Table: notifications | Event: INSERT | URL: .../functions/v1/send-push
--   Header: Authorization: Bearer <service_role_key>
