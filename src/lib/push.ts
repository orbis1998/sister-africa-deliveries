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

/** Subscribe device to Web Push (VAPID) and persist subscription for server-side push. */
export async function subscribeToWebPush(courierId: string): Promise<PushSubscribeResult> {
  if (!isWebPushSupported()) return "unsupported";
  if (!isVapidConfigured()) return "missing_vapid";

  const permission = await requestPushPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "unsupported";

  try {
    const registration = await navigator.serviceWorker.ready;

    // Keep a single active subscription per device (avoids duplicate stale endpoints).
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const existingJson = existing.toJSON();
      if (existingJson.endpoint && existingJson.keys?.p256dh && existingJson.keys?.auth) {
        const { error: existingError } = await supabase.from("push_subscriptions").upsert(
          {
            courier_id: courierId,
            endpoint: existingJson.endpoint,
            p256dh: existingJson.keys.p256dh,
            auth: existingJson.keys.auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: "courier_id,endpoint" }
        );
        if (existingError) {
          console.error("Failed to save push subscription", existingError);
          return "error";
        }
        return "granted";
      }
    }

    let subscription = existing;

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        courier_id: courierId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "courier_id,endpoint" }
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
