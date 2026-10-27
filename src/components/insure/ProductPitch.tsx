"use client";

/**
 * The pitch every product page shares (Insure plan, Loans advance, Invest product), for a customer who holds nothing under
 * it: a picture, three benefits one under another (an icon in a disc of the product's colour, a title, a muted line), and
 * the price set into a dashed divider (direction 14 of `prototype/plan-page-simple-prototypes.html`). The page adds its one
 * button, or on Invest its list of what to open. `ProductAboutBody` is the same benefits over one list card of facts, for
 * the About page a customer who already holds something opens.
 */

import {
  CalendarClock,
  GraduationCap,
  HandCoins,
  Heart,
  Landmark,
  PiggyBank,
  ShieldCheck,
  ShieldPlus,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
} from "@/components/ui/icons";
import { FactsPanel } from "@/components/invest/parts";
import { PlanImage, planToneStyle, type ProductKey } from "@/components/insure/parts";
import type { HighlightIcon, PlanHighlight } from "@/lib/product-highlights";
import { PRODUCT_IMAGES } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export const HIGHLIGHT_ICONS: Record<HighlightIcon, typeof HandCoins> = {
  payout: HandCoins,
  family: Users,
  accident: ShieldCheck,
  school: GraduationCap,
  disability: ShieldPlus,
  illness: Heart,
  repay: Wallet,
  saving: PiggyBank,
  rate: TrendingUp,
  time: CalendarClock,
  choice: CalendarClock,
  exit: Undo2,
  market: Landmark,
  government: Landmark,
};

/** The price as three parts, so it reads "From **GHS 8.00** a month", "Up to **GHS 20,000.00**" or "Rates from **12.5%** a year". */
export interface PitchPrice {
  prefix: string;
  figure: string;
  suffix?: string;
}

/** The picture's height follows the viewport (22% of it, between 120px and 315px) so the button stays above the fold. */
const PHOTO_HEIGHT = "h-[clamp(120px,22vh,315px)]";

/** The product's picture: its own image when one is supplied, otherwise a flat scene in its colour, always shown whole. */
function ProductPhoto({ productId, image }: { productId: ProductKey; image?: string }) {
  const src = image ?? (productId in PRODUCT_IMAGES ? PRODUCT_IMAGES[productId as keyof typeof PRODUCT_IMAGES] : undefined);
  return <PlanImage planId={productId} src={src} className={cn("w-full rounded-3xl", PHOTO_HEIGHT)} />;
}

/** The benefits, one under another. */
function ProductBenefits({ productId, highlights }: { productId: ProductKey; highlights: readonly PlanHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <ul style={planToneStyle(productId)} className="flex flex-col gap-5">
      {highlights.map((h) => {
        const Icon = HIGHLIGHT_ICONS[h.icon];
        return (
          <li key={h.label} className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--plan)] [--tint:var(--plan)] on-tint">
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[17px] leading-snug tracking-[var(--ls-tight)] text-foreground">{h.label}</span>
              <span className="text-[14px] leading-snug text-muted-foreground">{h.value}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The price, set into a dashed line: what you get above, what it costs on the line, the action below. */
function PriceDivider({ price }: { price?: PitchPrice }) {
  if (!price) return <div aria-hidden="true" className="h-px bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]" />;
  return (
    <div className="flex items-center gap-4 text-[14px] text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]" />
      <span className="tabular">
        {price.prefix} <span className="text-[18px] text-foreground">{price.figure}</span>
        {price.suffix ? ` ${price.suffix}` : ""}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]" />
    </div>
  );
}

/** The pitch: the picture, the benefits, and the price on the divider. */
export function ProductPitchBody({
  productId,
  image,
  highlights,
  price,
}: {
  productId: ProductKey;
  image?: string;
  highlights: readonly PlanHighlight[];
  price?: PitchPrice;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ProductPhoto productId={productId} image={image} />
      <ProductBenefits productId={productId} highlights={highlights} />
      <div className="mt-10">
        <PriceDivider price={price} />
      </div>
    </div>
  );
}

/** About: the benefits, then one list card with the price first and larger, then the facts. */
export function ProductAboutBody({
  productId,
  highlights,
  rows,
}: {
  productId: ProductKey;
  highlights: readonly PlanHighlight[];
  rows: Array<[React.ReactNode, React.ReactNode]>;
}) {
  return (
    <div className="flex flex-col gap-8">
      <ProductBenefits productId={productId} highlights={highlights} />
      <FactsPanel rows={rows} />
    </div>
  );
}
