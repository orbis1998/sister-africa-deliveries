-- Prix article + frais livraison sur les livraisons coursier.
-- Run in Supabase Dashboard > SQL Editor, then re-run scripts/sync-orders-to-deliveries.sql
-- (or apply-sync-orders-to-deliveries.mjs) to refresh assigned orders.

alter table public.deliveries
  add column if not exists product_amount_fcfa integer not null default 0 check (product_amount_fcfa >= 0),
  add column if not exists delivery_fee_fcfa integer not null default 0 check (delivery_fee_fcfa >= 0);

-- Backfill from linked orders when available.
update public.deliveries d
set
  product_amount_fcfa = case
    when o.country_code = 'CG' then coalesce(o.total_fcfa, 0)
    when coalesce(o.total_fcfa, 0) > 0 then o.total_fcfa
    else greatest((coalesce(o.total_usd, 0) * 2800)::int, 0)
  end,
  delivery_fee_fcfa = case
    when o.country_code = 'CG' then coalesce(o.delivery_fee_fcfa, 0)
    when coalesce(o.delivery_fee_fcfa, 0) > 0 then o.delivery_fee_fcfa
    else greatest((coalesce(o.delivery_fee_usd, 0) * 2800)::int, 0)
  end,
  amount_to_collect_fcfa = case
    when o.country_code = 'CG' then coalesce(o.total_fcfa, 0) + coalesce(o.delivery_fee_fcfa, 0)
    when coalesce(o.total_fcfa, 0) > 0 then o.total_fcfa + coalesce(o.delivery_fee_fcfa, 0)
    else greatest((coalesce(o.total_usd, 0) * 2800)::int, 0)
         + greatest((coalesce(o.delivery_fee_usd, 0) * 2800)::int, 0)
  end
from public.orders o
where d.order_id = o.id;

-- Legacy rows without order link: treat existing total as product price.
update public.deliveries
set product_amount_fcfa = amount_to_collect_fcfa
where order_id is null
  and product_amount_fcfa = 0
  and amount_to_collect_fcfa > 0;
