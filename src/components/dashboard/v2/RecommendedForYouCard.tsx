"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bone } from "@/components/states/PageSkeletons";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export interface RecommendationCardData {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  buttonLabel: string;
  bgTone: string;
  textColor: "light" | "dark";
  titleClasses: string;
  subtitleClasses: string;
  buttonClasses: string;
}

const RECOMMENDATIONS: RecommendationCardData[] = [
  {
    id: "salary-advance",
    title: "Access a\nSalary Advance",
    subtitle: "For up to GHS 20,000",
    image: "/images/dashboard/recommendations/bg-salary-advance.png",
    href: "/loans",
    buttonLabel: "Apply Now",
    bgTone: "#141414",
    textColor: "light",
    titleClasses: "text-white",
    subtitleClasses: "text-zinc-300",
    buttonClasses: "bg-[#FFC423] text-neutral-950 hover:bg-[#F0B51A]",
  },
  {
    id: "dstv",
    title: "Its Almost That\nTime Again",
    subtitle: "Renew your DStv subscription to keep enjoying.",
    image: "/images/dashboard/recommendations/bg-dstv.png",
    href: "/payments/bills?biller=dstv",
    buttonLabel: "Renew DStv",
    bgTone: "#0067a3",
    textColor: "light",
    titleClasses: "text-white",
    subtitleClasses: "text-sky-100",
    buttonClasses: "bg-[#141414] text-white hover:bg-black",
  },
  {
    id: "term-deposit",
    title: "Make Your Money\nWork for you",
    subtitle: "Earn interest with a Term Deposit.",
    image: "/images/dashboard/recommendations/bg-term-deposit.png",
    href: "/invest",
    buttonLabel: "Open a Term Deposit",
    bgTone: "#f5b026",
    textColor: "dark",
    titleClasses: "text-[#141414]",
    subtitleClasses: "text-neutral-800",
    buttonClasses: "bg-[#141414] text-white hover:bg-black",
  },
  {
    id: "wealth-master",
    title: "Plan Ahead with\nWealth Master Plan",
    subtitle: "Plan to help you prepare for your financial future.",
    image: "/images/dashboard/recommendations/bg-wealth-master.png",
    href: "/insure",
    buttonLabel: "Explore and Apply",
    bgTone: "#fbfbf9",
    textColor: "dark",
    titleClasses: "text-[#1C0D02]",
    subtitleClasses: "text-neutral-600",
    buttonClasses: "bg-[#FFC423] text-neutral-950 hover:bg-[#F0B51A]",
  },
];

