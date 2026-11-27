"use client";

/**
 * The business request (/business/signup/enrol) on a wide screen: the steps down the left, the form beside them
 * (designer, 2026-11-26: layout 2 of the five desktop explorations, without its summary panel). It is only a frame:
 * the page owns the flow and hands in the current step's content and its button, so the card (phones, narrow
 * windows, the Dev Mode switch) and this layout behave the same.
 *
 * A finished step can be reopened from the list; steps not reached yet can't be. Back, above the title, leaves the
 * form for the business type question; Previous, beside the button, goes one step back and isn't shown on the first
 * step (designer, 2026-11-26).
 */

import type { ReactNode } from "react";
import { Check, ChevronLeft } from "@/components/ui/icons";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShellStep {
  /** Short name in the step list: "Accounts". */
  nav: string;
  /** The step's title: "Accounts". */
  title: string;
}

export default function EnrolmentDesktopShell({
  steps,
  current,
  reached,
  onGoTo,
  description,
  onExit,
  onPrevious,
  action,
  children,
}: {
  steps: ShellStep[];
  current: number;
  /** The furthest step opened so far; steps before it are done and can be returned to. */
  reached: number;
  onGoTo: (step: number) => void;
  description: string;
  /** Back, above the title: leaves the form. */
  onExit: () => void;
  /** Previous, beside the button: one step back. Left out on the first step. */
  onPrevious?: () => void;
  /** The step's main button. */
  action: ReactNode;
  /** The step's content. */
  children: ReactNode;
}) {
  const step = steps[current];
  const done = (i: number) => i < reached && i !== current;
  const canGo = (i: number) => i <= reached && i !== current;

  return (
    <div data-auth-shell className="shell-backdrop min-h-dvh text-foreground">
      <AuthHeader />
      <div className="flex h-dvh pt-14">
        <nav
          aria-label="Steps"
          className="w-64 shrink-0 border-r border-border px-8 py-12"
        >
          <ol className="flex flex-col">
            {steps.map((s, i) => (
              <li key={s.nav} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-medium",
                      done(i)
                        ? "border-primary bg-primary text-primary-foreground"
                        : i === current
                          ? "border-foreground text-foreground"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {done(i) ? <Check size={12} aria-hidden="true" /> : i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      className="my-1 min-h-4 w-px flex-1 bg-border"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <button
                  type="button"
                  disabled={!canGo(i)}
                  onClick={() => onGoTo(i)}
                  aria-current={i === current ? "step" : undefined}
                  className={cn(
                    "pt-0.5 pb-5 text-left",
                    canGo(i) && "cursor-pointer hover:underline",
                  )}
                >
                  <span
                    className={cn(
                      "block text-body",
                      i === current
                        ? "font-medium text-foreground"
                        : i <= reached
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {s.nav}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* The form scrolls; the row with Previous and the step's button stays pinned to the bottom of the screen
            (designer, 2026-11-26), so the next move is always in view however long the step is. */}
        <main className="shell-card flex min-w-0 flex-1 flex-col">
          <div className="custom-scrollbar scroll-fade min-h-0 flex-1 overflow-y-auto px-12 py-12">
            <div className="mx-auto flex max-w-[600px] flex-col gap-8">
              <button
                type="button"
                onClick={onExit}
                aria-label="Back to the business type"
                className="-mb-2 inline-flex cursor-pointer items-center gap-2 self-start text-body font-medium text-muted-foreground transition-colors duration-hover hover:text-foreground"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Back
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-h2 text-foreground">{step.title}</h1>
                <p className="text-body text-muted-foreground">{description}</p>
              </div>
              {children}
            </div>
          </div>
          <div className="shrink-0 border-t border-border px-12 py-5">
            <div className="mx-auto flex max-w-[600px] items-center justify-between gap-4">
              {onPrevious ? (
                // Outline, the same height as the step's button beside it (designer, 2026-11-26).
                <Button variant="outline" size="xl" onClick={onPrevious} className="min-w-40">
                  Previous
                </Button>
              ) : (
                <span />
              )}
              {action}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
