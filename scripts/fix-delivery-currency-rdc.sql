-- Fix RDC (CD) delivery amounts: store USD-based CDF units, not CFA fields.
-- Run: SAD_DATABASE_URL=... node scripts/apply-fix-delivery-currency-rdc.mjs

alter table public.deliveries
  add column if not exists country_code text;

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

update public.deliveries d
set
  country_code = o.country_code,
  product_amount_fcfa = public.order_product_amount(o),
  delivery_fee_fcfa = public.order_delivery_fee_amount(o),
  amount_to_collect_fcfa = public.order_product_amount(o) + public.order_delivery_fee_amount(o)
from public.orders o
where d.order_id = o.id;
