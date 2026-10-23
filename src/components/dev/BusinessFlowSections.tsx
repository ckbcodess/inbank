"use client";

/**
 * The Business view of the Demo hub: three journeys linking the new flows:
 *   Sole proprietor: 7 steps + 3 off-happy-path outcomes
 *   Company: business type chooser, online application (6 steps + outcomes), status page, staff queue
 *   Business users: 6 activation steps + expired + lockout
 */

import type { ReactNode } from "react";
import { CORPORATE_ENROLMENT_SCENARIOS } from "@/lib/corporate-enrolment";
import { cn } from "@/lib/utils";

type StepRow = (href: string, label: string, n: number, active: boolean) => ReactNode;

const SOLE_PROPRIETOR_STEPS = [
  { id: "ghana_card", label: "Verify Identity" },
  { id: "selfie", label: "Selfie Match" },
  { id: "review_details", label: "Confirm Business" },
  { id: "otp", label: "Confirm Code" },
  { id: "password", label: "Create Password" },
  { id: "pin", label: "Set PIN" },
  { id: "confirm_pin", label: "Confirm PIN" },
] as const;

const BUSINESS_USER_STEPS = [
  { id: "invite", label: "Accept Invitation" },
  { id: "ghana_card", label: "Confirm Identity" },
  { id: "otp", label: "Confirm Code" },
  { id: "password", label: "Create Password" },
  { id: "pin", label: "Set PIN" },
  { id: "confirm_pin", label: "Confirm PIN" },
] as const;

const ENROLMENT_STEPS = CORPORATE_ENROLMENT_SCENARIOS.filter((s) => s.step && !s.account);
const ENROLMENT_OTHER = CORPORATE_ENROLMENT_SCENARIOS.filter((s) => s.outcome || s.account);

const STATUS_DEMOS = [
  { label: "waiting for letter", ref: "ENR-2026-0821" },
  { label: "checking signatures", ref: "ENR-2026-0814" },
  { label: "returned", ref: "ENR-2026-0790" },
  { label: "approved", ref: "ENR-2026-0720" },
] as const;

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
  ref_,
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
  ref_?: string | null;
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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* 1. Sole Proprietor */}
      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Sole proprietor</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Self-service onboarding</div>
        <ol className="flex flex-col">
          {SOLE_PROPRIETOR_STEPS.map((s, i) =>
            stepRow(
              `/business/signup/sole-proprietor?step=${s.id}`,
              s.label,
              i + 1,
              pathname === "/business/signup/sole-proprietor" && step === s.id && !outcome,
            ),
          )}
          {row(
            "ID not verified",
            "Link Ghana Card prompt",
            () => go("/business/signup/sole-proprietor?outcome=not-verified"),
            pathname === "/business/signup/sole-proprietor" && outcome === "not-verified",
          )}
          {row(
            "No business account",
            "Branch assistance required",
            () => go("/business/signup/sole-proprietor?outcome=no-account"),
            pathname === "/business/signup/sole-proprietor" && outcome === "no-account",
          )}
          {row(
            "Registered as a company",
            "Company setup prompt",
            () => go("/business/signup/sole-proprietor?outcome=company"),
            pathname === "/business/signup/sole-proprietor" && outcome === "company",
          )}
        </ol>
      </section>

      {/* 2. Company */}
      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Company</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Online application</div>
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
          {row(
            "New to GCB",
            "No business account yet: request a call",
            () => go("/business/signup/new-to-gcb"),
            pathname === "/business/signup/new-to-gcb",
          )}
          {row(
            "Set up your company",
            "Apply online, track, or find a branch",
            () => go("/business/signup?type=company"),
            pathname === "/business/signup" && type === "company",
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
              s.outcome ? "Off the happy path" : "Corporate Banking Team reviews",
              () => go(`/business/signup/enrol?scenario=${s.id}`),
              pathname === "/business/signup/enrol" && scenario === s.id,
            ),
          )}
          {STATUS_DEMOS.map((d) =>
            row(
              `Status: ${d.label}`,
              d.ref,
              () => go(`/business/signup/status?ref=${d.ref}`),
              pathname === "/business/signup/status" && ref_ === d.ref,
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

      {/* 3. Business users */}
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
