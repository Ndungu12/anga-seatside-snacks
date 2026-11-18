// Central mock data for the ANGA In-Seat prototype. Mock data only: prices are
// indicative demo prices, not live Anga Cinemas prices. Every screen reads from here.

export type VenueId = "diamond" | "sky";

export const VENUES: Record<VenueId, string> = {
  diamond: "Anga Diamond",
  sky: "Anga Sky",
};

export function toVenueId(value: string | undefined): VenueId | null {
  const v = (value ?? "").trim().toLowerCase();
  return v === "diamond" || v === "sky" ? v : null;
}

/** Cinemas shown on the visual cinema cards. */
export const CINEMAS: Record<
  VenueId,
  { name: string; area: string; place: string; image: string; halls: number }
> = {
  diamond: {
    name: "Anga Diamond",
    area: "Nairobi",
    place: "Diamond Plaza, Parklands",
    image: "/images/cinemas/diamond.jpg",
    halls: 4,
  },
  sky: {
    name: "Anga Sky",
    area: "Nairobi",
    place: "Panari Sky Centre, Mombasa Road",
    image: "/images/cinemas/sky.jpg",
    halls: 5,
  },
};

export type CategoryId = "combos" | "popcorn" | "drinks" | "snacks" | "meals" | "desserts";

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "combos", label: "Combos" },
  { id: "popcorn", label: "Popcorn" },
  { id: "drinks", label: "Drinks" },
  { id: "snacks", label: "Snacks" },
  { id: "meals", label: "Meals" },
  { id: "desserts", label: "Desserts" },
];

export type OptionChoice = { id: string; label: string; delta: number };
export type OptionGroup = { id: string; label: string; choices: OptionChoice[] };

export type MenuItem = {
  id: string;
  category: CategoryId;
  name: string;
  description: string;
  /** KES, demo price */
  price: number;
  image: string;
  tag?: "Best seller" | "New" | "Sharing" | "Popular";
  /** Optional customisation; the first choice in each group is the default. */
  options?: OptionGroup[];
};

const img = (id: string) => `/images/menu/${id}.jpg`;
const SIZE: OptionGroup = {
  id: "size",
  label: "Size",
  choices: [
    { id: "m", label: "Medium", delta: 0 },
    { id: "l", label: "Large", delta: 150 },
  ],
};
const ICE: OptionGroup = {
  id: "ice",
  label: "Ice",
  choices: [
    { id: "ice", label: "With ice", delta: 0 },
    { id: "noice", label: "No ice", delta: 0 },
  ],
};

