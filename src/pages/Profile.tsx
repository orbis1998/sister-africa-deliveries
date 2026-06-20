import { LogOut, Phone, MapPin, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { courier, signOut } = useAuth();
  const nav = useNavigate();
  if (!courier) return null;

  return (
    <div className="px-5 pb-10 pt-5 animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-card font-display text-3xl text-primary">
          {courier.avatar_initials}
        </div>
        <h1 className="mt-4 font-display text-3xl">{courier.full_name}</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Badge {courier.badge_id}
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <Info icon={Phone} label="Téléphone" value={courier.phone} />
        <Info icon={MapPin} label="Zone de tournée" value={courier.zone} />
        <Info icon={Shield} label="Sécurité" value="Session chiffrée · Edge function auth" />
      </div>

      <Button
        onClick={() => {
          signOut();
          nav("/login", { replace: true });
        }}
        variant="outline"
        className="mt-10 h-12 w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
      </Button>

      <p className="mt-8 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
        v1.0 · The Sister Africa Delivery
      </p>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
