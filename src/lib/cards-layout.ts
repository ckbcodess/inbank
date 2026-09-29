/** Cards page view modes — picked in Dev Mode → "Cards layout". */

export const CARDS_LAYOUTS = ["gallery", "stack", "carousel", "spotlight", "list"] as const;
export type CardsLayout = (typeof CARDS_LAYOUTS)[number];

export const DEFAULT_CARDS_LAYOUT: CardsLayout = "gallery";

export const CARDS_LAYOUT_LABELS: Record<CardsLayout, string> = {
  gallery: "Gallery",
  stack: "Wallet stack",
  carousel: "Carousel",
  spotlight: "Spotlight",
  list: "List",
};

export const CARDS_LAYOUT_KEY = "nibs-cards-layout";
