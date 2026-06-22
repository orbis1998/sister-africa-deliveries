/** Market country for cash display — aligned with thesisterafrica.vercel.app */
export type MarketCountry = "RDC" | "CG";

/** Approx. CDF per 1 USD (RDC cash display). */
export const CDF_PER_USD = 2800;

const CG_MARKERS = [
  "brazzaville",
  "pointe-noire",
  "pointe noire",
  "potopoto",
  "poto-poto",
  "dolisie",
  "nkayi",
  "ouesso",
  "congo brazzaville",
  "congo-brazzaville",
  "republique du congo",
  "république du congo",
  "republic of congo",
  "congo cg",
  "congo-b",
];

const RDC_MARKERS = [
  "rdc",
  "drc",
  "kinshasa",
  "lubumbashi",
  "goma",
  "bukavu",
  "kisangani",
  "matadi",
  "kananga",
  "kolwezi",
  "mbuji-mayi",
  "mbuji mayi",
  "kikwit",
  "kindu",
  "uvira",
  "beni",
  "butembo",
  "katanga",
  "kivu",
  "equateur",
  "bandal",
  "gombe",
  "limete",
  "lemba",
  "democratique du congo",
  "république démocratique",
  "republique democratique",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Detect market from zone, city, or city_scope text. */
export function detectMarketCountry(...parts: (string | undefined | null)[]): MarketCountry {
  const haystack = normalize(parts.filter(Boolean).join(" "));

  if (CG_MARKERS.some((m) => haystack.includes(normalize(m)))) return "CG";
  if (RDC_MARKERS.some((m) => haystack.includes(normalize(m)))) return "RDC";

  // Bare "congo" without Brazzaville/Pointe-Noire → RDC (Kinshasa hub default)
  if (haystack.includes("congo")) return "RDC";

  return "RDC";
}

export function marketForDelivery(
  delivery: { country_code?: string | null; city?: string; neighborhood?: string },
  courier?: { zone?: string },
): MarketCountry {
  if (delivery.country_code === "CG") return "CG";
  if (delivery.country_code === "CD") return "RDC";
  return detectMarketCountry(courier?.zone, delivery.city, delivery.neighborhood);
}

export function formatDeliveryAmount(
  amount: number,
  delivery: { country_code?: string | null; city?: string; neighborhood?: string },
  courier?: { zone?: string },
): string {
  return formatCashAmount(amount, marketForDelivery(delivery, courier));
}

export function formatCashAmount(amount: number, country: MarketCountry): string {
  if (country === "CG") {
    return `${new Intl.NumberFormat("fr-FR").format(amount)} CFA`;
  }

  const usd = amount / CDF_PER_USD;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usd >= 100 ? 0 : 2,
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd);
}

/** Compact label for dashboard stat cards. */
export function formatCashCompact(amount: number, country: MarketCountry): { value: string; suffix?: string } {
  if (amount <= 0) {
    return country === "CG" ? { value: "0", suffix: "CFA" } : { value: "$0" };
  }

  if (country === "CG") {
    if (amount >= 1_000_000) return { value: `${(amount / 1_000_000).toFixed(1)}M`, suffix: "CFA" };
    if (amount >= 1000) return { value: `${Math.round(amount / 1000)}K`, suffix: "CFA" };
    return { value: new Intl.NumberFormat("fr-FR").format(amount), suffix: "CFA" };
  }

  const usd = amount / CDF_PER_USD;
  if (usd >= 1_000_000) return { value: `$${(usd / 1_000_000).toFixed(1)}M` };
  if (usd >= 1000) return { value: `$${(usd / 1000).toFixed(1)}K` };
  if (usd >= 100) return { value: `$${Math.round(usd)}` };
  return { value: `$${usd.toFixed(2)}` };
}
