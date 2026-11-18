// Kiosk demo helper: creates a realistic paid order from a random seat in a screening
// that is on now, so staff screens can be shown without going through the guest flow.
import { MENU, VENUES, type VenueId } from "./data";
import { settleImmediately } from "./mpesa";
import { findCurrentScreenings, nairobiMinutes, type EntryPoint } from "./rules";
import { getTodaySchedule } from "./schedule";
import { sessionFromScreening } from "./sessions";
import { createOrder, stockLeft, stockStore, type Cart } from "./store";

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;
const NOTES = ["", "", "No ice", "Extra butter please", "Straw please", ""];
const NAMES = [
  "Amina Wanjiku",
  "Kevin Mutua",
  "Faith Achieng",
  "Daniel Kiprop",
  "Mercy Njeri",
  "Ian Ouma",
  "Zawadi Hassan",
];
const ENTRIES: EntryPoint[] = [
  "seat_qr",
  "admission_sms",
  "website",
  "mpesa_miniapp",
  "promo_screen",
];

export function simulateIncomingOrder(venue: VenueId | "all"): string | null {
  const v: VenueId = venue === "all" ? pick(Object.keys(VENUES) as VenueId[]) : venue;
  const now = nairobiMinutes(new Date());
  const onNow = findCurrentScreenings(getTodaySchedule(v, now), now).filter((s) => s.start <= now);
  if (!onNow.length) return null;
  const screening = pick(onNow);
  const seat = `${pick("ABCDEFGHIJ".split(""))}${1 + Math.floor(Math.random() * 14)}`;
  const stock = stockStore.get();
  const available = MENU.filter((m) => stockLeft(stock, m.id) > 0);
  if (!available.length) return null;
  const lines: Record<string, number> = {};
  for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
    const item = pick(available);
    lines[item.id] = Math.min(stockLeft(stock, item.id), (lines[item.id] ?? 0) + 1);
  }
  const cart: Cart = { lines, note: pick(NOTES), phone: "" };
  const session = { ...sessionFromScreening(v, screening, seat, null), entryPoint: pick(ENTRIES) };
  const phone = `07${Math.floor(10 + Math.random() * 89)} ${Math.floor(100 + Math.random() * 899)} ${Math.floor(100 + Math.random() * 899)}`;
  const order = createOrder(session, cart, phone, pick(NAMES));
  settleImmediately(order.id, phone);
  return order.id;
}
