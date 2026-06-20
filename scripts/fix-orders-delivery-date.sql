-- Fix: main site (admin + checkout) expects delivery scheduling on orders.
-- Run in Supabase Dashboard > SQL Editor if not applied via scripts/fix-orders-delivery-date.mjs

alter table public.orders
  add column if not exists delivery_date date,
  add column if not exists delivery_time text;

comment on column public.orders.delivery_date is 'Scheduled delivery date (YYYY-MM-DD from admin/checkout)';
comment on column public.orders.delivery_time is 'Scheduled delivery time slot or free text (e.g. 14:00)';
