export type DeliveryStatus =
  | "assignee"
  | "en_route_pickup"
  | "colis_recupere"
  | "en_livraison"
  | "livre"
  | "echec"
  | "retour";

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  assignee: "Assignée",
  en_route_pickup: "Vers le point de retrait",
  colis_recupere: "Colis récupéré",
  en_livraison: "En livraison",
  livre: "Livrée",
  echec: "Échec",
  retour: "Retour",
};

export const STATUS_COLOR: Record<DeliveryStatus, string> = {
  assignee: "bg-muted text-foreground",
  en_route_pickup: "bg-info/15 text-info",
  colis_recupere: "bg-info/15 text-info",
  en_livraison: "bg-warning/15 text-warning",
  livre: "bg-success/15 text-success",
  echec: "bg-destructive/15 text-destructive",
  retour: "bg-muted text-muted-foreground",
};

export interface Courier {
  id: string;
  badge_id: string;
  full_name: string;
  phone: string;
  zone: string;
  avatar_initials: string;
}

export interface DeliveryEvent {
  id: string;
  at: string;
  status: DeliveryStatus;
  note?: string;
  by: string;
}

export interface Delivery {
  id: string;
  reference: string;
  status: DeliveryStatus;
  created_at: string;
  scheduled_for: string;
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  city: string;
  neighborhood: string;
  geo?: { lat: number; lng: number };
  product_summary: string;
  items_count: number;
  product_amount_fcfa: number;
  delivery_fee_fcfa: number;
  amount_to_collect_fcfa: number;
  payment_method: "especes" | "mobile_money" | "paye";
  country_code?: string | null;
  notes?: string;
  courier_id: string;
  events: DeliveryEvent[];
}

export const formatFCFA = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(n)} CFA`;

export function getDeliveryAmountBreakdown(d: Pick<
  Delivery,
  "product_amount_fcfa" | "delivery_fee_fcfa" | "amount_to_collect_fcfa"
>) {
  const product = d.product_amount_fcfa ?? 0;
  const deliveryFee = d.delivery_fee_fcfa ?? 0;
  const hasBreakdown = product > 0 || deliveryFee > 0;

  if (!hasBreakdown) {
    const total = d.amount_to_collect_fcfa ?? 0;
    return { product: total, deliveryFee: 0, total };
  }

  const total = product + deliveryFee || d.amount_to_collect_fcfa;
  return { product, deliveryFee, total };
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
