-- Webhook: notifications INSERT -> send-push Edge Function (pg_net)
-- Requires: pg_net enabled + send-push Edge Function deployed (verify_jwt = false)

create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://plhdpaqdtukhcvfvrnxa.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'id', NEW.id,
      'courier_id', NEW.courier_id,
      'title', NEW.title,
      'body', NEW.body,
      'type', coalesce(NEW.type, 'delivery')
    )
  );
  return NEW;
exception
  when others then
    raise warning 'send-push webhook failed: %', sqlerrm;
    return NEW;
end;
$$;

drop trigger if exists send_push_on_notification_insert on public.notifications;
create trigger send_push_on_notification_insert
after insert on public.notifications
for each row
execute function public.trigger_send_push_on_notification();

comment on trigger send_push_on_notification_insert on public.notifications is
  'Calls send-push Edge Function via pg_net when a notification row is inserted.';
