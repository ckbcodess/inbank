"use client";

/**
 * Recommended for you: what the recommendation engine thinks is useful to this
 * customer right now. One recommendation at a time as a plain statement on the
 * panel, why it's here, and a text link to act on it. Four soft amber layers
 * stack in the bottom-left corner and shift a little with each item. No imagery.
 */

import { Fragment, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bone } from "@/components/states/PageSkeletons";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { DURATION, EASE, SPRING } from "@/lib/motion";

interface Recommendation {
  id: string;
  /** The recommendation as one plain sentence. */
  headline: string;
  /** Why the engine picked it for this customer. */
  reason: string;
  ctaLabel: string;
  ctaHref: string;
}

// Ordered by what the customer already does (a bill that's due) before what the bank offers (credit).
const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "dstv-bill",
    headline: "Your GHS 245.00 DStv bill is due in 3 days",
    reason: "You pay it on the 15th every month.",
    ctaLabel: "Pay bill",
    ctaHref: "/payments/bills?biller=dstv",
  },
  {
    id: "term-deposit",
    headline: "You could earn GHS 180.75 on GHS 5,000",
    reason: "14.5% a year, fixed for 91 days.",
    ctaLabel: "See deposit",
    ctaHref: "/invest",
  },
  {
    id: "salary-advance",
    headline: "You qualify for a GHS 20,000 Salary Advance",
    reason: "Your salary lands here monthly.",
    ctaLabel: "See more",
    ctaHref: "/loans",
  },
  {
    id: "wealth-goal",
    headline: "You could save GHS 600 in a year",
    reason: "Set aside GHS 50 a month.",
    ctaLabel: "Start a goal",
    ctaHref: "/invest",
  },
];

/*
 * Two closed, soft-edged shapes. Each is bigger than the corner it sits in and
 * only partly on the panel, so turning one never exposes a cut edge. The panel
 * clips them. Decoration only.
 */
const SHAPE_SOLID =
  "M52 3 C66 1 74 14 82 22 C92 30 99 44 94 58 C90 70 78 74 72 84 C66 94 54 99 42 95 C30 91 24 82 14 76 C4 68 2 54 8 42 C14 30 12 20 24 12 C34 6 42 4 52 3 Z";
const SHAPE_FAINT =
  "M46 5 C58 8 62 20 74 24 C86 28 98 38 96 52 C94 66 84 70 78 80 C72 90 62 98 50 96 C38 94 34 84 24 78 C12 72 3 62 5 50 C7 38 18 34 22 24 C26 14 36 3 46 5 Z";

/** Each item's pose for the two shapes: a turn and a size. */
const POSES = [
  { solid: { r: 0, s: 1 }, faint: { r: 0, s: 1 } },
  { solid: { r: 38, s: 1.1 }, faint: { r: -42, s: 0.9 } },
  { solid: { r: -32, s: 0.92 }, faint: { r: 52, s: 1.1 } },
  { solid: { r: 74, s: 1.04 }, faint: { r: -76, s: 1 } },
] as const;

interface ShapeLayer {
  d: string;
  /** Where it sits and how big. Positions are explicit, since Framer owns `transform`. */
  place: string;
  /** Fill opacity; the front layer is solid. */
  tint?: string;
  /** Which pose to follow, so the layers don't all turn together. */
  k: number;
}

// Back to front, faint to solid.
const LAYERS: ShapeLayer[] = [
  { d: SHAPE_SOLID, place: "-bottom-[100px] -left-[100px] size-[200px]", tint: "opacity-12", k: 3 },
  { d: SHAPE_FAINT, place: "-bottom-[85px] -left-[85px] size-[170px]", tint: "opacity-25", k: 2 },
  { d: SHAPE_SOLID, place: "-bottom-[70px] -left-[70px] size-[140px]", tint: "opacity-45", k: 1 },
  { d: SHAPE_FAINT, place: "-bottom-[56px] -left-[56px] size-[112px]", k: 0 },
];

