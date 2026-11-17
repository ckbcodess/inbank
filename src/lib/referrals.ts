/**
 * Customer-to-customer referral (Settings → Refer a Friend). Not the same as the branch code a new customer can enter
 * during onboarding (`ReferralStep`): that one credits a branch, this one is the customer's own code.
 *
 * There is no reward yet. The bank hasn't confirmed one (WORKING_LOG), so nothing here promises money. When it does,
 * the terms go in one place here and the pane reads them.
 */

export type ReferralStatus = "signed_up" | "opened";

export interface ReferredFriend {
  id: string;
  /** First name and last initial only: the referrer doesn't get more of a stranger's identity than that. */
  name: string;
  status: ReferralStatus;
  /** ISO date of the latest status change. */
  date: string;
}

/** The customer's code: the first four letters of their first name and four digits from their customer id. */
export function referralCodeFor(actor: { id: string; name: string }): string {
  const letters = (actor.name.split(/\s+/)[0] ?? "GCB").replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  let hash = 0;
  for (const ch of actor.id) hash = (hash * 31 + ch.charCodeAt(0)) % 10000;
  return `${letters}-${String(hash).padStart(4, "0")}`;
}

/** The link a customer shares. In the prototype it points at this app's own `/join/[code]`, so it can be tried. */
export function referralLinkFor(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://gcbbank.com.gh";
  return `${origin}/join/${code}`;
}

/** Demo data: who has joined with each persona's code. Personas not listed have referred no one yet. */
const FRIENDS: Record<string, ReferredFriend[]> = {
  "u-single": [
    { id: "rf-1", name: "Akosua M.", status: "opened", date: "2026-11-12" },
    { id: "rf-2", name: "Kwame B.", status: "opened", date: "2026-11-09" },
    { id: "rf-3", name: "Efua O.", status: "signed_up", date: "2026-11-14" },
  ],
};

/** Dev Mode's "Populated" list, for personas who haven't referred anyone. */
export const DEMO_REFERRED_FRIENDS: ReferredFriend[] = FRIENDS["u-single"];

export function referredFriendsFor(actorId: string): ReferredFriend[] {
  return FRIENDS[actorId] ?? [];
}

/* ── Resolving a code at sign-up ──────────────────────────────────────────── */

/** Prototype directory: branch referral code → branch name. Branches hand these out. */
export const REFERRAL_BRANCHES: Record<string, string> = {
  "101": "Head Office (Accra)",
  "112": "Airport City",
  "124": "Ring Road Central",
  "137": "Legon Campus",
  "183": "Tema Community (Meridian)",
  "201": "Kumasi Main",
  "305": "Takoradi Harbour",
  "410": "Tamale Main",
};

/** Upper-case, keep letters and digits, and put the dash back in a friend's code (`kwam4821` → `KWAM-4821`). */
export function normaliseReferralCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return /^[A-Z]{4}\d+$/.test(s) && s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

export type Referrer = { kind: "branch"; name: string } | { kind: "friend"; name: string };

/**
 * Who a code belongs to: a branch, or a customer (first name and last initial only). Null when nobody. `actors` is
 * passed in so this file stays free of the persona data.
 */
export function resolveReferral(code: string, actors: { id: string; name: string }[]): Referrer | null {
  const c = normaliseReferralCode(code);
  if (REFERRAL_BRANCHES[c]) return { kind: "branch", name: REFERRAL_BRANCHES[c] };
  const owner = actors.find((a) => referralCodeFor(a) === c);
  if (!owner) return null;
  const [first, ...rest] = owner.name.split(/\s+/);
  const last = rest.at(-1);
  return { kind: "friend", name: last ? `${first} ${last[0]}.` : first };
}

/* ── The code a referral link brought in ──────────────────────────────────── */

const LINK_KEY = "nibs-referral-link";

/** `/join/[code]` keeps the code here so the referral step, after onboarding, opens already filled in. */
export function rememberReferralFromLink(code: string) {
  try {
    window.localStorage.setItem(LINK_KEY, normaliseReferralCode(code));
  } catch {}
}

export function referralFromLink(): string | null {
  try {
    return window.localStorage.getItem(LINK_KEY);
  } catch {
    return null;
  }
}

export function forgetReferralFromLink() {
  try {
    window.localStorage.removeItem(LINK_KEY);
  } catch {}
}
