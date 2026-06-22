-- Bridge admin/manager orders -> courier app deliveries table.
-- Run in Supabase SQL Editor or: SAD_DATABASE_URL=... node scripts/apply-sync-orders-to-deliveries.mjs

alter table public.deliveries
  add column if not exists order_id uuid unique references public.orders(id) on delete cascade;

alter table public.deliveries
  add column if not exists product_amount_fcfa integer not null default 0 check (product_amount_fcfa >= 0),
  add column if not exists delivery_fee_fcfa integer not null default 0 check (delivery_fee_fcfa >= 0),
  add column if not exists country_code text;

create index if not exists deliveries_order_id_idx on public.deliveries(order_id);

create or replace function public.order_items_summary(p_items jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      (
        select string_agg(
          coalesce(nullif(trim(item->>'name'), ''), 'Article')
          || case
            when coalesce((item->>'qty')::int, 1) > 1
              then ' x' || coalesce((item->>'qty')::int, 1)::text
            else ''
          end,
          ', '
          order by ordinality
        )
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(item, ordinality)
      ),
      ''
    ),
    'Commande'
  );
$$;

create or replace function public.order_items_count(p_items jsonb)
returns integer
language sql
immutable
as $$
  select greatest(
    coalesce(
      (
        select sum(greatest(coalesce((item->>'qty')::int, 1), 1))::int
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as t(item)
      ),
      1
    ),
    1
  );
$$;

create or replace function public.order_scheduled_for(
  p_delivery_date date,
  p_delivery_time text,
  p_created_at timestamptz
)
returns timestamptz
language plpgsql
stable
as $$
declare
  v_time text := nullif(trim(coalesce(p_delivery_time, '')), '');
begin
  if p_delivery_date is not null and v_time is not null then
    return (p_delivery_date::text || ' ' || v_time)::timestamptz;
  end if;

  if p_delivery_date is not null then
    return (p_delivery_date::text || ' 09:00')::timestamptz;
  end if;

  return coalesce(p_created_at, now()) + interval '1 day';
end;
$$;

create or replace function public.order_product_amount(o public.orders)
returns integer
language sql
immutable
as $$
  select case
    when o.country_code = 'CG' then coalesce(o.total_fcfa, 0)
    else greatest((coalesce(o.total_usd, 0) * 2800)::int, 0)
  end;
$$;

create or replace function public.order_delivery_fee_amount(o public.orders)
returns integer
language sql
immutable
as $$
  select case
    when o.country_code = 'CG' then coalesce(o.delivery_fee_fcfa, 0)
    when coalesce(o.delivery_fee_usd, 0) > 0 then greatest((o.delivery_fee_usd * 2800)::int, 0)
    else coalesce(o.delivery_fee_fcfa, 0)
  end;
$$;

create or replace function public.order_status_to_delivery(p_status public.order_status)
returns public.delivery_status
language sql
immutable
as $$
  select case p_status
    when 'received' then 'assignee'::public.delivery_status
    when 'preparing' then 'assignee'::public.delivery_status
    when 'ready' then 'assignee'::public.delivery_status
    when 'en_route' then 'en_livraison'::public.delivery_status
    when 'delivered' then 'livre'::public.delivery_status
    when 'cancelled' then 'echec'::public.delivery_status
    else 'assignee'::public.delivery_status
  end;
$$;

