"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import AuthHeader from "./AuthHeader";

interface AuthLayoutProps {
  title?: string;
  description?: ReactNode;
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
  description,
  children,
  icon: Icon,
  footer,
  width = "default",
  stepProgress,
  showLogo = true,
}: AuthLayoutProps) {
  const maxWidthClass =
    width === "wide"
      ? "max-w-[560px]"
      : width === "compact"
      ? "max-w-[440px]"
      : "max-w-[500px]";

  return (
    <div className="relative min-h-screen w-full bg-[#f8f9fa] dark:bg-background text-foreground transition-colors selection:bg-[#F2B200]/30 selection:text-foreground">
      {/* Top Fixed Header */}
      <AuthHeader />

      {/* Hero Banner Area */}
      <div className="relative mt-16 h-[260px] w-full overflow-hidden sm:h-[300px] lg:h-[340px]">
        {/* Banner image with overlay */}
        <div className="absolute inset-0">
          <Image
            src="/images/auth-banner.png"
            alt="GCB Online Banking"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Subtle gold-to-dark gradient overlay matching brand */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#e5a500]/60 via-transparent to-black/20 dark:from-black/70 dark:via-black/40 dark:to-black/80" />
        </div>

        {/* Carousel indicators top left */}
        <div className="absolute top-8 left-8 sm:left-14 flex items-center gap-1.5 z-10">
          <div className="h-1.5 w-7 rounded-full bg-white shadow-sm" />
          <div className="h-1.5 w-3.5 rounded-full bg-white/50 backdrop-blur-xs" />
          <div className="h-1.5 w-3.5 rounded-full bg-white/50 backdrop-blur-xs" />
          <div className="h-1.5 w-3.5 rounded-full bg-white/50 backdrop-blur-xs" />
        </div>
      </div>

      {/* Main Container - Floating Over Banner */}
      <main className="relative -mt-24 sm:-mt-32 lg:-mt-36 z-20 mx-auto w-full px-6 pb-24 sm:px-8 flex flex-col items-center">
        <div className={`w-full ${maxWidthClass} transition-all duration-300`}>
          {/* Central Card */}
          <div className="rounded-3xl border border-black/5 bg-white/95 dark:bg-card/95 p-7 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
            {/* Step Progress Segments (8 segments in Figma) */}
            {stepProgress && (
              <div className="mb-6 flex items-center gap-1.5 px-2">
                {Array.from({ length: stepProgress.total }).map((_, i) => {
                  const isActive = i + 1 <= stepProgress.current;
                  const isCurrent = i + 1 === stepProgress.current;
                  return (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        isCurrent
                          ? "bg-[#E5A500] dark:bg-[#F2B200]"
                          : isActive
                          ? "bg-[#E5A500]/70 dark:bg-[#F2B200]/70"
                          : "bg-black/10 dark:bg-white/10"
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* GCB Eagle Emblem or Step Icon at Card Top */}
            {Icon ? (
              <div className="mb-5 flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                </div>
              </div>
            ) : showLogo ? (
              <div className="mb-5 flex justify-center">
                <div className="relative h-10 w-12 transition-transform hover:scale-105">
                  <Image
                    src="/images/gcb-logo.svg"
                    alt="GCB Bank"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            ) : null}

            {/* Title & Description */}
            {(title || description) && (
              <div className="mb-7 text-center">
                {title && (
                  <h1 className="text-[21px] sm:text-[23px] font-semibold tracking-[-0.015em] text-foreground">
                    {title}
                  </h1>
                )}
                {description && (
                  <div className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                )}
              </div>
            )}

            {/* Form & Actions */}
            {children}
          </div>

          {/* Optional Footer Elements */}
          {footer && <div className="mt-5 w-full">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
