"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { SPRING } from "@/lib/motion";
import { Bone } from "@/components/states/PageSkeletons";

export interface RecommendationItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  category: "loans" | "bills" | "invest" | "insure";
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
}

const RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: "salary-advance",
    tag: "Instant Credit",
    title: "Access a Salary Advance",
    subtitle: "Get up to GHS 20,000 against your monthly salary in minutes.",
    cta: "Apply Now",
    href: "/loans",
    category: "loans",
    badgeBg: "bg-[color-mix(in_oklch,var(--cat-1)_16%,transparent)]",
    badgeText: "text-[var(--cat-1)]",
    cardBg: "bg-[var(--tile)]",
    cardBorder: "border-border/70",
  },
  {
    id: "dstv-renewal",
    tag: "Bill Reminder",
    title: "It's Almost That Time Again",
    subtitle: "Renew your DStv subscription to keep enjoying your favorite shows.",
    cta: "Renew DStv",
    href: "/payments/bills?biller=dstv",
    category: "bills",
    badgeBg: "bg-[color-mix(in_oklch,var(--cat-2)_16%,transparent)]",
    badgeText: "text-[var(--cat-2)]",
    cardBg: "bg-[var(--tile)]",
    cardBorder: "border-border/70",
  },
  {
    id: "term-deposit",
    tag: "High Yield",
    title: "Make Your Money Work for You",
    subtitle: "Earn guaranteed competitive returns with a fixed Term Deposit.",
    cta: "Open a Term Deposit",
    href: "/invest",
    category: "invest",
    badgeBg: "bg-[color-mix(in_oklch,var(--cat-3)_16%,transparent)]",
    badgeText: "text-[var(--cat-3)]",
    cardBg: "bg-[var(--tile)]",
    cardBorder: "border-border/70",
  },
  {
    id: "wealth-master",
    tag: "Financial Security",
    title: "Plan Ahead with Wealth Master Plan",
    subtitle: "A flexible investment and protection plan for your family's future.",
    cta: "Explore & Apply",
    href: "/insure",
    category: "insure",
    badgeBg: "bg-[color-mix(in_oklch,var(--cat-5)_16%,transparent)]",
    badgeText: "text-[var(--cat-5)]",
    cardBg: "bg-[var(--tile)]",
    cardBorder: "border-border/70",
  },
];

