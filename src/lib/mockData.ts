// Mock data + types. Designed to map 1:1 to a future Supabase schema.
// Tables (future): couriers, deliveries, delivery_events, delivery_proofs, notifications.

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
  at: string; // ISO
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
  // recipient
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  city: string;
  neighborhood: string;
  geo?: { lat: number; lng: number };
  // package
  product_summary: string;
  items_count: number;
  amount_to_collect_fcfa: number; // cash on delivery
  payment_method: "especes" | "mobile_money" | "paye";
  notes?: string;
  // courier
  courier_id: string;
  // timeline
  events: DeliveryEvent[];
}

export const MOCK_COURIER: Courier = {
  id: "c-001",
  badge_id: "TSA-2041",
  full_name: "Amani Mwamba",
  phone: "+243 812 445 902",
  zone: "Kinshasa — Gombe / Limete",
  avatar_initials: "AM",
};

const today = new Date();
const iso = (d: Date) => d.toISOString();
const addH = (h: number) => {
  const d = new Date(today);
  d.setHours(d.getHours() + h);
  return iso(d);
};

export const MOCK_DELIVERIES: Delivery[] = [
  {
    id: "d-1001",
    reference: "TSA-10241",
    status: "en_livraison",
    created_at: addH(-4),
    scheduled_for: addH(1),
    recipient_name: "Grâce Lumbala",
    recipient_phone: "+243 819 220 410",
    address_line: "12 Av. Kasa-Vubu, Imm. Étoile, App 4B",
    city: "Kinshasa",
    neighborhood: "Gombe",
    product_summary: "Mass Grainer — 2 sachets",
    items_count: 2,
    amount_to_collect_fcfa: 30000,
    payment_method: "especes",
    notes: "Sonner deux fois. Code immeuble: 2407.",
    courier_id: "c-001",
    events: [
      { id: "e1", at: addH(-4), status: "assignee", by: "Dispatch", note: "Course créée" },
      { id: "e2", at: addH(-2), status: "colis_recupere", by: "Amani Mwamba" },
      { id: "e3", at: addH(-0.5), status: "en_livraison", by: "Amani Mwamba" },
    ],
  },
  {
    id: "d-1002",
    reference: "TSA-10242",
    status: "assignee",
    created_at: addH(-1),
    scheduled_for: addH(3),
    recipient_name: "Bénédicte Okoye",
    recipient_phone: "+243 822 117 833",
    address_line: "47 Bd Lumumba, Réf. pharmacie Espoir",
    city: "Kinshasa",
    neighborhood: "Limete",
    product_summary: "Bouillie Croissance Enfant",
    items_count: 1,
    amount_to_collect_fcfa: 15000,
    payment_method: "mobile_money",
    courier_id: "c-001",
    events: [{ id: "e1", at: addH(-1), status: "assignee", by: "Dispatch" }],
  },
  {
    id: "d-1003",
    reference: "TSA-10243",
    status: "livre",
    created_at: addH(-26),
    scheduled_for: addH(-22),
    recipient_name: "Sarah Mbenza",
    recipient_phone: "+243 815 990 121",
    address_line: "8 Rue des Manguiers",
    city: "Kinshasa",
    neighborhood: "Bandal",
    product_summary: "Mass Grainer — 1 sachet",
    items_count: 1,
    amount_to_collect_fcfa: 15000,
    payment_method: "paye",
    courier_id: "c-001",
    events: [
      { id: "e1", at: addH(-26), status: "assignee", by: "Dispatch" },
      { id: "e2", at: addH(-23), status: "colis_recupere", by: "Amani Mwamba" },
      { id: "e3", at: addH(-22.5), status: "en_livraison", by: "Amani Mwamba" },
      { id: "e4", at: addH(-22), status: "livre", by: "Amani Mwamba", note: "Remis en main propre" },
    ],
  },
  {
    id: "d-1004",
    reference: "TSA-10244",
    status: "echec",
    created_at: addH(-48),
    scheduled_for: addH(-44),
    recipient_name: "Patrick Lobo",
    recipient_phone: "+243 818 552 003",
    address_line: "23 Av. de la Paix",
    city: "Kinshasa",
    neighborhood: "Lemba",
    product_summary: "Bouillie Femme +",
    items_count: 1,
    amount_to_collect_fcfa: 18000,
    payment_method: "especes",
    courier_id: "c-001",
    events: [
      { id: "e1", at: addH(-48), status: "assignee", by: "Dispatch" },
      { id: "e2", at: addH(-45), status: "en_livraison", by: "Amani Mwamba" },
      { id: "e3", at: addH(-44), status: "echec", by: "Amani Mwamba", note: "Destinataire absent — à reprogrammer" },
    ],
  },
];

export const formatFCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
