import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { installPromptDismissedKey, requestPushPermission, usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

export function PwaInstallPrompt() {
  const { shouldShowPrompt, canInstall, install, isIOS } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(installPromptDismissedKey) === "1");

  if (!shouldShowPrompt || dismissed) return null;

  const onInstall = async () => {
    if (canInstall) {
      const { outcome } = await install();
      if (outcome === "accepted") {
        toast.success("Application installée");
        const permission = await requestPushPermission();
        if (permission === "granted") toast.success("Notifications activées");
      }
      return;
    }
    toast.message("Sur iPhone : touche Partager, puis « Sur l'écran d'accueil ».");
  };

  const onDismiss = () => {
    localStorage.setItem(installPromptDismissedKey, "1");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-4 safe-bottom">
      <div className="rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-elegant backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {isIOS && !canInstall ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <p className="font-display text-lg leading-tight">Installer TSA Delivery</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canInstall
                ? "Installe l'application pour un accès rapide et recevoir les alertes de tournée."
                : "Sur iPhone : ouvre le menu Partager, puis « Sur l'écran d'accueil » pour installer l'app."}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => void onInstall()}
                className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
              >
                {canInstall ? "Installer l'application" : "Comment installer"}
              </Button>
              <Button variant="ghost" onClick={onDismiss} className="h-9 rounded-full px-3 text-xs text-muted-foreground">
                Plus tard
              </Button>
            </div>
          </div>
          <button type="button" onClick={onDismiss} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
