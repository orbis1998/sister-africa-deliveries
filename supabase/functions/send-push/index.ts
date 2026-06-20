import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@thesisterafrica.com";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

interface PushPayload {
  id?: string;
  courier_id?: string;
  title?: string;
  body?: string;
  type?: string;
  record?: {
    id?: string;
    courier_id?: string;
    title?: string;
    body?: string;
    type?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!vapidPublic || !vapidPrivate || !supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Push not configured on server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const record = payload.record ?? payload;
  const courierId = record.courier_id;
  const title = record.title;
  const body = record.body ?? "";
  const type = record.type ?? "delivery";
  const notificationId = record.id;

  if (!courierId || !title) {
    return new Response(JSON.stringify({ error: "Missing courier_id or title" }), { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("courier_id", courierId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!subs?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const pushBody = JSON.stringify({
    title,
    body,
    tag: `tsa-${type}-${notificationId ?? Date.now()}`,
    url: "/notifications",
  });

  let sent = 0;
  const staleEndpoints: string[] = [];
  const errors: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushBody,
        {
          TTL: 60 * 60 * 24,
          urgency: "high",
        }
      );
      sent += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      const message = (err as { message?: string }).message ?? String(err);
      errors.push(`${statusCode ?? "?"}: ${message.slice(0, 120)}`);
      if (statusCode === 404 || statusCode === 410) staleEndpoints.push(sub.endpoint);
      console.error("push failed", sub.endpoint, err);
    }
  }

  if (staleEndpoints.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return new Response(JSON.stringify({ ok: true, sent, errors: errors.length ? errors : undefined }), {
    headers: { "Content-Type": "application/json" },
  });
});
