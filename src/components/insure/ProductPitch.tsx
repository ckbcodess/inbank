"use client";

/**
 * The pitch every product page shares (Insure plan, Loans advance, Invest product), for a customer who holds nothing under
 * it: a picture, what the product is for, the benefits one under another (an icon in a disc of the product's colour), and the
 * price set into a dashed divider. Text sits on one left edge (layout B of `prototype/plan-pitch-layout-prototypes.html`). The page adds its one
 * button, or on Invest its list of what to open. `ProductAboutBody` is the same benefits over one list card of facts, for
 * the About page a customer who already holds something opens.
 */

import {
  CalendarClock,
  GraduationCap,
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
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import { FactsPanel } from "@/components/invest/parts";
import { PlanImage, type ProductKey } from "@/components/insure/parts";
import type { HighlightIcon, PlanHighlight } from "@/lib/product-highlights";
import { PRODUCT_PHOTO_HEIGHT } from "@/lib/page-layout";
import { PRODUCT_IMAGES } from "@/lib/product-images";
import { cn } from "@/lib/utils";

type HighlightIconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>;

/** Money paid out uses the cedi receipt, the same mark as Bills on the dashboard. */
export const HIGHLIGHT_ICONS: Record<HighlightIcon, HighlightIconComponent> = {
  payout: CediReceiptIcon,
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

/** Who provides the product, with their logo. Only StarLife Assurance has a logo here so far. */
const PROVIDER_LOGOS: Record<string, string> = { "StarLife Assurance": "/brands/starlife.webp" };

/**
 * The product's picture: its own image when one is supplied, otherwise a flat scene in its colour, always shown whole.
 * The provider, when given, is a small frosted caption in the bottom-right corner, like a photo credit
 * (`prototype/plan-provider-caption-prototypes.html`). It is white on the picture's own colour in both themes.
 */
function ProductPhoto({ productId, image, provider }: { productId: ProductKey; image?: string; provider?: string }) {
  const src = image ?? (productId in PRODUCT_IMAGES ? PRODUCT_IMAGES[productId as keyof typeof PRODUCT_IMAGES] : undefined);
  const logo = provider ? PROVIDER_LOGOS[provider] : undefined;
  return (
    <div className="relative">
      <PlanImage planId={productId} src={src} className={cn("w-full rounded-3xl", PRODUCT_PHOTO_HEIGHT)} />
      {provider && (
        <span className={cn("absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--black)_28%,transparent)] py-1 pr-3 text-[12px] text-[var(--white)] backdrop-blur-md", logo ? "pl-1" : "pl-3")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a 16px logo, already a small WebP */}
          {logo && <img src={logo} alt="" width={16} height={16} className="size-4 shrink-0 rounded-full" />}
          {`Powered by ${provider}`}
        </span>
      )}
    </div>
  );
}

/** The benefits, one under another: a neutral disc and one muted line each. */
function ProductBenefits({ highlights }: { highlights: readonly PlanHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <ul className="flex flex-col gap-4">
      {highlights.map((h) => {
        const Icon = HIGHLIGHT_ICONS[h.icon];
        return (
          <li key={h.label} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="min-w-0 text-[14px] text-muted-foreground">{h.label}</span>
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

/** The pitch, on one left edge: the picture, what the product is for, the benefits, then the price on the dashed divider. */
export function ProductPitchBody({
  productId,
  image,
  description,
  provider,
  highlights,
  price,
}: {
  productId: ProductKey;
  image?: string;
  /** What the product is for, centred under the picture. */
  description?: string;
  /** Who provides it ("StarLife Assurance"), shown as a caption on the picture. */
  provider?: string;
  highlights: readonly PlanHighlight[];
  price?: PitchPrice;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ProductPhoto productId={productId} image={image} provider={provider} />
      {description && <p className="text-[14px] leading-relaxed text-foreground">{description}</p>}
      <ProductBenefits highlights={highlights} />
      <div className="mt-10">
        <PriceDivider price={price} />
      </div>
    </div>
  );
}

/** About: the benefits, then one list card of facts, ending on the price, set larger. */
export function ProductAboutBody({
  highlights,
  rows,
}: {
  highlights: readonly PlanHighlight[];
  rows: Array<[React.ReactNode, React.ReactNode]>;
}) {
  return (
    <div className="flex flex-col gap-8">
      <ProductBenefits highlights={highlights} />
      <FactsPanel rows={rows} />
    </div>
  );
}