export const MENU: MenuItem[] = [
  // Combos
  {
    id: "cmb-solo",
    category: "combos",
    name: "Solo Movie Combo",
    description: "Medium salted popcorn and a 500 ml soda.",
    price: 450,
    image: img("cmb-solo"),
    tag: "Best seller",
    options: [ICE],
  },
  {
    id: "cmb-date",
    category: "combos",
    name: "Date Night Combo",
    description: "Large popcorn, loaded nachos and two 500 ml sodas.",
    price: 1200,
    image: img("cmb-date"),
    tag: "Sharing",
    options: [ICE],
  },
  {
    id: "cmb-family",
    category: "combos",
    name: "Family Feast",
    description: "Two large popcorns, four drinks and six chicken wings.",
    price: 2400,
    image: img("cmb-family"),
    tag: "Sharing",
  },
  {
    id: "cmb-kids",
    category: "combos",
    name: "Kids Treat",
    description: "Small popcorn, fresh juice and a chocolate bar.",
    price: 400,
    image: img("cmb-kids"),
  },
  // Popcorn
  {
    id: "pop-salted",
    category: "popcorn",
    name: "Salted Popcorn",
    description: "Freshly popped and lightly salted, the cinema classic.",
    price: 300,
    image: img("pop-salted"),
    tag: "Popular",
    options: [SIZE],
  },
  {
    id: "pop-caramel",
    category: "popcorn",
    name: "Caramel Popcorn",
    description: "Glazed in buttery caramel, crunchy all the way down.",
    price: 400,
    image: img("pop-caramel"),
    options: [SIZE],
  },
  {
    id: "pop-cheese",
    category: "popcorn",
    name: "Cheese Popcorn",
    description: "Dusted with aged cheddar seasoning.",
    price: 400,
    image: img("pop-cheese"),
    options: [SIZE],
  },
  {
    id: "pop-mixed",
    category: "popcorn",
    name: "Sweet & Salty Mix",
    description: "Half caramel, half salted. Can't decide? Don't.",
    price: 450,
    image: img("pop-mixed"),
    tag: "New",
    options: [SIZE],
  },
  // Drinks
  {
    id: "drk-aquamist",
    category: "drinks",
    name: "Aquamist 500ml",
    description: "Still mineral water, served chilled.",
    price: 170,
    image: img("drk-aquamist"),
  },
  {
    id: "drk-soda",
    category: "drinks",
    name: "Soda 500ml",
    description: "Ice-cold fizzy drink.",
    price: 200,
    image: img("drk-soda"),
    options: [
      {
        id: "flavour",
        label: "Flavour",
        choices: [
          { id: "cola", label: "Cola", delta: 0 },
          { id: "orange", label: "Orange", delta: 0 },
          { id: "lemon", label: "Lemon-lime", delta: 0 },
        ],
      },
      ICE,
    ],
  },
  {
    id: "drk-mango",
    category: "drinks",
    name: "Fresh Mango Juice",
    description: "Pressed from ripe Kenyan mangoes, 400 ml.",
    price: 300,
    image: img("drk-mango"),
    tag: "Popular",
  },
  {
    id: "drk-orange",
    category: "drinks",
    name: "Fresh Orange Juice",
    description: "Freshly squeezed, 400 ml.",
    price: 300,
    image: img("drk-orange"),
  },
  {
    id: "drk-shake",
    category: "drinks",
    name: "Chocolate Milkshake",
    description: "Thick, cold and topped with cream.",
    price: 450,
    image: img("drk-shake"),
  },
  {
    id: "drk-coffee",
    category: "drinks",
    name: "Cappuccino",
    description: "Double shot of Kenyan AA with steamed milk.",
    price: 280,
    image: img("drk-coffee"),
  },
  // Snacks
  {
    id: "snk-nachos",
    category: "snacks",
    name: "Loaded Nachos",
    description: "Tortilla chips, warm cheese sauce, salsa and jalapeños.",
    price: 600,
    image: img("snk-nachos"),
    tag: "Best seller",
    options: [
      {
        id: "heat",
        label: "Jalapeños",
        choices: [
          { id: "hot", label: "With jalapeños", delta: 0 },
          { id: "mild", label: "No jalapeños", delta: 0 },
        ],
      },
      {
        id: "cheese",
        label: "Cheese",
        choices: [
          { id: "std", label: "Regular cheese", delta: 0 },
          { id: "extra", label: "Extra cheese", delta: 100 },
        ],
      },
    ],
  },
  {
    id: "snk-samosa",
    category: "snacks",
    name: "Beef Samosas (3)",
    description: "Crisp pastry, spiced beef filling, with a lemon wedge.",
    price: 250,
    image: img("snk-samosa"),
  },
  {
    id: "snk-crisps",
    category: "snacks",
    name: "Salted Crisps",
    description: "Thin-cut potato crisps.",
    price: 150,
    image: img("snk-crisps"),
  },
  {
    id: "snk-chocolate",
    category: "snacks",
    name: "Dark Chocolate",
    description: "Rich dark chocolate bar, 70% cocoa.",
    price: 180,
    image: img("snk-chocolate"),
  },
  // Meals
  {
    id: "mel-burger",
    category: "meals",
    name: "Classic Beef Burger",
    description: "Grilled beef patty, cheddar, lettuce, tomato and house sauce.",
    price: 850,
    image: img("mel-burger"),
    tag: "Popular",
    options: [
      {
        id: "side",
        label: "Side",
        choices: [
          { id: "none", label: "Burger only", delta: 0 },
          { id: "fries", label: "Add seasoned fries", delta: 150 },
        ],
      },
    ],
  },
  {
    id: "mel-hotdog",
    category: "meals",
    name: "Loaded Hot Dog",
    description: "Beef sausage, pickled onions, mustard and tomato relish.",
    price: 450,
    image: img("mel-hotdog"),
  },
  {
    id: "mel-wings",
    category: "meals",
    name: "Sticky Chicken Wings (6)",
    description: "Glazed, sticky and finished with sesame.",
    price: 750,
    image: img("mel-wings"),
  },
  {
    id: "mel-pizza",
    category: "meals",
    name: "Margherita Slice",
    description: "Stone-baked, mozzarella and basil.",
    price: 400,
    image: img("mel-pizza"),
  },
  {
    id: "mel-fries",
    category: "meals",
    name: "Seasoned Fries",
    description: "Crisp fries with chilli salt.",
    price: 300,
    image: img("mel-fries"),
  },
  // Desserts
  {
    id: "des-icecream",
    category: "desserts",
    name: "Strawberry Ice Cream",
    description: "Two scoops in a crisp waffle cone.",
    price: 250,
    image: img("des-icecream"),
  },
  {
    id: "des-brownie",
    category: "desserts",
    name: "Chocolate Brownie",
    description: "Warm, fudgy and dusted with cocoa.",
    price: 300,
    image: img("des-brownie"),
    tag: "New",
  },
  {
    id: "des-churros",
    category: "desserts",
    name: "Churros & Chocolate",
    description: "Cinnamon sugar churros with a chocolate dip.",
    price: 400,
    image: img("des-churros"),
  },
  {
    id: "des-donut",
    category: "desserts",
    name: "Sprinkle Donut",
    description: "Chocolate-glazed ring donut with sprinkles.",
    price: 200,
    image: img("des-donut"),
  },
];

