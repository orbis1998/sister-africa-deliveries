import { Bell, Package, AlertTriangle, CheckCircle2 } from "lucide-react";

const items = [
  { icon: Package, color: "text-info", title: "Nouvelle livraison assignée", body: "TSA-10242 — Bénédicte Okoye, Limete", at: "Il y a 1 h" },
  { icon: AlertTriangle, color: "text-warning", title: "Trafic dense sur Bd Lumumba", body: "Prévoyez +15 min sur l'itinéraire prévu.", at: "Il y a 2 h" },
  { icon: CheckCircle2, color: "text-success", title: "Paiement encaissé confirmé", body: "TSA-10241 — 30 000 FCFA reçus", at: "Hier" },
];

export default function Notifications() {
  return (
    <div className="px-5 pb-6 pt-5 animate-fade-up">
      <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">Centre d'alertes</p>
      <h1 className="mt-1 font-display text-4xl leading-tight">
        <em className="text-primary not-italic">Notifications</em>
      </h1>

      <div className="mt-6 space-y-3">
        {items.map((n, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className={`mt-0.5 ${n.color}`}><n.icon className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground/80">{n.at}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
        <Bell className="mx-auto h-5 w-5 text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">
          Les notifications push s'activeront automatiquement une fois l'app installée et l'autorisation accordée.
        </p>
      </div>
    </div>
  );
}
