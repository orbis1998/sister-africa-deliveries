import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Navigation,
  Package,
  StickyNote,
  CheckCircle2,
  XCircle,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDelivery, updateDeliveryStatus } from "@/lib/deliveries";
import { formatDateTime, STATUS_LABEL, type DeliveryStatus } from "@/lib/deliveryTypes";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const NEXT: Partial<Record<DeliveryStatus, { status: DeliveryStatus; label: string }[]>> = {
  assignee: [
    { status: "en_route_pickup", label: "Aller au point de retrait" },
    { status: "colis_recupere", label: "Colis récupéré" },
  ],
  en_route_pickup: [{ status: "colis_recupere", label: "Colis récupéré" }],
  colis_recupere: [{ status: "en_livraison", label: "Démarrer la livraison" }],
  en_livraison: [{ status: "livre", label: "Marquer comme livrée" }],
};

export default function DeliveryDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { courier } = useAuth();
  const d = useDelivery(id);
  const [failOpen, setFailOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [proofNote, setProofNote] = useState("");

  if (d === undefined) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-muted-foreground">Chargement de la livraison…</p>
      </div>
    );
  }

  if (d === null) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-muted-foreground">Livraison introuvable.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Retour à la tournée
        </Link>
      </div>
    );
  }

  const next = NEXT[d.status] ?? [];
  const isClosed = ["livre", "echec", "retour"].includes(d.status);
  const whatsAppHref = `https://wa.me/${d.recipient_phone.replace(/\D/g, "")}`;

  const advance = async (status: DeliveryStatus) => {
    if (status === "livre") return setProofOpen(true);
    const { error } = await updateDeliveryStatus(d.id, status, courier!.full_name);
    if (error) return toast.error(error);
    toast.success(`Statut mis à jour : ${STATUS_LABEL[status]}`);
  };

  const confirmDelivered = async () => {
    const { error } = await updateDeliveryStatus(d.id, "livre", courier!.full_name, proofNote || "Remis en main propre");
    if (error) return toast.error(error);
    setProofOpen(false);
    toast.success("Livraison confirmée ✓");
  };

  const reportFail = async () => {
    if (!reason.trim()) return toast.error("Indiquez un motif d'échec.");
    const { error } = await updateDeliveryStatus(d.id, "echec", courier!.full_name, reason.trim());
    if (error) return toast.error(error);
    setFailOpen(false);
    setReason("");
    toast("Échec enregistré. Le dispatch sera notifié.");
  };

  return (
    <div className="bg-warm min-h-full pb-8 animate-fade-up">
      <div className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => nav(-1)} className="-ml-2 flex items-center gap-1 rounded-full p-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{d.reference}</p>
        <StatusBadge status={d.status} />
      </div>

      <div className="px-5 pt-5">
        <p className="text-[11px] uppercase tracking-wider text-primary/80">Destinataire</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">{d.recipient_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.address_line} · {d.neighborhood}, {d.city}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a href={`tel:${d.recipient_phone}`} className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card/60 py-3 text-xs text-foreground active:scale-95 transition">
            <Phone className="h-4 w-4 text-primary" /> Appeler
          </a>
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card/60 py-3 text-xs text-foreground active:scale-95 transition"
          >
            <MessageSquare className="h-4 w-4 text-primary" /> WhatsApp
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address_line + " " + d.city)}`}
            target="_blank" rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card/60 py-3 text-xs text-foreground active:scale-95 transition"
          >
            <Navigation className="h-4 w-4 text-primary" /> Itinéraire
          </a>
        </div>

        <Section title="Colis" icon={Package}>
          <Row label="Produit" value={d.product_summary} />
          <Row label="Articles" value={`${d.items_count}`} />
          <Row label="Programmée" value={formatDateTime(d.scheduled_for)} />
        </Section>

        {d.notes && (
          <Section title="Note du client" icon={StickyNote}>
            <p className="text-sm leading-relaxed text-foreground/90">{d.notes}</p>
          </Section>
        )}

        <Section title="Historique">
          <ol className="space-y-4">
            {[...d.events].reverse().map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
                  {i < d.events.length - 1 && <span className="mt-1 w-px flex-1 bg-border/60" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-foreground">{STATUS_LABEL[e.status]}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(e.at)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Par {e.by}</p>
                  {e.note && <p className="mt-1 text-xs text-foreground/80">“{e.note}”</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {!isClosed && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border/60 bg-background/95 px-4 pt-3 backdrop-blur-xl">
          <div className="space-y-2">
            {next.map((n) => (
              <Button
                key={n.status}
                onClick={() => advance(n.status)}
                className="h-12 w-full rounded-full bg-primary text-base text-primary-foreground hover:bg-primary/90"
              >
                {n.status === "livre" && <CheckCircle2 className="mr-2 h-4 w-4" />}
                {n.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() => setFailOpen(true)}
              className="h-10 w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Signaler un échec
            </Button>
          </div>
        </div>
      )}

      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Échec de livraison</DialogTitle>
            <DialogDescription>Précisez le motif. Le dispatch est notifié immédiatement.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : destinataire absent, adresse introuvable, refus du colis…"
            rows={4}
            maxLength={500}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFailOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={reportFail}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Preuve de livraison</DialogTitle>
            <DialogDescription>
              Confirmez la remise du colis. Une photo ou signature pourra être ajoutée.
            </DialogDescription>
          </DialogHeader>
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/40 py-8 text-sm text-muted-foreground hover:text-foreground">
            <Camera className="h-5 w-5" /> Ajouter une photo
          </button>
          <Textarea
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
            placeholder="Note (optionnel) — ex : remis au gardien."
            rows={3}
            maxLength={300}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProofOpen(false)}>Annuler</Button>
            <Button onClick={confirmDelivered} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirmer la livraison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-display text-lg text-primary" : "text-foreground"}>{value}</span>
    </div>
  );
}
