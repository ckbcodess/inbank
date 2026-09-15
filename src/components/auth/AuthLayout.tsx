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
    <div className="relative flex min-h-screen w-full flex-col bg-[#f8f9fa] dark:bg-background text-foreground transition-colors selection:bg-[#F2B200]/30 selection:text-foreground overflow-x-hidden">
      {/* Top Fixed Header */}
      <AuthHeader />

      {/* Decorative Brand Hero Banner Background (absolute layer, does not push content down) */}
      <div className="absolute top-16 inset-x-0 h-[220px] sm:h-[260px] lg:h-[280px] overflow-hidden pointer-events-none z-0">
        <Image
          src="/images/auth-banner.png"
          alt="GCB Online Banking"
          fill
          className="object-cover object-center opacity-90"
          priority
        />
        {/* Gold to dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#e5a500]/50 via-transparent to-black/20 dark:from-black/70 dark:via-black/40 dark:to-black/80" />
        {/* Fade smoothly into page background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f8f9fa] dark:to-background" />
      </div>

      {/* Main Container - Centered Vertically & Horizontally in Viewport */}
      <main className="relative z-10 flex flex-1 w-full items-center justify-center px-4 sm:px-6 pt-20 pb-8 sm:pt-20 sm:pb-8">
        <div className={`w-full ${maxWidthClass} transition-all duration-300`}>
          {/* Central Card */}
          <div className="rounded-3xl border border-black/5 bg-white/95 dark:bg-card/95 p-6 sm:p-8 lg:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
            {/* Step Progress Segments */}
            {stepProgress && (
              <div className="mb-5 flex items-center gap-1.5 px-2">
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
              <div className="mb-4 flex justify-center">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
                  <Icon size={22} strokeWidth={2} aria-hidden="true" />
                </div>
              </div>
            ) : showLogo ? (
              <div className="mb-4 flex justify-center">
                <div className="relative h-9 w-11 transition-transform hover:scale-105">
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
              <div className="mb-5 text-center">
                {title && (
                  <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em] text-foreground">
                    {title}
                  </h1>
                )}
                {description && (
                  <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                )}
              </div>
            )}

            {/* Form & Actions */}
            {children}
          </div>

          {/* Optional Footer Elements */}
          {footer && <div className="mt-4 w-full">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
