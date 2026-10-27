"use client";

/**
 * A product as a card, in the looks Dev Mode can switch between (see `insure-cards-store.ts`). Used for the plans on
 * Insure, the two kinds of investment on Invest and the salary advance on Loans. Four looks, three of them narrowed from
 * 28 in `prototype/product-card-prototypes.html`:
 *  - corner:    name and descriptor at the top left, the product's disc at the top right.
 *  - watermark: the product's icon large and faint, cropped into the bottom right.
 *  - rising:    the icon rising from the bottom edge on the right and cut off by it.
 *  - image:     a picture of the product across the top (a flat scene until real photographs arrive), then the name,
 *               descriptor and what the customer holds as chips.
 * In every look the status sits alone at the bottom left. A card carries one quiet line about what the customer holds (`status`), amber when it needs them. Its descriptor
 * (`line`) always shows, whatever the status. A price shows only when `alwaysPrice` is set (the salary advance: how much
 * you can take is the point). A card either calls `onOpen` or links to `href`. All three looks are the same size, so
 * shelves line up from page to page.
 */

import { useMemo } from "react";
import Link from "next/link";
import type { InsurancePlan } from "@/lib/insurance-plans";
import { useInsureCards, type GatePromptStyle, type PlanCardLayout, type PlanCardLook } from "@/lib/insure-cards-store";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { PlanDisc, PlanImage, PlanMark, planToneStyle, type ProductKey } from "@/components/insure/parts";
import { Badge } from "@/components/ui/badge";
import { GLASS_TILE_CLASS, GLASS_TILE_HOVER_CLASS } from "@/components/ui/list-card";
import { cn } from "@/lib/utils";

export interface ProductPrice {
  /** "From" or "Up to". */
  label: string;
  amount: string;
  /** "a month", when the amount is a premium. */
  unit?: string;
}

/** The one quiet line on a card about what the customer already holds ("2 policies"), amber when something needs them. */
export interface ProductStatus {
  text: string;
  attention?: boolean;
}

export function ProductCard({
  id,
  name,
  line,
  price,
  status,
  image,
  alwaysPrice = false,
  look,
  layout,
  onOpen,
  href,
  disabled = false,
}: {
  id: ProductKey;
  name: string;
  line?: string;
  price?: ProductPrice;
  status?: ProductStatus;
  /** The product's own picture for the image look, when it has one. */
  image?: string;
  alwaysPrice?: boolean;
  look: PlanCardLook;
  layout: PlanCardLayout;
  onOpen?: () => void;
  href?: string;
  /** Shown quiet and not openable. */
  disabled?: boolean;
}) {
  const single = layout === "single";
  const showPrice = Boolean(price) && alwaysPrice;

  const statusLine = status && (
    <span className={cn("tabular text-[12px]", status.attention ? "text-warning-text" : "text-muted-foreground")}>{status.text}</span>
  );

  // Name, descriptor and price at the top left, clear of the icon; the status alone at the bottom left.
  const head = (
    <span className="relative z-10 flex max-w-[66%] flex-col gap-1">
      <span className="text-[16px] font-medium tracking-[var(--ls-tight)] sm:text-[18px]">{name}</span>
      {line && <span className="text-[13px] leading-snug text-muted-foreground">{line}</span>}
      {showPrice && price && (
        <span className="tabular mt-1 text-[14px]">
          <span className="text-muted-foreground">{`${price.label} `}</span>
          {price.amount}
          {price.unit && <span className="text-muted-foreground">{` ${price.unit}`}</span>}
        </span>
      )}
    </span>
  );
  const foot = status && <span className="relative z-10 mt-4 max-w-[66%]">{statusLine}</span>;

  // In the image look what the customer holds is chips: the count, then (amber) what needs them.
  const parts = status ? status.text.split(" · ") : [];
  const chips = status && (
    <span className="mt-3 flex flex-wrap gap-2">
      {parts.map((t, i) => (
        <Badge key={t} size="md" variant={status.attention && (i > 0 || parts.length === 1) ? "warning" : "success"} className="tabular">
          {t}
        </Badge>
      ))}
    </span>
  );

  const body =
    look === "image" ? (
      <>
        <PlanImage planId={id} src={image} className={single ? "h-28" : "h-40"} />
        <span className="flex flex-col gap-1 p-5 sm:p-6">
          <span className="text-[16px] font-medium tracking-[var(--ls-tight)] sm:text-[18px]">{name}</span>
          {line && <span className="text-[13px] leading-snug text-muted-foreground">{line}</span>}
          {showPrice && price && (
            <span className="tabular mt-1 text-[14px]">
              <span className="text-muted-foreground">{`${price.label} `}</span>
              {price.amount}
              {price.unit && <span className="text-muted-foreground">{` ${price.unit}`}</span>}
            </span>
          )}
          {chips}
        </span>
      </>
    ) : look === "corner" ? (
      <>
        <PlanDisc planId={id} size={40} className="absolute right-5 top-5 sm:right-6 sm:top-6" />
        {head}
        {foot}
      </>
    ) : look === "watermark" ? (
      <>
        {head}
        {foot}
        <PlanMark planId={id} size={150} className="-bottom-6 -right-4 opacity-40" />
      </>
    ) : (
      <>
        {head}
        {foot}
        <PlanMark planId={id} size={130} className="-bottom-11 right-3 opacity-50" />
      </>
    );

  const classes = cn(
    "group relative flex w-full flex-col overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    disabled ? GLASS_TILE_CLASS : GLASS_TILE_HOVER_CLASS,
    "text-foreground",
    look === "image" ? "p-0" : cn("justify-between p-5 sm:px-6", single ? "min-h-[140px]" : "min-h-[184px]"),
    disabled && "opacity-60",
  );

  if (disabled) {
    return (
      <div style={planToneStyle(id)} className={classes}>
        {body}
      </div>
    );
  }
  if (href) {
    return (
      <Link href={href} style={planToneStyle(id)} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onOpen} style={planToneStyle(id)} className={classes}>
      {body}
    </button>
  );
}