// Emil Kowalski style calibrated spring for physical motion
const DECK_SPRING = {
  type: "spring",
  duration: 0.38,
  bounce: 0.08,
} as const;

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
      <div className={cn("relative flex w-full flex-col justify-end pt-4", className)}>
        <Bone className="aspect-[430/214.25] w-full rounded-2xl sm:rounded-3xl" />
      </div>
    );
  }

  const current = RECOMMENDATIONS[activeIdx];
  const next1 = RECOMMENDATIONS[(activeIdx + 1) % total];
  const next2 = RECOMMENDATIONS[(activeIdx + 2) % total];
  const isLightText = current.textColor === "light";

  return (
    <div
      className={cn(
        "group/stack relative flex w-full flex-col justify-end pt-3.5 select-none",
        className
      )}
    >
      {/* Outer Card Stack Container (Exact 430:214.25 aspect ratio matching dashboard grid) */}
      <div className="relative w-full aspect-[430/214.25]">
        {/* Layer 3: Backmost peeking card */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -top-3 bottom-3 overflow-hidden rounded-2xl sm:rounded-3xl border border-black/10 opacity-40 shadow-2xs transition-all duration-300 pointer-events-none"
          style={{ backgroundColor: next2.bgTone }}
        />

        {/* Layer 2: Middle peeking card */}
        <div
          aria-hidden="true"
          className="absolute inset-x-2 -top-1.5 bottom-1.5 overflow-hidden rounded-2xl sm:rounded-3xl border border-black/10 opacity-70 shadow-2xs transition-all duration-300 pointer-events-none"
          style={{ backgroundColor: next1.bgTone }}
        />

        {/* Static Header & Controls Layer (steady on top, does NOT animate/flip with cards) */}
        <div className="absolute top-3 sm:top-4 inset-x-4 sm:inset-x-5 z-30 flex items-center justify-between pointer-events-none transition-colors duration-200">
          <span
            className={cn(
              "text-[12.5px] sm:text-[13.5px] font-medium tracking-tight transition-colors duration-200 antialiased",
              isLightText ? "text-white/85" : "text-neutral-900/80"
            )}
          >
            {t("dashboard.recommendedForYou", "Recommended for you")}
          </span>

          {/* Left / Right Arrow Navigation Controls */}
          <div
            className={cn(
              "pointer-events-auto flex items-center gap-0.5 rounded-full p-0.5 backdrop-blur-md border transition-all duration-200 shadow-2xs",
              isLightText
                ? "bg-black/30 border-white/20 text-white"
                : "bg-white/60 border-black/10 text-neutral-900"
            )}
          >
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous recommendation"
              className={cn(
                "flex size-6 sm:size-6.5 items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer",
                isLightText ? "hover:bg-white/20" : "hover:bg-black/10"
              )}
            >
              <ChevronLeft size={15} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next recommendation"
              className={cn(
                "flex size-6 sm:size-6.5 items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer",
                isLightText ? "hover:bg-white/20" : "hover:bg-black/10"
              )}
            >
              <ChevronRight size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Layer 1: Active Front Card with animated blur + physical slide crossfade */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={{
              scale: 0.97,
              y: direction > 0 ? 8 : -8,
              opacity: 0,
              filter: "blur(3px)",
            }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
            }}
            exit={{
              scale: 0.97,
              y: direction > 0 ? -10 : 10,
              opacity: 0,
              filter: "blur(3px)",
              transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
            }}
            transition={DECK_SPRING}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -35) handleNext();
              else if (info.offset.x > 35) handlePrev();
            }}
            className="relative h-full w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/70 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing [backface-visibility:hidden] [transform:translate3d(0,0,0)]"
            style={{
              backgroundColor: current.bgTone,
              willChange: "transform, opacity, filter",
            }}
          >
            {/* Clean Template Artwork */}
            <Image
              src={current.image}
              alt=""
              fill
              priority
              className="object-cover object-right sm:object-center pointer-events-none"
              sizes="(min-width: 1060px) 450px, (min-width: 640px) 50vw, 100vw"
            />

            {/* Typography and CTA Button Overlay on Left Side (Hardware-accelerated & Anti-aliased) */}
            <div className="absolute inset-0 pt-10 sm:pt-12 pb-3.5 sm:pb-4.5 px-4 sm:px-5 flex flex-col justify-between max-w-[62%] sm:max-w-[58%] z-20 pointer-events-none [transform:translateZ(0)]">
              {/* Title & Subtitle */}
              <div className="flex flex-col gap-1 min-w-0 antialiased">
                <h3
                  className={cn(
                    "text-[15px] xs:text-[17px] sm:text-[18px] lg:text-[19px] font-medium leading-[1.15] tracking-tight whitespace-pre-line [-webkit-font-smoothing:antialiased]",
                    current.titleClasses
                  )}
                >
                  {current.title}
                </h3>
                <p
                  className={cn(
                    "text-[11px] sm:text-[12px] leading-snug line-clamp-2 font-normal [-webkit-font-smoothing:antialiased]",
                    current.subtitleClasses
                  )}
                >
                  {current.subtitle}
                </p>
              </div>

              {/* Dynamic Action Button */}
              <div className="pt-2 pointer-events-auto">
                <Link
                  href={current.href}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-[12.5px] font-medium shadow-2xs transition-transform duration-160 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2",
                    current.buttonClasses
                  )}
                  aria-label={`${current.buttonLabel} - ${current.title.replace("\n", " ")}`}
                >
                  {current.buttonLabel}
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
