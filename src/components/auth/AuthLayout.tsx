"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
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
  /** Show the GCB Eagle mark at the top of the card */
  showLogo?: boolean;
}

export default function AuthLayout({
  title,
  titleClassName,
  description,
  descriptionClassName,
  children,
  icon: Icon,
  footer,
  width = "default",
  stepProgress,
  showLogo = true,
}: AuthLayoutProps) {
  const maxWidthClass =
    width === "wide"
      ? "max-w-[620px]"
      : width === "compact"
      ? "max-w-[500px]"
      : "max-w-[540px]";

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
          {/* Central Card with generous breathing room and smooth height morphing */}
          <motion.div
            layout
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="rounded-[16px] border border-border/80 bg-card/95 px-6 py-10 sm:px-8 sm:py-12 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden"
          >
            {/* Step Progress Segments */}
            {stepProgress && (
              <div className="mb-8 flex items-center gap-2 px-1">
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

            {/* GCB Eagle Emblem or Step Icon at Card Top */}
            {Icon ? (
              <div className="mb-8 flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-xs">
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                </div>
              </div>
            ) : showLogo ? (
              <div className="mb-8 flex justify-center">
                <div className="flex items-center justify-center transition-transform hover:scale-105">
                  <GCBLogo className="h-10 w-auto text-foreground" />
                </div>
              </div>
            ) : null}

            {/* Dynamic Step Content: Automatically and smoothly morphs height */}
            <SmoothHeight duration={0.35}>
              {/* Title & Description */}
              {(title || description) && (
                <div className="mb-10 text-center sm:mb-12">
                  {title && (
                    <h1
                      className={cn(
                        "text-[20px] sm:text-[22px] font-medium tracking-[-0.015em] text-foreground leading-snug",
                        titleClassName
                      )}
                    >
                      {title}
                    </h1>
                  )}
                  {description && (
                    <div
                      className={cn(
                        "mt-2 text-[13.5px] leading-relaxed text-muted-foreground max-w-[420px] mx-auto",
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
            </SmoothHeight>
          </motion.div>

          {/* Optional Footer Elements — glides smoothly beneath the morphing card */}
          {footer && (
            <motion.div
              layout
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="mt-5 w-full"
            >
              {footer}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
