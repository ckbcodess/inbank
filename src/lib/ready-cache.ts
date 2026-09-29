import type { CardsLayout } from "@/lib/cards-layout";

/**
 * What the Cards screens have already established in this tab. Client-side
 * navigation remounts a page, and a gate that starts from "not ready" every time
 * flashes its skeleton over content that's already there. Module state survives
 * those remounts; it starts empty on the server and on a full page load, so the
 * first paint still matches the server's markup.
 */
export const readyCache: { session: boolean; layout: CardsLayout | null } = {
  session: false,
  layout: null,
};
