-- Sync admin-created livreurs (profiles + user_roles) into couriers table
-- and update courier_login to accept badge/password from both sources.

create extension if not exists pgcrypto with schema extensions;

alter table public.couriers
  add column if not exists profile_id uuid unique references public.profiles(id) on delete set null;

create or replace function public.courier_initials(p_name text)
returns text
language sql
immutable
as $$
  select upper(
    coalesce(substring(trim(split_part(coalesce(p_name, ''), ' ', 1)) from 1 for 1), '') ||
    coalesce(substring(trim(split_part(coalesce(p_name, ''), ' ', 2)) from 1 for 1), '')
  );
$$;

create or replace function public.sync_livreur_to_courier(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_livreur boolean;
  v_password text;
begin
  select exists (
    select 1 from public.user_roles
    where user_id = p_profile_id and role = 'livreur'
  ) into v_is_livreur;

  if not v_is_livreur then
    update public.couriers set active = false where profile_id = p_profile_id;
    return;
  end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null or v_profile.badge_id is null or trim(v_profile.badge_id) = '' then
    return;
  end if;

  select coalesce(nullif(au.encrypted_password, ''), nullif(v_profile.password_hash, ''), '')
    into v_password
  from auth.users au
  where au.id = p_profile_id;

  insert into public.couriers (
    id,
    profile_id,
    badge_id,
    password_hash,
    full_name,
    phone,
    zone,
    avatar_initials,
    active
  ) values (
    v_profile.id,
    v_profile.id,
    upper(trim(v_profile.badge_id)),
    coalesce(v_password, ''),
    trim(v_profile.full_name),
    coalesce(v_profile.phone, ''),
    coalesce(initcap(nullif(trim(v_profile.city_scope), '')), 'Kinshasa'),
    public.courier_initials(v_profile.full_name),
    true
  )
  on conflict (id) do update set
    profile_id = excluded.profile_id,
    badge_id = excluded.badge_id,
    password_hash = case
      when excluded.password_hash <> '' then excluded.password_hash
      else public.couriers.password_hash
    end,
    full_name = excluded.full_name,
    phone = excluded.phone,
    zone = excluded.zone,
    avatar_initials = excluded.avatar_initials,
    active = true;

  -- badge_id is unique; if another row already owns this badge, merge onto profile id
  update public.couriers
  set
    profile_id = v_profile.id,
    password_hash = case
      when coalesce(v_password, '') <> '' then v_password
      else password_hash
    end,
    full_name = trim(v_profile.full_name),
    phone = coalesce(v_profile.phone, phone),
    zone = coalesce(initcap(nullif(trim(v_profile.city_scope), '')), zone),
    avatar_initials = public.courier_initials(v_profile.full_name),
    active = true
  where badge_id = upper(trim(v_profile.badge_id))
    and id <> v_profile.id;
end;
$$;

create or replace function public.sync_all_livreurs_to_couriers()
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_profile_id uuid;
begin
  for v_profile_id in
    select distinct ur.user_id
    from public.user_roles ur
    where ur.role = 'livreur'
  loop
    perform public.sync_livreur_to_courier(v_profile_id);
  end loop;
end;
$$;

create or replace function public.trg_sync_livreur_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if exists (
    select 1 from public.user_roles
    where user_id = coalesce(new.id, old.id) and role = 'livreur'
  ) then
    perform public.sync_livreur_to_courier(coalesce(new.id, old.id));
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_sync_livreur_from_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if (tg_op = 'DELETE') then
    if old.role = 'livreur' then
      update public.couriers set active = false where profile_id = old.user_id;
    end if;
    return old;
  end if;

  if new.role = 'livreur' then
    perform public.sync_livreur_to_courier(new.user_id);
  elsif tg_op = 'UPDATE' and old.role = 'livreur' and new.role <> 'livreur' then
    update public.couriers set active = false where profile_id = new.user_id;
  end if;

  return new;
end;
$$;

create or replace function public.trg_sync_courier_password_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.couriers
    set password_hash = new.encrypted_password
    where profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_livreur_on_profile on public.profiles;
create trigger sync_livreur_on_profile
after insert or update of full_name, phone, badge_id, city_scope, password_hash
on public.profiles
for each row
execute function public.trg_sync_livreur_from_profile();

drop trigger if exists sync_livreur_on_role on public.user_roles;
create trigger sync_livreur_on_role
after insert or update of role or delete
on public.user_roles
for each row
execute function public.trg_sync_livreur_from_role();

drop trigger if exists sync_courier_password_on_auth on auth.users;
create trigger sync_courier_password_on_auth
after update of encrypted_password
on auth.users
for each row
execute function public.trg_sync_courier_password_from_auth();

create or replace function public.courier_login(
  p_badge_id text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_courier public.couriers%rowtype;
  v_profile public.profiles%rowtype;
  v_auth_pw text;
  v_profile_pw text;
  v_valid boolean := false;
begin
  if p_badge_id is null or trim(p_badge_id) = '' or p_password is null or length(p_password) < 4 then
    return jsonb_build_object('error', 'Identifiants invalides.');
  end if;

  select *
    into v_courier
  from public.couriers
  where badge_id = upper(trim(p_badge_id))
    and active = true
  limit 1;

  if v_courier.id is not null
     and coalesce(v_courier.password_hash, '') <> ''
     and extensions.crypt(p_password, v_courier.password_hash) = v_courier.password_hash then
    v_valid := true;
  end if;

  if not v_valid then
    select p.*
      into v_profile
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role = 'livreur'
    where upper(trim(p.badge_id)) = upper(trim(p_badge_id))
    limit 1;

    if v_profile.id is null then
      return jsonb_build_object('error', 'Identifiants invalides.');
    end if;

    perform public.sync_livreur_to_courier(v_profile.id);

    select encrypted_password into v_auth_pw
    from auth.users
    where id = v_profile.id;

    v_profile_pw := nullif(v_profile.password_hash, '');

    if v_auth_pw is not null
       and extensions.crypt(p_password, v_auth_pw) = v_auth_pw then
      v_valid := true;
    elsif v_profile_pw is not null
       and extensions.crypt(p_password, v_profile_pw) = v_profile_pw then
      v_valid := true;
    end if;

    if v_valid then
      select *
        into v_courier
      from public.couriers
      where profile_id = v_profile.id
        and active = true
      limit 1;
    end if;
  end if;

  if not v_valid or v_courier.id is null then
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
grant execute on function public.sync_livreur_to_courier(uuid) to authenticated;

select public.sync_all_livreurs_to_couriers();