export const MENU_BY_ID: Record<string, MenuItem> = Object.fromEntries(
  MENU.map((item) => [item.id, item]),
);

/** Products we suggest on the menu (best sellers first). */
export const RECOMMENDED_IDS = ["cmb-solo", "snk-nachos", "pop-caramel", "drk-mango", "mel-burger"];

/** Seat delivery fee. Free during the launch period, shown so guests see there is no surprise. */
export const SEAT_DELIVERY_FEE = 0;

/** Kenyan shilling formatting, e.g. 1250 -> "KES 1,250". Deterministic for SSR. */
export function formatKsh(amount: number): string {
  const whole = Math.round(amount);
  const sign = whole < 0 ? "-" : "";
  const digits = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}KES ${digits}`;
}

// ---- Basket keys: one line per product + chosen options ----

/** "pop-salted" or "pop-salted~l" (choice ids in group order). Default choices are omitted. */
export function cartKey(itemId: string, choices: Record<string, string> = {}): string {
  const item = MENU_BY_ID[itemId];
  if (!item?.options) return itemId;
  const ids = item.options.map((g) => choices[g.id] ?? g.choices[0]!.id);
  const isDefault = item.options.every((g, i) => ids[i] === g.choices[0]!.id);
  return isDefault ? itemId : `${itemId}~${ids.join(".")}`;
}

export function parseCartKey(key: string): { item: MenuItem; choices: OptionChoice[] } | null {
  const [itemId, rest] = key.split("~");
  const item = MENU_BY_ID[itemId ?? ""];
  if (!item) return null;
  const ids = rest ? rest.split(".") : [];
  const choices = (item.options ?? []).map(
    (g, i) => g.choices.find((c) => c.id === ids[i]) ?? g.choices[0]!,
  );
  return { item, choices };
}

/** Base product id for a basket key (stock is tracked per product). */
export const baseItemId = (key: string) => key.split("~")[0]!;

export type CartSummaryLine = {
  key: string;
  item: MenuItem;
  /** Non-default choices, for display ("Large · No ice") */
  extras: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
};

export function summarizeCart(lines: Record<string, number>) {
  const out: CartSummaryLine[] = [];
  for (const [key, qty] of Object.entries(lines)) {
    if (qty <= 0) continue;
    const parsed = parseCartKey(key);
    if (!parsed) continue;
    const unitPrice = parsed.item.price + parsed.choices.reduce((n, c) => n + c.delta, 0);
    const extras = parsed.choices
      .filter((c, i) => c.id !== parsed.item.options![i]!.choices[0]!.id)
      .map((c) => c.label)
      .join(" · ");
    out.push({ key, item: parsed.item, extras, unitPrice, qty, lineTotal: qty * unitPrice });
  }
  out.sort((a, b) => MENU.indexOf(a.item) - MENU.indexOf(b.item));
  const count = out.reduce((n, l) => n + l.qty, 0);
  const subtotal = out.reduce((n, l) => n + l.lineTotal, 0);
  return {
    lines: out,
    count,
    subtotal,
    fee: SEAT_DELIVERY_FEE,
    total: subtotal + SEAT_DELIVERY_FEE,
  };
}

/**
 * Official support contacts per venue. Set the real numbers here (international format,
 * digits only, e.g. "2547XXXXXXXX"). While null, the Help sheet shows a preview instead of
 * calling or messaging anyone.
 */
export const SUPPORT_CONTACTS: Record<
  VenueId,
  { kioskPhone: string | null; whatsapp: string | null }
> = {
  diamond: { kioskPhone: null, whatsapp: null },
  sky: { kioskPhone: null, whatsapp: null },
};

/** Campaign parameters carried through in-app redirects so attribution isn't lost. */
export type CampaignSearch = {
  utm_source?: string | undefined;
  utm_medium?: string | undefined;
  utm_campaign?: string | undefined;
  entry?: string | undefined;
};

export function campaignSearch(search: Record<string, unknown>): CampaignSearch {
  const out: CampaignSearch = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "entry"] as const) {
    const v = search[k];
    if (typeof v === "string" && v) out[k] = v.slice(0, 64);
  }
  return out;
}

/** Low-stock warning threshold (kiosk warns, guests see "Only N left"). */
export const LOW_STOCK = 5;

/** Starting stock per product for the demo. Nachos start low so the warning is visible. */
export const START_STOCK: Record<string, number> = Object.fromEntries(
  MENU.map((item) => [item.id, item.id === "snk-nachos" ? 4 : item.id === "des-churros" ? 0 : 30]),
);

// ---- Mock campaigns (promo screens, social, Mini App) ----

export type Campaign = {
  id: string;
  source: string;
  medium: string;
  venue: VenueId;
  eyebrow: string;
  headline: string;
  body: string;
  image: string;
  featured: string[];
  offer: string;
};

export const CAMPAIGNS: Campaign[] = [
  {
    id: "combo_week",
    source: "promo_screen",
    medium: "cinema_screen",
    venue: "diamond",
    eyebrow: "On screen now at Anga Diamond",
    headline: "Combo Week. Stay in your seat.",
    body: "Order a Date Night Combo from your phone and we'll bring it to your row before the trailers end.",
    image: "/images/hero-snacks.jpg",
    featured: ["cmb-date", "cmb-solo", "snk-nachos"],
    offer: "Combos delivered free to your seat",
  },
  {
    id: "popcorn_friday",
    source: "instagram",
    medium: "social",
    venue: "sky",
    eyebrow: "@angacinemas · Popcorn Friday",
    headline: "Popcorn Friday at Anga Sky.",
    body: "Caramel, cheese or sweet & salty, popped fresh and sent to your seat. Tap to order when you're in.",
    image: "/images/menu/pop-mixed.jpg",
    featured: ["pop-caramel", "pop-mixed", "pop-cheese"],
    offer: "Try the new Sweet & Salty Mix",
  },
];

export const CAMPAIGN_BY_ID: Record<string, Campaign> = Object.fromEntries(
  CAMPAIGNS.map((c) => [c.id, c]),
);
