/**
 * The card networks GCB issues on: Visa and Mastercard (international), GH-Link (the national switch, GhIPSS)
 * and UnionPay. One list drives the Request a Card network picker, the logos on every card face and the
 * "security code" label, so a network added here shows up everywhere.
 */

export const CARD_SCHEMES = ["Visa", "Mastercard", "GH-Link", "UnionPay"] as const;
export type CardScheme = (typeof CARD_SCHEMES)[number];

export interface NetworkTier {
  id: string;
  label: string;
  description: string;
}

export const NETWORK_TIERS: Record<CardScheme, readonly NetworkTier[]> = {
  Visa: [
    { id: "Classic", label: "Classic", description: "Standard electronic transactions" },
    { id: "Gold", label: "Gold", description: "Enhanced limits & global purchase protection" },
    { id: "Platinum", label: "Platinum", description: "Premium lifestyle privileges & travel perks" },
    { id: "Signature", label: "Signature", description: "High-tier concierge & luxury benefits" },
    { id: "Infinite", label: "Infinite", description: "Ultra-exclusive bespoke banking" },
  ],
  Mastercard: [
    { id: "MChip Classic", label: "MChip Classic", description: "Standard EMV Chip & contactless" },
    { id: "MChip Gold", label: "MChip Gold", description: "Travel assistance & higher withdrawal" },
    { id: "MChip Platinum", label: "MChip Platinum", description: "Global lounge access & priority support" },
    { id: "World Elite", label: "World Elite", description: "Bespoke executive & international privileges" },
  ],
  "GH-Link": [
    { id: "GH-Link Standard", label: "Standard", description: "Pay and withdraw across Ghana's bank network" },
    { id: "GH-Link Premium", label: "Premium", description: "Higher daily limits on the national switch" },
  ],
  UnionPay: [
    { id: "UnionPay Classic", label: "Classic", description: "Accepted at UnionPay merchants and ATMs" },
    { id: "UnionPay Gold", label: "Gold", description: "Higher limits & travel to China and Asia" },
    { id: "UnionPay Platinum", label: "Platinum", description: "Priority support & lounge access" },
    { id: "UnionPay Diamond", label: "Diamond", description: "Top tier for frequent travellers" },
  ],
};

/** What the three or four digits on the card are called by each network. */
export function securityCodeLabel(scheme: CardScheme | string): string {
  if (scheme === "Mastercard") return "CVC";
  if (scheme === "UnionPay") return "CVN2";
  return "CVV";
}

/** Local card networks settle at home. Used to say which networks work abroad. */
export const LOCAL_ONLY_SCHEMES: readonly CardScheme[] = ["GH-Link"];

/** The network a card is, from how it is named ("Ecobank Visa Debit", "UnionPay credit card"), or null. */
export function schemeFromText(text?: string | null): CardScheme | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("visa")) return "Visa";
  if (lower.includes("master")) return "Mastercard";
  if (lower.includes("union")) return "UnionPay";
  if (lower.includes("gh-link") || lower.includes("ghlink") || lower.includes("gh link")) return "GH-Link";
  return null;
}
