-- Reverse sync: courier delivery status -> admin/manager orders dashboard.
-- Run in Supabase SQL Editor or: SAD_DATABASE_URL=... node scripts/apply-sync-delivery-to-order.mjs

create or replace function public.delivery_status_to_order(p_status public.delivery_status)
returns public.order_status
language sql
immutable
as $$
  select case p_status
    when 'livre' then 'delivered'::public.order_status
    when 'echec' then 'cancelled'::public.order_status
    when 'retour' then 'cancelled'::public.order_status
    when 'en_livraison' then 'en_route'::public.order_status
    when 'colis_recupere' then 'en_route'::public.order_status
    when 'en_route_pickup' then 'en_route'::public.order_status
    else null
  end;
$$;

create or replace function public.sync_delivery_status_to_order(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deliveries%rowtype;
  v_order_status public.order_status;
begin
  select * into d from public.deliveries where id = p_delivery_id;
  if d.id is null or d.order_id is null then
    return;
  end if;

  v_order_status := public.delivery_status_to_order(d.status);
  if v_order_status is null then
    return;
  end if;

  update public.orders o
  set
    status = v_order_status,
    delivered_at = case
      when v_order_status = 'delivered'::public.order_status and o.delivered_at is null then now()
      else o.delivered_at
    end,
    updated_at = now()
  where o.id = d.order_id
    and o.status is distinct from v_order_status
    and not (
      v_order_status = 'en_route'::public.order_status
      and o.status in ('delivered'::public.order_status, 'cancelled'::public.order_status)
    )
    and not (
      v_order_status = 'cancelled'::public.order_status
      and o.status = 'delivered'::public.order_status
    );
end;
$$;

create or replace function public.trg_sync_delivery_status_to_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_delivery_status_to_order(NEW.id);
  return NEW;
end;
$$;

drop trigger if exists sync_delivery_status_to_order on public.deliveries;
create trigger sync_delivery_status_to_order
after update of status on public.deliveries
for each row
when (OLD.status is distinct from NEW.status)
execute function public.trg_sync_delivery_status_to_order();

-- Backfill deliveries already marked livre but order still open.
do $$
declare
  v_id uuid;
begin
  for v_id in
    select d.id
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.status = 'livre'::public.delivery_status
      and o.status <> 'delivered'::public.order_status
  loop
    perform public.sync_delivery_status_to_order(v_id);
  end loop;
end $$;
