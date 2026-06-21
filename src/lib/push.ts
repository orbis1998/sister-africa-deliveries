import { supabase } from "./supabase";
import { requestPushPermission } from "@/hooks/use-pwa-install";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isVapidConfigured() {
  return Boolean(VAPID_PUBLIC_KEY?.trim());
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushSubscribeResult = "granted" | "denied" | "unsupported" | "missing_vapid" | "error";

async function pruneStaleSubscriptions(courierId: string, keepEndpoint: string) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("courier_id", courierId)
    .neq("endpoint", keepEndpoint);

  if (error) console.warn("Unable to prune stale push subscriptions", error);
}

async function persistSubscription(courierId: string, endpoint: string, p256dh: string, auth: string) {
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      courier_id: courierId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "courier_id,endpoint" }
  );

  if (error) return error;
  await pruneStaleSubscriptions(courierId, endpoint);
  return null;
}

/** Refresh push subscription silently when permission is already granted. */
export async function refreshWebPushSubscription(courierId: string): Promise<PushSubscribeResult> {
  if (!isWebPushSupported() || !isVapidConfigured()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "unsupported";
  return subscribeToWebPush(courierId, { requestPermission: false });
}

/** Subscribe device to Web Push (VAPID) and persist subscription for server-side push. */
export async function subscribeToWebPush(
  courierId: string,
  options: { requestPermission?: boolean } = {}
): Promise<PushSubscribeResult> {
  const { requestPermission = true } = options;

  if (!isWebPushSupported()) return "unsupported";
  if (!isVapidConfigured()) return "missing_vapid";

  if (requestPermission) {
    const permission = await requestPushPermission();
    if (permission === "denied") return "denied";
    if (permission !== "granted") return "unsupported";
  } else if (Notification.permission !== "granted") {
    return "unsupported";
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";

    const error = await persistSubscription(
      courierId,
      json.endpoint,
      json.keys.p256dh,
      json.keys.auth
    );

    if (error) {
      console.error("Failed to save push subscription", error);
      return "error";
    }

    return "granted";
  } catch (error) {
    console.error("Web Push subscription failed", error);
    return "error";
  }
}

/** Send a test push via the notifications pipeline. */
export async function sendTestPushNotification(courierId: string) {
  const refresh = await refreshWebPushSubscription(courierId);
  if (refresh !== "granted") {
    const subscribe = await subscribeToWebPush(courierId);
    if (subscribe !== "granted") return { ok: false as const, reason: subscribe };
  }

  const { error } = await supabase.from("notifications").insert({
    courier_id: courierId,
    type: "delivery",
    title: "Test notification",
    body: "Si vous voyez ceci, le push fonctionne sur cet appareil.",
  });

  if (error) return { ok: false as const, reason: "error" as const, message: error.message };
  return { ok: true as const };
}
