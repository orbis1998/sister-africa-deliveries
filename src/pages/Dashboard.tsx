import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMyDeliveries } from "@/lib/deliveries";
import { DeliveryCard } from "@/components/DeliveryCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type DeliveryStatus } from "@/lib/mockData";

const FILTERS: { key: "all" | "actives" | DeliveryStatus; label: string }[] = [
  { key: "actives", label: "Actives" },
  { key: "assignee", label: STATUS_LABEL.assignee },
  { key: "en_livraison", label: STATUS_LABEL.en_livraison },
  { key: "livre", label: STATUS_LABEL.livre },
  { key: "all", label: "Toutes" },
];

export default function Dashboard() {
  const { courier } = useAuth();
  const deliveries = useMyDeliveries(courier?.id);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("actives");

  const filtered = useMemo(() => {
    let list = deliveries;
    if (filter === "actives") list = list.filter((d) => !["livre", "echec", "retour"].includes(d.status));
    else if (filter !== "all") list = list.filter((d) => d.status === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (d) =>
          d.reference.toLowerCase().includes(s) ||
          d.recipient_name.toLowerCase().includes(s) ||
          d.address_line.toLowerCase().includes(s) ||
          d.neighborhood.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for));
  }, [deliveries, filter, q]);

  const active = deliveries.filter((d) => !["livre", "echec", "retour"].includes(d.status)).length;
  const done = deliveries.filter((d) => d.status === "livre").length;
  const cash = deliveries
    .filter((d) => d.payment_method === "especes" && d.status !== "livre")
    .reduce((s, d) => s + d.amount_to_collect_fcfa, 0);

  return (
    <div className="px-5 pb-6 pt-5 animate-fade-up">
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">
          Bonjour {courier?.full_name.split(" ")[0]}
        </p>
        <h1 className="mt-1 font-display text-4xl leading-tight">
          Votre <em className="text-primary not-italic">tournée</em> du jour.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{courier?.zone}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Actives" value={active} />
        <Stat label="Livrées" value={done} />
        <Stat label="Cash à collecter" value={`${(cash / 1000).toFixed(0)}K`} suffix="FCFA" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (réf, nom, adresse)"
            className="h-11 rounded-xl border-border/70 bg-card/60 pl-9"
          />
        </div>
        <Button size="icon" variant="outline" className="h-11 w-11 rounded-xl border-border/70 bg-card/60">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition ${
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <p className="font-display text-2xl text-muted-foreground">Rien à livrer ici.</p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              Essayez un autre filtre ou rechargez votre tournée.
            </p>
          </div>
        ) : (
          filtered.map((d) => <DeliveryCard key={d.id} d={d} />)
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none text-foreground">
        {value}
        {suffix && <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
