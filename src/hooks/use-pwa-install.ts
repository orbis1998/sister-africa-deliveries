import { useCallback, useEffect, useState } from "react";

export const installPromptDismissedKey = "tsa.pwa.install.dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneMode);
  const [isIOS] = useState(isIosDevice);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canInstall = Boolean(deferredPrompt) && !installed;
  const shouldShowPrompt = !installed && (canInstall || isIOS);

  const install = useCallback(async () => {
    if (!deferredPrompt) return { outcome: "unavailable" as const };
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    return choice;
  }, [deferredPrompt]);

  return { canInstall, shouldShowPrompt, install, installed, isIOS };
}

export async function requestPushPermission() {
  if (!("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  const result = await Notification.requestPermission();
  return result;
}

export function showLocalNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/notification-icon-192.png",
    badge: "/notification-icon-192.png",
    tag: "tsa-delivery",
    data: { url: "/notifications" },
    renotify: true,
  };
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready.then((registration) => {
      void registration.showNotification(title, options);
    });
    return;
  }
  new Notification(title, options);
}
