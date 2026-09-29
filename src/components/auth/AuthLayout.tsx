"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import Link from "next/link";
import AuthHeader from "./AuthHeader";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { cn } from "@/lib/utils";
import { SmoothHeight } from "@/components/ui/smooth-height";

interface AuthLayoutProps {
  title?: string;
  titleClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  children: ReactNode;
  /** Alignment of header (title, description, icon): default "left", or "center" for success/informatory states */
  align?: "left" | "center";
  /** In-card back handler */
  onBack?: () => void;
  /** In-card back link fallback */
  backHref?: string;
  /** Label for back button aria-label */
  backLabel?: string;
  /** Optional icon component */
  icon?: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  /** Rendered under the card — links, reassurance, demo affordances. */
  footer?: ReactNode;
  /** Widen for steps that carry a wide list of choices or tables. */
  width?: "default" | "wide" | "compact";
  /** Optional step progress indicator (e.g. 8 steps) */
  stepProgress?: {
    current: number;
    total: number;
  };
  /** Show the GCB Eagle mark at the top of the card (default false to avoid repeating top navbar logo) */
  showLogo?: boolean;
  /** Animate card height between step transitions. Defaults to false to prevent expanding animations on initial page load. */
  animateHeight?: boolean;
}

export default function AuthLayout({
  title,
  titleClassName,
  description,
  descriptionClassName,
  children,
  align = "left",
  onBack,
  backHref,
  backLabel = "Go back",
  icon: Icon,
  footer,
  width = "default",
  stepProgress,
  showLogo = false,
  animateHeight = false,
}: AuthLayoutProps) {
  const maxWidthClass =
    width === "wide"
      ? "max-w-[620px]"
      : width === "compact"
      ? "max-w-[500px]"
      : "max-w-[540px]";

  const hasBack = Boolean(onBack || backHref);
  const cardClassName =
    "rounded-[20px] border border-border/80 bg-card/95 px-6 py-8 sm:px-8 sm:py-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden";

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-background text-foreground transition-colors selection:bg-primary/30 selection:text-foreground overflow-x-hidden">
      {/* Top Fixed Header */}
      <AuthHeader />

      {/* Decorative Brand Hero Banner Background */}
      <div className="absolute top-16 inset-x-0 h-[240px] sm:h-[280px] lg:h-[300px] overflow-hidden pointer-events-none z-0">
        <Image
          src="/images/auth-banner.png"
          alt="GCB Internet Banking"
          fill
          className="object-cover object-center opacity-90"
          priority
        />
        {/* Gold to dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-black/20 dark:from-black/70 dark:via-black/40 dark:to-black/80" />
        {/* Fade smoothly into page background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* Main Container - Vertically and horizontally centered in available viewport */}
      <main className="relative z-10 flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center px-4 sm:px-6 py-8 mt-16">
        <div className={`w-full ${maxWidthClass}`}>
          {/* Card Inner Content */}
          {(() => {
            const cardInner = (
              <>
                {/* Step Progress Segments (Full Width across the card) */}
                {stepProgress && (
                  <div className="mb-6 flex items-center gap-2 px-0.5">
                    {Array.from({ length: stepProgress.total }).map((_, i) => {
                      const isActive = i + 1 <= stepProgress.current;
                      const isCurrent = i + 1 === stepProgress.current;
                      return (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            isCurrent
                              ? "bg-primary"
                              : isActive
                              ? "bg-primary/60"
                              : "bg-muted"
                          }`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* In-Card Back Navigation Trigger */}
                {hasBack && (
                  <div className="mb-5 flex items-center">
                    {backHref ? (
                      <Link
                        href={backHref}
                        aria-label={backLabel}
                        className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                      >
                        <div className="flex size-7.5 items-center justify-center rounded-lg border border-border/70 bg-muted/30 transition-colors group-hover:bg-muted group-hover:border-border">
                          <ChevronLeft size={16} strokeWidth={2.2} className="transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        <span>Back</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onBack}
                        aria-label={backLabel}
                        className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95 cursor-pointer"
                      >
                        <div className="flex size-7.5 items-center justify-center rounded-lg border border-border/70 bg-muted/30 transition-colors group-hover:bg-muted group-hover:border-border">
                          <ChevronLeft size={16} strokeWidth={2.2} className="transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        <span>Back</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Optional Step Icon */}
                {Icon && (
                  <div className={cn("mb-6 flex", align === "center" ? "justify-center" : "justify-start")}>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
                      <Icon size={22} strokeWidth={2} aria-hidden="true" />
                    </div>
                  </div>
                )}

                {/* Optional GCB Logo (only if explicitly enabled) */}
                {showLogo && (
                  <div className={cn("mb-6 flex", align === "center" ? "justify-center" : "justify-start")}>
                    <GCBLogo className="h-9 w-auto text-foreground" />
                  </div>
                )}

                {/* Title & Description with alignment */}
                {(title || description) && (
                  <div
                    className={cn(
                      "mb-8",
                      align === "center" ? "text-center mx-auto max-w-[440px]" : "text-left"
                    )}
                  >
                    {title && (
                      <h1
                        className={cn(
                          "text-[21px] sm:text-[23px] font-medium tracking-[-0.015em] text-foreground leading-snug",
                          titleClassName
                        )}
                      >
                        {title}
                      </h1>
                    )}
                    {description && (
                      <div
                        className={cn(
                          "mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground",
                          descriptionClassName
                        )}
                      >
                        {description}
                      </div>
                    )}
                  </div>
                )}

                {/* Form & Actions */}
                {children}
              </>
            );

            return animateHeight ? (
              <motion.div
                layout
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                className={cardClassName}
              >
                <SmoothHeight duration={0.35}>{cardInner}</SmoothHeight>
              </motion.div>
            ) : (
              <div className={cardClassName}>{cardInner}</div>
            );
          })()}

          {/* Optional Footer Elements */}
          {footer && (
            animateHeight ? (
              <motion.div
                layout
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                className="mt-5 w-full"
              >
                {footer}
              </motion.div>
            ) : (
              <div className="mt-5 w-full">{footer}</div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
