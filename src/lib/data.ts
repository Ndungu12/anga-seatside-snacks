// Mock data only. All prices are PLACEHOLDERS, not real Anga Cinemas prices.

export type VenueId = "diamond" | "sky";

export const VENUES: Record<VenueId, string> = {
  diamond: "Anga Diamond",
  sky: "Anga Sky",
};

export function toVenueId(value: string | undefined): VenueId | null {
  const v = (value ?? "").trim().toLowerCase();
  return v === "diamond" || v === "sky" ? v : null;
}

export type CategoryId = "popcorn" | "drinks" | "snacks" | "combos";

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "popcorn", label: "Popcorn" },
  { id: "drinks", label: "Drinks" },
  { id: "snacks", label: "Snacks" },
  { id: "combos", label: "Combos" },
];

export type MenuItem = {
  id: string;
  category: CategoryId;
  name: string;
  description: string;
  price: number; // KSh, placeholder
};

export const MENU: MenuItem[] = [
  { id: "pop-salt-r", category: "popcorn", name: "Salted popcorn, regular", description: "Freshly popped, lightly salted.", price: 350 },
  { id: "pop-salt-l", category: "popcorn", name: "Salted popcorn, large", description: "Big tub for sharing.", price: 500 },
  { id: "pop-caramel", category: "popcorn", name: "Caramel popcorn", description: "Sweet and crunchy, regular size.", price: 450 },
  { id: "pop-cheese", category: "popcorn", name: "Cheese popcorn", description: "Cheddar seasoning, regular size.", price: 450 },

  { id: "drk-cola", category: "drinks", name: "Cola, 500 ml", description: "Served chilled.", price: 200 },
  { id: "drk-ginger", category: "drinks", name: "Ginger soda, 500 ml", description: "Strong ginger taste.", price: 200 },
  { id: "drk-water", category: "drinks", name: "Still water, 500 ml", description: "Bottled mineral water.", price: 120 },
  { id: "drk-passion", category: "drinks", name: "Passion juice", description: "Fresh passion fruit, 400 ml.", price: 300 },
  { id: "drk-mango", category: "drinks", name: "Mango juice", description: "Fresh mango, 400 ml.", price: 300 },

  { id: "snk-samosa", category: "snacks", name: "Beef samosas (2)", description: "Warm, with a lemon wedge.", price: 250 },
  { id: "snk-nachos", category: "snacks", name: "Nachos with cheese", description: "Tortilla chips and warm cheese dip.", price: 550 },
  { id: "snk-hotdog", category: "snacks", name: "Hot dog", description: "Beef sausage in a soft bun.", price: 400 },
  { id: "snk-crisps", category: "snacks", name: "Crisps", description: "Salted potato crisps.", price: 150 },
  { id: "snk-choc", category: "snacks", name: "Chocolate bar", description: "Milk chocolate.", price: 180 },

  { id: "cmb-solo", category: "combos", name: "Solo combo", description: "Regular popcorn and a 500 ml soda.", price: 500 },
  { id: "cmb-couple", category: "combos", name: "Couple combo", description: "Large popcorn and two 500 ml sodas.", price: 850 },
  { id: "cmb-kids", category: "combos", name: "Kids combo", description: "Small popcorn, juice and a chocolate bar.", price: 450 },
  { id: "cmb-nacho", category: "combos", name: "Nacho night", description: "Nachos with cheese and a 500 ml soda.", price: 700 },
];

export const MENU_BY_ID: Record<string, MenuItem> = Object.fromEntries(
  MENU.map((item) => [item.id, item]),
);

/** Kenyan shilling formatting, e.g. 1250 -> "KSh 1,250". Deterministic for SSR. */
export function formatKsh(amount: number): string {
  const whole = Math.round(amount);
  const sign = whole < 0 ? "-" : "";
  const digits = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}KSh ${digits}`;
}

export type CartSummaryLine = { item: MenuItem; qty: number; lineTotal: number };

export function summarizeCart(lines: Record<string, number>) {
  const out: CartSummaryLine[] = [];
  for (const item of MENU) {
    const qty = lines[item.id] ?? 0;
    if (qty > 0) out.push({ item, qty, lineTotal: qty * item.price });
  }
  const count = out.reduce((n, l) => n + l.qty, 0);
  const total = out.reduce((n, l) => n + l.lineTotal, 0);
  return { lines: out, count, total };
}
