"use client";

/**
 * The Business view of the Demo hub: every business onboarding flow spelled out, the way the Personal view
 * spells out activation and signup. Each row deep-links with `?scenario=` (new business, enrolment), `?ref=`
 * (status tracker) or `?step=` (user activation).
 *
 *   New business        a company that does not bank with GCB yet applies (`/business/signup`)
 *   Existing GCB company  a company that already holds accounts enrols onto internet banking
 *   Track an application  the applicant checks progress, and bank staff review it (admin portal)
 *   Business users      each person on the mandate accepts their invitation and sets up a login
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BUSINESS_SIGNUP_SCENARIOS } from "@/lib/signup-business";
import { CORPORATE_ENROLMENT_SCENARIOS } from "@/lib/corporate-enrolment";
import { INITIAL_ENROLMENTS } from "@/lib/enrolment-store";

type StepRow = (href: string, label: string, n: number, active: boolean) => ReactNode;

/** A business user's invitation is four steps; the PIN screen and its confirmation share the fourth. */
const USER_ACTIVATION_STEPS = [
  { id: "ghana_card", label: "Accept Invitation" },
  { id: "otp", label: "Confirm Your Code" },
  { id: "password", label: "Create Your Password" },
  { id: "pin", label: "Set Your PIN" },
  { id: "confirm_pin", label: "Confirm Your PIN" },
] as const;

function sentence(status: string) {
  const words = status.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function BusinessFlowSections({
  stepRow,
  go,
  signInAs,
  pathname,
  scenario,
  step,
  reference,
}: {
  stepRow: StepRow;
  go: (route: string) => void;
  /** Sign in as a demo user and open `to` (or that user's home). */
  signInAs: (actorId: string, to?: string) => void;
  pathname: string | null;
  scenario: string | null;
  step: string | null;
  reference: string | null;
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
        <span className="text-[13.5px] text-foreground">{title}</span>
        <span className="text-[12px] text-muted-foreground">{subtitle}</span>
      </button>
    </li>
  );

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">New business</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Not a GCB customer yet</div>
        <ol className="flex flex-col">
          {BUSINESS_SIGNUP_SCENARIOS.map((s, i) =>
            stepRow(
              `/business/signup?scenario=${s.id}`,
              s.label,
              i + 1,
              pathname === "/business/signup" && scenario === s.id,
            ),
          )}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Existing GCB company</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Enrol onto internet banking</div>
        <ol className="flex flex-col">
          {CORPORATE_ENROLMENT_SCENARIOS.map((s) => {
            const n = Number(s.label.match(/^Step (\d+)/)?.[1] ?? 0);
            return stepRow(
              `/business/signup/enrol?scenario=${s.id}`,
              s.label.replace(/^Step \d+ · /, ""),
              n,
              pathname === "/business/signup/enrol" && scenario === s.id,
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Track an application</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Applicant, then bank staff</div>
        <ol className="flex flex-col">
          {row("Find by reference", "Reference and mobile number", () => go("/business/signup/status"), pathname === "/business/signup/status" && !reference)}
          {INITIAL_ENROLMENTS.map((app) =>
            row(
              app.companyName,
              `${app.reference} · ${sentence(app.status)}`,
              () => go(`/business/signup/status?ref=${encodeURIComponent(app.reference)}`),
              pathname === "/business/signup/status" && reference === app.reference,
            ),
          )}
          {row("Staff review queue", "Signs in as a relationship manager", () => signInAs("u-rm", "/admin/enrolments"))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Business users</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Accepting an invitation</div>
        <ol className="flex flex-col">
          {USER_ACTIVATION_STEPS.map((s, i) =>
            stepRow(`/activate?invite=1&step=${s.id}`, s.label, i + 1, pathname === "/activate" && step === s.id && scenario !== "corp-invite-expired"),
          )}
          {row("Invitation expired", "The link has run out", () => go("/activate?invite=1&expired=1"))}
        </ol>
      </section>
    </div>
  );
}
