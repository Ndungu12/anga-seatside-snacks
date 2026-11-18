// Admission ordering links: signed, expiring, tied to one booking.
//
// PROTOTYPE ONLY. The signature here uses a demo key that ships to the browser, so it
// proves the flow, not real security. In production the link is created and checked on
// the server with HMAC-SHA256 and a secret that never leaves it.

const DEMO_SIGNING_KEY = "anga-demo-key-not-secret";

/** Links stay valid this long after the screening ends (for help and order tracking). */
export const LINK_GRACE_MINUTES = 15;

export type LinkPayload = {
  v: 1;
  /** Booking reference */
  b: string;
  /** Screening id */
  s: string;
  /** Expiry, epoch ms */
  exp: number;
  /** Nonce: makes every issued link unique */
  n: string;
};

export type LinkCheck =
  | { ok: true; payload: LinkPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired"; payload?: LinkPayload };

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function sign(body: string): string {
  const a = fnv1a(`${DEMO_SIGNING_KEY}.${body}`);
  const b = fnv1a(`${body}.${a.toString(16)}.${DEMO_SIGNING_KEY}`);
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export function createLinkToken(payload: LinkPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyLinkToken(token: string, nowMs: number): LinkCheck {
  const [body, sig, ...rest] = token.split(".");
  if (!body || !sig || rest.length) return { ok: false, reason: "malformed" };
  if (sign(body) !== sig) return { ok: false, reason: "bad_signature" };
  let payload: LinkPayload;
  try {
    payload = JSON.parse(fromB64url(body)) as LinkPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (payload.v !== 1 || !payload.b || !payload.s || typeof payload.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (nowMs > payload.exp) return { ok: false, reason: "expired", payload };
  return { ok: true, payload };
}

/** Flip one character of the signature: used by the demo to show tamper detection. */
export function tamper(token: string): string {
  const last = token.slice(-1);
  return token.slice(0, -1) + (last === "0" ? "1" : "0");
}

/** Epoch ms of today's Nairobi midnight (UTC+3, no daylight saving). */
export function nairobiDayStartMs(nowMs: number): number {
  const offset = 3 * 3600_000;
  return Math.floor((nowMs + offset) / 86_400_000) * 86_400_000 - offset;
}

/** Link expiry for a screening ending at `endMinutes` (minutes since Nairobi midnight). */
export function linkExpiryMs(
  endMinutes: number,
  nowMs: number,
  graceMinutes = LINK_GRACE_MINUTES,
): number {
  return nairobiDayStartMs(nowMs) + (endMinutes + graceMinutes) * 60_000;
}
