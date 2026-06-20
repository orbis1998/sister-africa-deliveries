import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyDeliveries } from "@/lib/deliveries";
import { DeliveryCard } from "@/components/DeliveryCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const RANGES = [
  { key: "today", label: "Aujourd'hui", days: 1 },
  { key: "week", label: "7 jours", days: 7 },
  { key: "month", label: "30 jours", days: 30 },
  { key: "all", label: "Tout", days: 9999 },
] as const;

export default function History() {
  const { courier } = useAuth();
  const list = useMyDeliveries(courier?.id);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("week");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    const since = Date.now() - r.days * 86_400_000;
    let l = list.filter((d) => ["livre", "echec", "retour"].includes(d.status) && +new Date(d.created_at) >= since);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((d) => d.reference.toLowerCase().includes(s) || d.recipient_name.toLowerCase().includes(s));
    }
    return l.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [list, range, q]);

  return (
    <div className="px-5 pb-6 pt-5 animate-fade-up">
      <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">Archives</p>
      <h1 className="mt-1 font-display text-4xl leading-tight">
        Vos <em className="text-primary not-italic">livraisons</em> passées.
      </h1>

      <div className="mt-5 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Référence ou destinataire"
          className="h-11 rounded-xl border-border/70 bg-card/60 pl-9"
        />
      </div>

      <div className="mt-4 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 rounded-full border px-2 py-1.5 text-xs transition ${
              range === r.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card/40 text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <p className="font-display text-2xl text-muted-foreground">Aucune archive.</p>
          </div>
        ) : (
          items.map((d) => <DeliveryCard key={d.id} d={d} />)
        )}
      </div>
    </div>
  );
}
