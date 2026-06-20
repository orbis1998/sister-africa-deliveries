import { useEffect, useState } from "react";
import { Bell, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { requestPushPermission, showLocalNotification, usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type?: "delivery" | "warning" | "payment" | string;
  title: string;
  body: string;
  created_at: string;
}

const iconByType = {
  delivery: { icon: Package, color: "text-info" },
  warning: { icon: AlertTriangle, color: "text-warning" },
  payment: { icon: CheckCircle2, color: "text-success" },
};

export default function Notifications() {
  const { courier } = useAuth();
  const { installed } = usePwaInstall();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  const enableNotifications = async () => {
    const result = await requestPushPermission();
    setPushPermission(result === "unsupported" ? "unsupported" : result);
    if (result === "granted") toast.success("Notifications activées");
    if (result === "denied") toast.error("Notifications refusées dans le navigateur.");
  };

  useEffect(() => {
    if (!courier?.id) return;

    let alive = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,created_at")
        .eq("courier_id", courier.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Unable to load notifications", error);
        if (alive) setItems([]);
        return;
      }

      if (alive) setItems((data ?? []) as NotificationItem[]);
    };

    const onInsert = (payload: { new: Record<string, unknown> }) => {
      void load();
      const row = payload.new as NotificationItem;
      if (row?.title) showLocalNotification(row.title, row.body);
    };

    void load();
    const channel = supabase
      .channel(`notifications-${courier.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `courier_id=eq.${courier.id}`,
        },
        onInsert
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void load())
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [courier?.id]);

  return (
    <div className="px-5 pb-6 pt-5 animate-fade-up">
      <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">Centre d'alertes</p>
      <h1 className="mt-1 font-display text-4xl leading-tight">
        <em className="text-primary not-italic">Notifications</em>
      </h1>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <p className="font-display text-2xl text-muted-foreground">Aucune notification.</p>
          </div>
        ) : (
          items.map((n) => {
            const config = iconByType[n.type as keyof typeof iconByType] ?? iconByType.delivery;
            const Icon = config.icon;

            return (
              <div key={n.id} className="flex gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className={`mt-0.5 ${config.color}`}><Icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground/80">
                    {new Date(n.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
        <Bell className="mx-auto h-5 w-5 text-primary" />
        {!installed ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Installe d'abord l'application (bannière en bas de l'écran) pour activer les alertes push.
          </p>
        ) : pushPermission === "granted" ? (
          <p className="mt-2 text-xs text-muted-foreground">Notifications push activées pour cette appareil.</p>
        ) : pushPermission === "denied" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Notifications bloquées. Autorise-les dans les réglages du navigateur ou du téléphone.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Autorise les notifications pour recevoir les alertes de tournée en temps réel.
            </p>
            <Button
              onClick={() => void enableNotifications()}
              className="mt-3 h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
            >
              Activer les notifications
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
