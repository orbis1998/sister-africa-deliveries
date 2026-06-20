import { Link } from "react-router-dom";
import { MapPin, Package, ArrowUpRight, Clock } from "lucide-react";
import { type Delivery, formatTime } from "@/lib/deliveryTypes";
import { detectMarketCountry, formatCashAmount } from "@/lib/currency";
import { StatusBadge } from "./StatusBadge";

export function DeliveryCard({ d }: { d: Delivery }) {
  const market = detectMarketCountry(d.city, d.neighborhood);
  return (
    <Link
      to={`/livraisons/${d.id}`}
      className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-card transition hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {d.reference}
          </p>
          <h3 className="mt-0.5 font-display text-xl leading-tight text-foreground">
            {d.recipient_name}
          </h3>
        </div>
        <StatusBadge status={d.status} />
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
          <span className="line-clamp-1">
            {d.address_line} <span className="text-foreground/60">· {d.neighborhood}</span>
          </span>
        </p>
        <p className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 shrink-0 text-primary/80" />
          <span className="line-clamp-1">{d.product_summary}</span>
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> {formatTime(d.scheduled_for)}
          </span>
          <span className="font-medium text-primary">
            {d.payment_method === "paye" ? "Payée" : formatCashAmount(d.amount_to_collect_fcfa, market)}
          </span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
      </div>
    </Link>
  );
}
