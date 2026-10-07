"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import AuthHeader from "./AuthHeader";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { cn } from "@/lib/utils";
import { SmoothHeight } from "@/components/ui/smooth-height";
import EagleBackdrop from "@/components/brand/EagleBackdrop";
import { AUTH_LOOK_LABEL, useAuthLayoutStore } from "@/lib/auth-layout-store";
import { SPRING } from "@/lib/motion";

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
  /** "quiet" drops the banner and card chrome: content sits directly on the page. "card" is the older boxed look. "hybrid" (default) is the quiet layout (fixed column, top anchored, plain back chevron) inside the card, over the banner, without the eagle. */
  variant?: "card" | "quiet" | "hybrid";
  /** Quiet only. "top" (default) keeps multi-step titles fixed; "center" suits short single-screen pages like login. */
  vAlign?: "top" | "center";
  /** Quiet only. Faint dotted golden eagle behind the content. */
  eagle?: boolean;
  /** Vertical padding of the card, as Tailwind `py-*` classes. Defaults to `py-10 sm:py-14`, the shared onboarding rhythm. */
  padY?: string;
  /** Space under the title block, as a Tailwind `mb-*` class. Defaults to `mb-8 sm:mb-10`. */
  headerGap?: string;
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
  variant: variantProp = "hybrid",
  vAlign = "center",
  eagle: eagleProp = false,
  padY,
  headerGap,
}: AuthLayoutProps) {
  // Test switch: the saved look overrides the page's variant. Read after mount to avoid a hydration mismatch.
  const look = useAuthLayoutStore((s) => s.look);
  const cycleLook = useAuthLayoutStore((s) => s.cycle);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    void useAuthLayoutStore.persist.rehydrate();
    setMounted(true);
  }, []);
  const variant: NonNullable<AuthLayoutProps["variant"]> = !mounted
    ? variantProp
    : look === "new" ? "quiet" : look === "classic" ? "card" : "hybrid";
  const eagle = mounted && look === "new" ? true : eagleProp;
  const quiet = variant === "quiet"; // no banner, no card
  const newLayout = variant !== "card"; // the new column, back placement and anchoring
  // Quiet screens share one column width so steps never jump sideways.
  const maxWidthClass = newLayout
    ? "max-w-[500px]"
    : width === "wide"
      ? "max-w-[620px]"
      : width === "compact"
      ? "max-w-[500px]"
      : "max-w-[540px]";

  const hasBack = Boolean(onBack || backHref);
  const cardClassName = quiet
    ? cn("px-1", padY ?? "py-10 sm:py-14")
    : cn("rounded-[20px] border border-border/80 bg-card-auth/95 px-6 sm:px-8", padY ?? "py-10 sm:py-14", "shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden");


  return (
    <div
      data-auth-shell
      data-auth-quiet={newLayout ? "" : undefined}
      className="relative flex min-h-dvh w-full flex-col bg-background text-foreground transition-colors selection:bg-primary/30 selection:text-foreground overflow-x-hidden"
    >
      {/* Top Fixed Header */}
      <AuthHeader />

      {/* Decorative Brand Hero Banner Background */}
      {!quiet && <div className="absolute top-16 inset-x-0 h-[240px] sm:h-[280px] lg:h-[300px] overflow-hidden pointer-events-none z-0">
        <Image
          src="/images/auth-banner.webp"
          alt="GCB Internet Banking"
          fill
          className="object-cover object-center"
          priority
        />
      </div>}

      {quiet && eagle && <EagleBackdrop />}

      {/* Main Container - Vertically and horizontally centered in available viewport */}
      <main
        className={cn(
          "relative z-10 flex min-h-[calc(100dvh-4rem)] w-full justify-center px-4 sm:px-6 py-8 mt-16",
          // Quiet screens anchor to the top so the title never jumps when a step's height changes.
          newLayout && vAlign === "top" ? "items-start pt-10 sm:pt-[12vh]" : "items-center"
        )}
      >
        <div className={`w-full my-auto ${maxWidthClass}`}>
          {/* Card Inner Content */}
          {(() => {
            const cardInner = (
              <>
                {/* In-Card Back Navigation Trigger */}
                {hasBack && (
                  <div className={newLayout ? (stepProgress ? "mb-6 -ml-1 flex items-center" : "mb-10 -ml-1 flex items-center") : "mb-5 flex items-center"}>
                    {backHref ? (
                      <Link
                        href={backHref}
                        aria-label={backLabel}
                        className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                      >
                        <div className={newLayout ? "flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground" : "flex size-7.5 items-center justify-center rounded-lg border border-border/70 bg-muted/30 transition-colors group-hover:bg-muted group-hover:border-border"}>
                          <ChevronLeft size={16} strokeWidth={2.2} className="transition-transform" />
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
                        <div className={newLayout ? "flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground" : "flex size-7.5 items-center justify-center rounded-lg border border-border/70 bg-muted/30 transition-colors group-hover:bg-muted group-hover:border-border"}>
                          <ChevronLeft size={16} strokeWidth={2.2} className="transition-transform" />
                        </div>
                        <span>Back</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Step Progress Segments (Full Width across the card) */}
                {stepProgress && (
                  <div className={cn("flex items-center gap-2 px-0.5", newLayout ? "mb-8" : "mb-6")}>
                    {Array.from({ length: stepProgress.total }).map((_, i) => {
                      const isActive = i + 1 <= stepProgress.current;
                      const isCurrent = i + 1 === stepProgress.current;
                      return (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition duration-300 ${
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

                {/* Optional Step Icon */}
                {Icon && (
                  <div className={cn("mb-6 flex", align === "center" ? "justify-center" : "justify-start sm:justify-center")}>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
                      <Icon size={22} strokeWidth={2} aria-hidden="true" />
                    </div>
                  </div>
                )}

                {/* Optional GCB Logo (only if explicitly enabled) */}
                {showLogo && (
                  <div className={cn("mb-6 flex", align === "center" ? "justify-center" : "justify-start sm:justify-center")}>
                    <GCBLogo className="h-9 w-auto text-foreground" />
                  </div>
                )}

                {/* Title & Description with alignment */}
                {(title || description) && (
                  <div
                    className={cn(
                      headerGap ?? "mb-8 sm:mb-10",
                      align === "center" ? "text-center mx-auto max-w-[440px]" : "text-left sm:text-center sm:mx-auto sm:max-w-[440px]"
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
                          "mt-1.5 text-[13.5px] leading-relaxed text-balance text-muted-foreground",
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
                transition={SPRING.settle}
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
                transition={SPRING.settle}
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

      <button
        type="button"
        onClick={cycleLook}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-border bg-card-auth/95 px-3 py-1.5 text-[12px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground active:scale-95 cursor-pointer"
      >
        Layout: {AUTH_LOOK_LABEL[mounted ? look : "hybrid"]}
      </button>
    </div>
  );
}