/** An insurance plan. */
export function PlanCard({
  plan,
  look,
  layout,
  status,
}: {
  plan: InsurancePlan;
  look: PlanCardLook;
  layout: PlanCardLayout;
  status?: ProductStatus;
}) {
  return <ProductCard id={plan.id} name={plan.name} line={plan.line} status={status} image={plan.image} look={look} layout={layout} href={`/insure/plans/${plan.id}`} />;
}

const CARD_LOOKS = [
  { id: "corner", label: "Disc in the corner" },
  { id: "watermark", label: "Watermark icon" },
  { id: "rising", label: "Rising icon" },
  { id: "image", label: "With image" },
];
const CARD_LAYOUTS = [
  { id: "grid", label: "Two columns" },
  { id: "single", label: "One column" },
];
const GATE_STYLES = [
  { id: "row", label: "Slim row" },
  { id: "card", label: "Setup card" },
  { id: "track", label: "Progress track" },
];

/**
 * The card look, the layout and the "before you can use this" prompt, with the Dev Mode switches that change them.
 * Scaffolding: production builds always show the corner look, two to a row, with the slim row. Insure, Invest and Loans
 * share it.
 */
export function useCardLooks(): { look: PlanCardLook; layout: PlanCardLayout; gate: GatePromptStyle; groups: DevStateGroup[] } {
  const storedLook = useInsureCards((s) => s.look);
  const storedLayout = useInsureCards((s) => s.layout);
  const storedGate = useInsureCards((s) => s.gate);
  const setLook = useInsureCards((s) => s.setLook);
  const setLayout = useInsureCards((s) => s.setLayout);
  const setGate = useInsureCards((s) => s.setGate);
  const groups = useMemo<DevStateGroup[]>(
    () => [
      { label: "Cards", states: CARD_LOOKS, value: storedLook, onChange: (v) => setLook(v as PlanCardLook) },
      { label: "Card layout", states: CARD_LAYOUTS, value: storedLayout, onChange: (v) => setLayout(v as PlanCardLayout) },
      { label: "Before you can use it", states: GATE_STYLES, value: storedGate, onChange: (v) => setGate(v as GatePromptStyle) },
    ],
    [storedLook, storedLayout, storedGate, setLook, setLayout, setGate],
  );
  return {
    look: SHOW_DEMO_TOOLS ? storedLook : "corner",
    layout: SHOW_DEMO_TOOLS ? storedLayout : "grid",
    gate: SHOW_DEMO_TOOLS ? storedGate : "row",
    groups,
  };
}
