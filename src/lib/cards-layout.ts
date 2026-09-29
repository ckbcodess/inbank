/** Cards page layout variants — picked in Dev Mode → "Cards layout". */

export const CARDS_LAYOUTS = ["stack", "carousel", "gallery", "spotlight"] as const;
export type CardsLayout = (typeof CARDS_LAYOUTS)[number];

export const DEFAULT_CARDS_LAYOUT: CardsLayout = "stack";

export const CARDS_LAYOUT_LABELS: Record<CardsLayout, string> = {
  stack: "A · Wallet stack",
  carousel: "B · Carousel",
  gallery: "C · Gallery",
  spotlight: "D · Spotlight",
};

export const CARDS_LAYOUT_KEY = "nibs-cards-layout";