function Shapes({ index }: { index: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {LAYERS.map((layer, n) => {
        const pose = POSES[(index + layer.k) % POSES.length].solid;
        return (
          <motion.svg
            key={n}
            viewBox="0 0 100 100"
            className={cn("absolute", layer.place)}
            initial={false}
            animate={{ rotate: layer.k % 2 ? -pose.r : pose.r, scale: pose.s }}
            transition={SPRING.gentle}
          >
            <path d={layer.d} className={cn("fill-primary", layer.tint)} />
          </motion.svg>
        );
      })}
    </div>
  );
}

/** Seconds between one word and the next. */
const WORD_STEP = 0.035;

/** A small rise and fade in, held back by `delay`. */
function reveal(delay: number) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.reveal, ease: EASE.settle, delay },
  };
}

function Chevrons({ i, total, onChange }: { i: number; total: number; onChange: (n: number) => void }) {
  const btn =
    "flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors duration-hover enabled:hover:bg-item-hover enabled:hover:text-foreground disabled:opacity-30";
  return (
    // Contextual: shown while the pointer is over the card or keyboard focus is on a control in it (not after a mouse click, which leaves focus behind). Touch screens can't hover, so they keep them.
    <div className="-my-2 flex items-center opacity-0 pointer-events-none transition-opacity duration-hover group-hover/rec:pointer-events-auto group-hover/rec:opacity-100 group-has-[:focus-visible]/rec:pointer-events-auto group-has-[:focus-visible]/rec:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100">
      <button type="button" aria-label="Previous recommendation" disabled={i === 0} onClick={() => onChange(i - 1)} className={btn}>
        <ChevronLeft size={16} strokeWidth={1.8} />
      </button>
      <button type="button" aria-label="Next recommendation" disabled={i >= total - 1} onClick={() => onChange(i + 1)} className={btn}>
        <ChevronRight size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function RecommendedForYouCard({
  loading = false,
  className,
}: {
  loading?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const shell = cn(
    "group/rec relative flex h-[260px] flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-panel p-3 sm:p-4",
    className,
  );

  if (loading) {
    return (
      <div className={shell}>
        <Bone className="h-3.5 w-31 rounded-lg" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <Bone className="h-4 w-49 rounded-lg" />
          <Bone className="h-4 w-35 rounded-lg" />
        </div>
        <Bone className="mx-auto h-3 w-17 rounded-lg" />
      </div>
    );
  }

  const r = RECOMMENDATIONS[index];
  const words = r.headline.split(" ");
  const reasonAt = words.length * WORD_STEP + 0.05;

  return (
    <div className={shell}>
      <Shapes index={index} />

      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[14px] font-medium leading-none text-foreground sm:text-[16px]">
          {t("dashboard.recommendedForYou", "Recommended for you")}
        </span>
        <Chevrons i={index} total={RECOMMENDATIONS.length} onChange={setIndex} />
      </div>

      {/* The old text fades out, then the new one arrives word by word, then the reason, then the link. */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={r.id}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.hover, ease: EASE.settle }}
          className="relative z-10 flex flex-1 flex-col items-center justify-between text-center"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2">
            <p className="text-[19px] font-medium leading-[1.35] tracking-[var(--ls-tight)] text-foreground sm:text-[21px]">
              {words.map((w, n) => (
                <Fragment key={n}>
                  <motion.span className="inline-block" {...reveal(n * WORD_STEP)}>
                    {w}
                  </motion.span>
                  {n < words.length - 1 && " "}
                </Fragment>
              ))}
            </p>
            <motion.p className="text-[12.5px] text-muted-foreground" {...reveal(reasonAt)}>
              {r.reason}
            </motion.p>
          </div>
          <motion.div {...reveal(reasonAt + WORD_STEP * 2)}>
            <Link
              href={r.ctaHref}
              className="group -my-2 inline-flex items-center gap-2 py-2 text-[13px] text-foreground transition-colors duration-hover hover:text-foreground/80"
            >
              {r.ctaLabel}
              <ArrowRight size={14} strokeWidth={1.8} className="transition-transform duration-hover group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