create or replace function public.resolve_courier_id(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_courier_id uuid;
begin
  if p_profile_id is null then
    return null;
  end if;

  select c.id
    into v_courier_id
  from public.couriers c
  where c.active = true
    and (c.id = p_profile_id or c.profile_id = p_profile_id)
  order by case when c.id = p_profile_id then 0 else 1 end
  limit 1;

  if v_courier_id is null then
    perform public.sync_livreur_to_courier(p_profile_id);

    select c.id
      into v_courier_id
    from public.couriers c
    where c.active = true
      and (c.id = p_profile_id or c.profile_id = p_profile_id)
    order by case when c.id = p_profile_id then 0 else 1 end
    limit 1;
  end if;

  return v_courier_id;
end;
$$;

create or replace function public.sync_order_to_delivery(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  o public.orders%rowtype;
  v_courier_id uuid;
  v_delivery_id uuid;
  v_is_new boolean := false;
  v_product_amount integer;
  v_delivery_fee integer;
  v_amount integer;
begin
  select * into o from public.orders where id = p_order_id;
  if o.id is null or o.assigned_to is null then
    return null;
  end if;

  if o.status = 'cancelled'::public.order_status then
    update public.deliveries
    set status = 'echec'::public.delivery_status
    where order_id = o.id;
    return null;
  end if;

  v_courier_id := public.resolve_courier_id(o.assigned_to);
  if v_courier_id is null then
    raise warning 'sync_order_to_delivery: no courier for profile %', o.assigned_to;
    return null;
  end if;

  v_product_amount := public.order_product_amount(o);
  v_delivery_fee := public.order_delivery_fee_amount(o);
  v_amount := v_product_amount + v_delivery_fee;

  select d.id
    into v_delivery_id
  from public.deliveries d
  where d.order_id = o.id
  limit 1;

  v_is_new := v_delivery_id is null;

  insert into public.deliveries (
    order_id,
    reference,
    status,
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
    country_code,
    payment_method,
    notes,
    courier_id
  ) values (
    o.id,
    o.order_number,
    public.order_status_to_delivery(o.status),
    public.order_scheduled_for(o.delivery_date, o.delivery_time, o.created_at),
    o.customer_name,
    o.customer_phone,
    o.address,
    coalesce(nullif(trim(o.city), ''), 'Kinshasa'),
    coalesce(nullif(trim(o.commune), ''), '—'),
    public.order_items_summary(o.items),
    public.order_items_count(o.items),
    v_product_amount,
    v_delivery_fee,
    v_amount,
    o.country_code,
    'especes'::public.payment_method,
    nullif(trim(coalesce(o.notes, '')), ''),
    v_courier_id
  )
  on conflict (order_id) do update set
    reference = excluded.reference,
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
    country_code = excluded.country_code,
    payment_method = excluded.payment_method,
    notes = excluded.notes,
    courier_id = excluded.courier_id
  returning id into v_delivery_id;

  if v_is_new then
    insert into public.delivery_events (id, delivery_id, at, status, by, note)
    values (
      'ord-' || replace(o.id::text, '-', ''),
      v_delivery_id,
      coalesce(o.created_at, now()),
      'assignee'::public.delivery_status,
      'Dispatch',
      'Commande ' || o.order_number || ' assignee au livreur'
    )
    on conflict (id) do nothing;

    insert into public.notifications (courier_id, type, title, body, created_at)
    values (
      v_courier_id,
      'delivery',
      'Nouvelle livraison assignee',
      o.order_number || ' — ' || o.customer_name || ', ' || coalesce(nullif(trim(o.commune), ''), o.city),
      now()
    );
  end if;

  return v_delivery_id;
end;
$$;

create or replace function public.trg_sync_order_to_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if new.assigned_to is not null then
    perform public.sync_order_to_delivery(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_order_to_delivery on public.orders;
create trigger sync_order_to_delivery
after insert or update of
  assigned_to,
  status,
  delivery_date,
  delivery_time,
  customer_name,
  customer_phone,
  address,
  city,
  commune,
  notes,
  items,
  total_fcfa,
  total_usd,
  delivery_fee_fcfa,
  delivery_fee_usd,
  country_code,
  order_number
on public.orders
for each row
execute function public.trg_sync_order_to_delivery();

-- Backfill existing assigned orders
do $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    select id
    from public.orders
    where assigned_to is not null
      and status <> 'cancelled'::public.order_status
    order by created_at
  loop
    perform public.sync_order_to_delivery(v_order_id);
  end loop;
end $$;
