"use client";

/**
 * The Business view of the Demo hub: two journeys linking the flows:
 *   Business application (companies and sole proprietors, one form): door, steps, staff queue
 *   Business users: 6 activation steps + expired + lockout
 */

import type { ReactNode } from "react";
import { CORPORATE_ENROLMENT_SCENARIOS } from "@/lib/corporate-enrolment";
import { cn } from "@/lib/utils";

type StepRow = (href: string, label: string, n: number, active: boolean) => ReactNode;

const BUSINESS_USER_STEPS = [
  { id: "invite", label: "Accept Invitation" },
  { id: "identity", label: "Confirm Identity" },
  { id: "otp", label: "Confirm Code" },
  { id: "password", label: "Create Password" },
  { id: "pin", label: "Set PIN" },
  { id: "confirm_pin", label: "Confirm PIN" },
] as const;

const ENROLMENT_STEPS = CORPORATE_ENROLMENT_SCENARIOS.filter((s) => !s.kind);
const ENROLMENT_OTHER = CORPORATE_ENROLMENT_SCENARIOS.filter((s) => s.kind);

export function BusinessFlowSections({
  stepRow,
  go,
  signInAs,
  pathname,
  step,
  outcome,
  expired,
  type,
  scenario,
}: {
  stepRow: StepRow;
  go: (route: string) => void;
  signInAs: (actorId: string, to?: string) => void;
  pathname: string | null;
  step?: string | null;
  outcome?: string | null;
  expired?: string | null;
  type?: string | null;
  scenario?: string | null;
}) {
  const row = (title: string, subtitle: string, onClick: () => void, active = false) => (
    <li key={title + subtitle}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors cursor-pointer",
          active ? "bg-muted" : "hover:bg-muted/60",
        )}
      >
        <span className="text-[13px] text-foreground">{title}</span>
        <span className="text-[12px] text-muted-foreground">{subtitle}</span>
      </button>
    </li>
  );

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {/* 1. Business application: companies and sole proprietors fill in one form */}
      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Business application</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Companies and sole proprietors</div>
        <ol className="flex flex-col">
          {row(
            "Account holder or new to GCB",
            "The front door",
            () => go("/business/signup"),
            pathname === "/business/signup" && type !== "company" && step !== "type",
          )}
          {row(
            "Choose business type",
            "Sole proprietor or company",
            () => go("/business/signup?step=type"),
            pathname === "/business/signup" && step === "type",
          )}
          {ENROLMENT_STEPS.map((s, i) =>
            stepRow(
              `/business/signup/enrol?scenario=${s.id}`,
              s.label,
              i + 1,
              pathname === "/business/signup/enrol" && scenario === s.id,
            ),
          )}
          {ENROLMENT_OTHER.map((s) =>
            row(
              s.label,
              "Same form, sole proprietor wording",
              () => go(`/business/signup/enrol?scenario=${s.id}`),
              pathname === "/business/signup/enrol" && scenario === s.id,
            ),
          )}
          {row(
            "Bank review queue",
            "Signs in as a relationship manager",
            () => signInAs("u-rm", "/admin/enrolments"),
            pathname === "/admin/enrolments",
          )}
        </ol>
      </section>

      {/* 2. Business users */}
      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Business users</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Invited user activation</div>
        <ol className="flex flex-col">
          {BUSINESS_USER_STEPS.map((s, i) =>
            stepRow(
              `/business/activate?step=${s.id}`,
              s.label,
              i + 1,
              pathname === "/business/activate" && step === s.id && !expired && !outcome,
            ),
          )}
          {row(
            "Invitation expired",
            "The link has run out",
            () => go("/business/activate?expired=1"),
            pathname === "/business/activate" && expired === "1",
          )}
          {row(
            "Identity not confirmed",
            "Three mismatches / lockout",
            () => go("/business/activate?outcome=locked"),
            pathname === "/business/activate" && outcome === "locked",
          )}
        </ol>
      </section>
    </div>
  );
}