function CardIllustration({ category }: { category: RecommendationItem["category"] }) {
  if (category === "loans") {
    return (
      <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full bg-[var(--cat-1)]/15 blur-lg" />
        <svg viewBox="0 0 96 96" fill="none" className="relative size-full">
          {/* Base wallet / cash card layer */}
          <rect x="14" y="24" width="68" height="48" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="20" y="32" width="56" height="32" rx="10" fill="color-mix(in oklch, var(--cat-1) 12%, transparent)" stroke="color-mix(in oklch, var(--cat-1) 30%, transparent)" strokeWidth="1.2" />
          {/* Currency / lightning motif */}
          <circle cx="48" cy="48" r="13" fill="var(--primary)" />
          <path
            d="M48 40v16M44 44.5h7.5a2.5 2.5 0 0 1 0 5H44.5a2.5 2.5 0 0 0 0 5H52"
            stroke="var(--primary-foreground)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sparkling badge */}
          <circle cx="70" cy="26" r="6" fill="var(--cat-1)" />
          <path d="M70 23.5v5M67.5 26h5" stroke="var(--primary-foreground)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (category === "bills") {
    return (
      <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full bg-[var(--cat-2)]/15 blur-lg" />
        <svg viewBox="0 0 96 96" fill="none" className="relative size-full">
          {/* TV / Screen silhouette */}
          <rect x="14" y="20" width="68" height="46" rx="12" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="19" y="25" width="58" height="36" rx="8" fill="color-mix(in oklch, var(--cat-2) 15%, transparent)" stroke="color-mix(in oklch, var(--cat-2) 35%, transparent)" strokeWidth="1.2" />
          {/* Play triangle */}
          <path d="M44 37l12 6-12 6V37z" fill="var(--cat-2)" />
          {/* Stand */}
          <path d="M38 72h20M48 66v6" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Signal waves */}
          <path d="M68 22c4 4 4 10 0 14" stroke="var(--cat-2)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (category === "invest") {
    return (
      <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full bg-[var(--cat-3)]/15 blur-lg" />
        <svg viewBox="0 0 96 96" fill="none" className="relative size-full">
          {/* Vault / safe box */}
          <rect x="16" y="20" width="64" height="56" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
          <circle cx="48" cy="48" r="16" fill="color-mix(in oklch, var(--cat-3) 14%, transparent)" stroke="var(--cat-3)" strokeWidth="1.8" />
          {/* Vault dial handle & growth arrow */}
          <circle cx="48" cy="48" r="6" fill="var(--cat-3)" />
          <path d="M48 36v6M48 54v6M36 48h6M54 48h6" stroke="var(--cat-3)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Rising trend star */}
          <path d="M28 62l12-10 8 6 18-16" stroke="var(--success-text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // Insure / Wealth Master
  return (
    <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full bg-[var(--cat-5)]/15 blur-lg" />
      <svg viewBox="0 0 96 96" fill="none" className="relative size-full">
        {/* Shield outline */}
        <path
          d="M48 18l24 9v19c0 17-10 27-24 32-14-5-24-15-24-32V27l24-9z"
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M48 24l18 7v15c0 13-7.5 21-18 25-10.5-4-18-12-18-25V31l18-7z"
          fill="color-mix(in oklch, var(--cat-5) 14%, transparent)"
          stroke="color-mix(in oklch, var(--cat-5) 35%, transparent)"
          strokeWidth="1.2"
        />
        {/* Protection star / umbrella cross */}
        <path
          d="M48 38v20M38 48h20"
          stroke="var(--cat-5)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  const total = RECOMMENDATIONS.length;

  const handleNext = () => {
    setDirection(1);
    setActiveIdx((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIdx((prev) => (prev - 1 + total) % total);
  };

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-panel p-4 sm:gap-6 sm:p-6", className)}>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium leading-none text-foreground sm:text-[16px]">
            {t("dashboard.recommendedForYou", "Recommended for you")}
          </span>
          <Bone className="h-6 w-16 rounded-full" />
        </div>
        <div className="relative min-h-[170px] w-full rounded-2xl border border-border/60 bg-muted/20 p-5">
          <div className="flex flex-col gap-3">
            <Bone className="h-4 w-24 rounded-full" />
            <Bone className="h-6 w-3/4" />
            <Bone className="h-4 w-5/6" />
            <Bone className="mt-2 h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const currentItem = RECOMMENDATIONS[activeIdx];

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-border bg-panel p-4 sm:gap-5 sm:p-6",
        className
      )}
    >
      {/* Header with Title and Stack Controls */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium leading-none text-foreground sm:text-[16px]">
          {t("dashboard.recommendedForYou", "Recommended for you")}
        </span>

        {/* Minimal Stack Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous recommendation"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={1.8} />
          </button>
          <span className="text-[11.5px] tabular text-muted-foreground px-0.5">
            {activeIdx + 1}/{total}
          </span>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next recommendation"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Card Stack Area */}
      <div className="relative min-h-[175px] sm:min-h-[185px] w-full pt-1 pb-2">
        {/* Layer 3 - Bottom background card shadow peek */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 bottom-0 top-3 rounded-2xl border border-border/40 bg-card/40 opacity-40 shadow-xs transition-all duration-300"
        />

        {/* Layer 2 - Middle background card */}
        <div
          aria-hidden="true"
          className="absolute inset-x-2 bottom-1.5 top-1.5 rounded-2xl border border-border/60 bg-card/70 opacity-70 shadow-xs transition-all duration-300"
        />

        {/* Layer 1 - Active Top Card with animated loop */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={currentItem.id}
            custom={direction}
            initial={{
              scale: 0.94,
              y: direction > 0 ? 20 : -20,
              opacity: 0,
              rotateX: direction > 0 ? -6 : 6,
            }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              rotateX: 0,
            }}
            exit={{
              scale: 0.92,
              y: direction > 0 ? -24 : 24,
              opacity: 0,
              rotateX: direction > 0 ? 8 : -8,
              transition: { duration: 0.22, ease: "easeIn" },
            }}
            transition={SPRING}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40) handleNext();
              else if (info.offset.x > 40) handlePrev();
            }}
            className={cn(
              "relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-colors",
              currentItem.cardBorder
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none",
                    currentItem.badgeBg,
                    currentItem.badgeText
                  )}
                >
                  {currentItem.tag}
                </span>
                <h3 className="text-[15px] sm:text-[16px] font-medium leading-snug text-foreground">
                  {currentItem.title}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground line-clamp-2">
                  {currentItem.subtitle}
                </p>
              </div>

              <CardIllustration category={currentItem.category} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 pt-1">
              <Button
                size="sm"
                variant="default"
                nativeButton={false}
                render={<Link href={currentItem.href} />}
                className="gap-1.5 font-medium"
              >
                <span>{currentItem.cta}</span>
                <ArrowRight size={13} strokeWidth={2} />
              </Button>

              {/* Card stack pagination dots */}
              <div className="flex items-center gap-1" aria-hidden="true">
                {RECOMMENDATIONS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDirection(i > activeIdx ? 1 : -1);
                      setActiveIdx(i);
                    }}
                    className={cn(
                      "size-1.5 rounded-full transition-all duration-200 cursor-pointer",
                      i === activeIdx ? "w-4 bg-foreground" : "bg-border hover:bg-muted-foreground"
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
