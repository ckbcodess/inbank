"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft } from "@/components/ui/icons";
import Link from "next/link";
import AuthHeader from "./AuthHeader";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { cn } from "@/lib/utils";
import { SmoothHeight } from "@/components/ui/smooth-height";
import { SPRING } from "@/lib/motion";
import { StepBar } from "@/components/ui/step-bar";

interface AuthLayoutProps {
  title?: string;
  titleClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  /** A second heading that takes the title's place, in the same spot, while `show` is true (cross-fade, same height). */
  swap?: { show: boolean; title: ReactNode; description?: ReactNode };
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
  /** Ignored: every step shares one column width. Still accepted so existing screens compile. */
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
  /** "top" keeps multi-step titles fixed; "center" (default) suits short single-screen pages like login. */
  vAlign?: "top" | "center";
  /** Vertical padding of the card, as Tailwind `py-*` classes. Defaults to `py-10 sm:py-12`, the shared onboarding rhythm. */
  padY?: string;
  /** Space under the title block, as a Tailwind `mb-*` class. Defaults to `mb-6 sm:mb-10`. */
  headerGap?: string;
}

export default function AuthLayout({
  title,
  titleClassName,
  description,
  descriptionClassName,
  swap,
  children,
  align = "left",
  onBack,
  backHref,
  backLabel = "Go back",
  icon: Icon,
  footer,
  stepProgress,
  showLogo = false,
  animateHeight = false,
  vAlign = "center",
  padY,
  headerGap,
}: AuthLayoutProps) {
  // One look: the quiet column (fixed width, top-anchored titles, plain back chevron) inside the card, over the banner.
  const maxWidthClass = "max-w-[500px]";

  const hasBack = Boolean(onBack || backHref);
  const cardClassName = cn("rounded-3xl border border-border/80 bg-card-auth/95 px-5 sm:px-6", padY ?? "py-10 sm:py-12", "shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden");


  return (
    <div
      data-auth-shell
      data-auth-quiet=""
      className="relative flex min-h-dvh w-full flex-col bg-background text-foreground transition-colors selection:bg-primary/30 selection:text-foreground overflow-x-hidden"
    >
      {/* Top Fixed Header */}
      <AuthHeader />

      {/* Decorative Brand Hero Banner Background */}
      <div className="absolute top-14 inset-x-0 h-[240px] sm:h-[280px] lg:h-[300px] overflow-hidden pointer-events-none z-0">
        <Image
          src="/images/auth-banner.webp"
          alt="GCB Internet Banking"
          fill
          className="object-cover object-center in-data-[app=business]:hidden"
          priority
        />
        {/* Business banking has no banner image yet; this holds the space until it does. */}
        <div className="hidden size-full bg-muted in-data-[app=business]:block" />
      </div>

      {/* Main Container - Vertically and horizontally centered in available viewport */}
      <main
        className={cn(
          "relative z-10 flex min-h-[calc(100dvh-4rem)] w-full justify-center px-3 sm:px-5 py-6 mt-12",
          // Quiet screens anchor to the top so the title never jumps when a step's height changes.
          vAlign === "top" ? "items-start pt-10 sm:pt-[12vh]" : "items-center"
        )}
      >
        <div className={`w-full my-auto ${maxWidthClass}`}>
          {/* Card Inner Content */}
          {(() => {
            const cardInner = (
              <>
                {/* In-Card Back Navigation Trigger */}
                {hasBack && (
                  <div className={stepProgress ? "mb-5 -ml-1 flex items-center" : "mb-10 -ml-1 flex items-center"}>
                    {backHref ? (
                      <Link
                        href={backHref}
                        aria-label={backLabel}
                        className="group inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <div className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
                          <ChevronLeft size={16} className="transition-transform" />
                        </div>
                        <span>Back</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onBack}
                        aria-label={backLabel}
                        className="group inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                      >
                        <div className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
                          <ChevronLeft size={16} className="transition-transform" />
                        </div>
                        <span>Back</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Step Progress Segments (Full Width across the card) */}
                {stepProgress && (
                  <StepBar current={stepProgress.current} total={stepProgress.total} className="mb-6" />
                )}

                {/* Optional Step Icon */}
                {Icon && (
                  <div className={cn("mb-5 flex", align === "center" ? "justify-center" : "justify-start sm:justify-center")}>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
                      <Icon size={22} aria-hidden="true" />
                    </div>
                  </div>
                )}

                {/* Optional GCB Logo (only if explicitly enabled) */}
                {showLogo && (
                  <div className={cn("mb-5 flex", align === "center" ? "justify-center" : "justify-start sm:justify-center")}>
                    <GCBLogo className="h-8 w-auto text-foreground" />
                  </div>
                )}

                {/* Title & Description with alignment */}
                {(title || description) && (
                  <div
                    className={cn(
                      headerGap ?? "mb-6 sm:mb-10",
                      align === "center" ? "text-center mx-auto max-w-[440px]" : "text-left sm:text-center sm:mx-auto sm:max-w-[440px]"
                    )}
                  >
                    {(() => {
                      const heading = (
                        <>
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
                                "mt-2 text-[13px] leading-relaxed text-balance text-muted-foreground",
                                descriptionClassName
                              )}
                            >
                              {description}
                            </div>
                          )}
                        </>
                      );
                      if (!swap) return heading;
                      const layer = "col-start-1 row-start-1 transition-[opacity,transform,filter] duration-reveal ease-settle";
                      const hidden = "pointer-events-none translate-y-1 opacity-0 blur-[2px]";
                      return (
                        <div className="grid">
                          <div className={cn(layer, swap.show && hidden)} aria-hidden={swap.show} inert={swap.show}>
                            {heading}
                          </div>
                          <div className={cn(layer, !swap.show && hidden)} aria-hidden={!swap.show} inert={!swap.show}>
                            <h1
                              className={cn(
                                "tabular text-[21px] sm:text-[23px] font-medium tracking-[-0.015em] text-foreground leading-snug",
                                titleClassName
                              )}
                            >
                              {swap.title}
                            </h1>
                            {swap.description && (
                              <div
                                className={cn(
                                  "mt-2 text-[13px] leading-relaxed text-balance text-muted-foreground",
                                  descriptionClassName
                                )}
                              >
                                {swap.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
                className="mt-4 w-full"
              >
                {footer}
              </motion.div>
            ) : (
              <div className="mt-4 w-full">{footer}</div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
