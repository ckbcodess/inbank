"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Bone } from "@/components/states/PageSkeletons";

export interface RecommendationCardData {
  id: string;
  title: string;
  image: string;
  href: string;
  buttonLabel: string;
  bgTone: string;
}

const RECOMMENDATIONS: RecommendationCardData[] = [
  {
    id: "salary-advance",
    title: "Access a Salary Advance",
    image: "/images/dashboard/recommendations/card-salary-advance.png",
    href: "/loans",
    buttonLabel: "Apply Now",
    bgTone: "#141414",
  },
  {
    id: "dstv",
    title: "Its Almost That Time Again",
    image: "/images/dashboard/recommendations/card-dstv.png",
    href: "/payments/bills?biller=dstv",
    buttonLabel: "Renew DStv",
    bgTone: "#0c6fb0",
  },
  {
    id: "term-deposit",
    title: "Make Your Money Work for you",
    image: "/images/dashboard/recommendations/card-term-deposit.png",
    href: "/invest",
    buttonLabel: "Open a Term Deposit",
    bgTone: "#f5b026",
  },
  {
    id: "wealth-master",
    title: "Plan Ahead with Wealth Master Plan",
    image: "/images/dashboard/recommendations/card-wealth-master.png",
    href: "/insure",
    buttonLabel: "Explore and Apply",
    bgTone: "#fbfbf9",
  },
];

// Apple-style spring for fluid deck animations (settles naturally with subtle bounce)
const DECK_SPRING = {
  type: "spring",
  duration: 0.42,
  bounce: 0.12,
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
      <div className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-panel p-4 sm:gap-4 sm:p-5", className)}>
        <div className="flex items-center justify-between">
          <Bone className="h-4 w-36" />
          <div className="flex items-center gap-1">
            <Bone className="size-7 rounded-full" />
            <Bone className="size-7 rounded-full" />
          </div>
        </div>
        <Bone className="aspect-[430/190] w-full rounded-2xl" />
      </div>
    );
  }

  const current = RECOMMENDATIONS[activeIdx];
  const next1 = RECOMMENDATIONS[(activeIdx + 1) % total];
  const next2 = RECOMMENDATIONS[(activeIdx + 2) % total];

  return (
    <div
      className={cn(
        "group/recommended flex flex-col gap-3 rounded-2xl border border-border bg-panel p-4 sm:gap-4 sm:p-5 select-none",
        className
      )}
    >
      {/* 1. Static, Non-animating Header Row */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium leading-none text-foreground sm:text-[16px]">
          {t("dashboard.recommendedForYou", "Recommended for you")}
        </span>

        {/* Top-Right Left/Right Chevron Arrow Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous recommendation"
            className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next recommendation"
            className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer"
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 2. Fluid Card Stack Area */}
      <div className="relative w-full aspect-[430/195] pt-1">
        {/* Layer 3: Backmost peeking card depth */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 bottom-0 top-3 overflow-hidden rounded-2xl border border-black/10 opacity-40 shadow-2xs transition-all duration-300 pointer-events-none"
          style={{ backgroundColor: next2.bgTone }}
        >
          <div className="relative h-[125%] w-full -top-[20%] opacity-35">
            <Image
              src={next2.image}
              alt=""
              fill
              className="object-cover object-bottom"
              sizes="(min-width: 1060px) 430px, 100vw"
            />
          </div>
        </div>

        {/* Layer 2: Middle peeking card depth */}
        <div
          aria-hidden="true"
          className="absolute inset-x-2 bottom-1.5 top-1.5 overflow-hidden rounded-2xl border border-black/10 opacity-75 shadow-xs transition-all duration-300 pointer-events-none"
          style={{ backgroundColor: next1.bgTone }}
        >
          <div className="relative h-[125%] w-full -top-[20%] opacity-55">
            <Image
              src={next1.image}
              alt=""
              fill
              className="object-cover object-bottom"
              sizes="(min-width: 1060px) 430px, 100vw"
            />
          </div>
        </div>

        {/* Layer 1: Active Top Card with Fluid Spring Flip & Drag Gestures */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={{
              scale: 0.95,
              y: direction > 0 ? 18 : -18,
              opacity: 0,
              rotate: direction > 0 ? -1.5 : 1.5,
            }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              rotate: 0,
            }}
            exit={{
              scale: 0.93,
              y: direction > 0 ? -22 : 22,
              opacity: 0,
              rotate: direction > 0 ? 2 : -2,
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
            className="relative h-full w-full overflow-hidden rounded-2xl border border-border/70 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: current.bgTone }}
          >
            {/* Inner Content Area: image offset hides the baked header so ONLY the outer header shows */}
            <div className="relative h-[125%] w-full -top-[20%]">
              <Image
                src={current.image}
                alt={current.title}
                fill
                priority
                className="object-cover object-bottom pointer-events-none"
                sizes="(min-width: 1060px) 450px, (min-width: 640px) 50vw, 100vw"
              />

              {/* Clickable CTA Button overlay with responsive press feedback */}
              <Link
                href={current.href}
                className="absolute bottom-[10%] left-[5%] z-20 h-[22%] w-[40%] rounded-full cursor-pointer transition-transform duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-white"
                aria-label={`${current.buttonLabel} - ${current.title}`}
              >
                <span className="sr-only">{current.buttonLabel}</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
