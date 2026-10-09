"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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

// Apple-style calibrated spring for smooth physical card deck flipping
const DECK_SPRING = {
  type: "spring",
  duration: 0.4,
  bounce: 0.1,
} as const;

export function RecommendedForYouCard({
  loading = false,
  className,
}: {
  loading?: boolean;
  className?: string;
}) {
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
      <div className={cn("relative flex w-full flex-col justify-end pt-5", className)}>
        <Bone className="aspect-[430/214.25] w-full rounded-2xl sm:rounded-3xl" />
      </div>
    );
  }

  const current = RECOMMENDATIONS[activeIdx];
  const next1 = RECOMMENDATIONS[(activeIdx + 1) % total];
  const next2 = RECOMMENDATIONS[(activeIdx + 2) % total];

  return (
    <div
      className={cn(
        "group/stack relative flex w-full flex-col justify-end pt-4 select-none",
        className
      )}
    >
      {/* Outer Card Stack Container (Exact 430:214.25 Figma aspect ratio) */}
      <div className="relative w-full aspect-[430/214.25]">
        {/* Layer 3: Backmost peeking card */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -top-3.5 bottom-3.5 overflow-hidden rounded-2xl sm:rounded-3xl border border-black/10 opacity-50 shadow-xs transition-all duration-300 pointer-events-none"
          style={{ backgroundColor: next2.bgTone }}
        >
          <div className="relative h-full w-full opacity-40">
            <Image
              src={next2.image}
              alt=""
              fill
              className="object-cover object-center"
              sizes="(min-width: 1060px) 430px, 100vw"
            />
          </div>
        </div>

        {/* Layer 2: Middle peeking card */}
        <div
          aria-hidden="true"
          className="absolute inset-x-2 -top-2 bottom-2 overflow-hidden rounded-2xl sm:rounded-3xl border border-black/10 opacity-80 shadow-xs transition-all duration-300 pointer-events-none"
          style={{ backgroundColor: next1.bgTone }}
        >
          <div className="relative h-full w-full opacity-65">
            <Image
              src={next1.image}
              alt=""
              fill
              className="object-cover object-center"
              sizes="(min-width: 1060px) 430px, 100vw"
            />
          </div>
        </div>

        {/* Layer 1: Active Front Card with animated flip & swipe loop */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={{
              scale: 0.96,
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
              scale: 0.94,
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
            className="relative h-full w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: current.bgTone }}
          >
            {/* Complete Card Image with 100% full coverage and zero clipping */}
            <div className="relative h-full w-full">
              <Image
                src={current.image}
                alt={current.title}
                fill
                priority
                className="object-cover object-center pointer-events-none"
                sizes="(min-width: 1060px) 450px, (min-width: 640px) 50vw, 100vw"
              />

              {/* Clickable CTA Button target matching the rendered button */}
              <Link
                href={current.href}
                className="absolute bottom-[9%] left-[5%] z-20 h-[22%] w-[38%] rounded-full cursor-pointer transition-transform duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-white"
                aria-label={`${current.buttonLabel} - ${current.title}`}
              >
                <span className="sr-only">{current.buttonLabel}</span>
              </Link>
            </div>

            {/* Left and Right Arrow Navigation Controls at Top-Right */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 p-0.5 text-white shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Previous recommendation"
                className="flex size-6 sm:size-7 items-center justify-center rounded-full hover:bg-white/25 active:scale-90 transition-all text-white cursor-pointer"
              >
                <ChevronLeft size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Next recommendation"
                className="flex size-6 sm:size-7 items-center justify-center rounded-full hover:bg-white/25 active:scale-90 transition-all text-white cursor-pointer"
              >
                <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
