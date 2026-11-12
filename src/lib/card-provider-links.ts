import type { CardScheme } from "@/lib/card-schemes";

/**
 * Where each card provider confirms the customer off the platform. GCB never takes the card number, expiry or
 * security code: the customer enters them on the provider's own page, so only the provider's address lives here.
 * Nothing about the customer goes in the URL.
 *
 * TODO: replace each "#" with the provider's real confirmation address once the bank confirms it.
 */
export const CARD_PROVIDER_CONFIRM_URL: Record<CardScheme, string> = {
  Visa: "#",
  Mastercard: "#",
  "GH-Link": "#",
  UnionPay: "#",
};
