"use client";

/**
 * Shared shell for the pre-authentication screens (S01 Login, S02 MFA,
 * Activation). These sit outside both shells and were each carrying their own
 * copy of the split panel; one component keeps them from drifting apart.
 *
 * The left panel's colour is deliberately literal rather than tokenised — it is
 * the pre-existing brand plate from Login and is reproduced here unchanged so
 * the three screens stay pixel-identical.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AuthLayoutProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
  /** Rendered under the card — links, reassurance, demo affordances. */
  footer?: ReactNode;
  /** Widen for steps that carry a list of choices rather than two fields. */
  width?: "default" | "wide";
}

export default function AuthLayout({
  icon: Icon,
  title,
  description,
  children,
  footer,
  width = "default",
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left Side: Solid black background with (NIBS- First Draft) */}
      <div
        className="flex min-h-[250px] w-full shrink-0 flex-col items-center justify-center p-8 text-white lg:min-h-screen lg:w-1/2 lg:p-12"
        style={{ backgroundColor: "#000000", color: "#ffffff" }}
      >
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            (NIBS- First Draft)
          </h1>
        </div>
      </div>

      {/* Right Side: Form content */}
      <div className="flex min-h-screen w-full grow items-center justify-center bg-[var(--surface)] px-5 py-12 lg:w-1/2 lg:px-12">
        <div className={width === "wide" ? "w-full max-w-[460px]" : "w-full max-w-[400px]"}>
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
            </div>
            <h2 className="text-[24px] leading-tight tracking-[-0.02em] text-foreground">{title}</h2>
            <div className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{description}</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            {children}
          </div>

          {footer}
        </div>
      </div>
    </div>
  );
}
