import { cn } from "@/lib/utils";

/**
 * The white rounded box a list of rows sits in (accounts, beneficiaries, transactions, scheduled payments). The rows
 * bring their own padding and hover highlight; the box only holds them with an 8px inset. Renders a `ul` by default,
 * so each child is an `li`; pass `as="div"` when the children are not list items.
 */
/** The box's classes, for a wrapper that needs the same look around something other than plain rows (a skeleton, an error). */
export const LIST_CARD_CLASS =
  "flex flex-col gap-0.5 overflow-hidden rounded-2xl border border-transparent border-[length:var(--edge-glass-width)] p-2 " +
  "[background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(var(--edge-glass-angle),var(--edge-glass-start),var(--edge-glass-mid)_var(--edge-glass-mid-at),var(--edge-glass-end))_border-box]";

/**
 * The same glass edge around a tile (a card that holds one thing, not rows): the tile fill, and the edge the ListCard has.
 * The hover version lifts the fill to the hover tile. Written out whole because Tailwind only reads class names it can see.
 */
export const GLASS_TILE_CLASS =
  "border border-transparent border-[length:var(--edge-glass-width)] [--glass-fill:var(--tile)] " +
  "[background:linear-gradient(var(--glass-fill),var(--glass-fill))_padding-box,linear-gradient(var(--edge-glass-angle),var(--edge-glass-start),var(--edge-glass-mid)_var(--edge-glass-mid-at),var(--edge-glass-end))_border-box]";
/** The fill is a registered colour (`--glass-fill`, globals.css), so the hover eases like every other hover instead of snapping. */
export const GLASS_TILE_HOVER_CLASS = GLASS_TILE_CLASS + " transition-[--glass-fill] hover:[--glass-fill:var(--tile-hover)]";

export function ListCard({
  as = "ul",
  className,
  ...props
}: React.ComponentProps<"ul"> & { as?: "ul" | "div" }) {
  const classes = cn(LIST_CARD_CLASS, className);
  return as === "div" ? (
    <div className={classes} {...(props as React.ComponentProps<"div">)} />
  ) : (
    <ul className={classes} {...props} />
  );
}
