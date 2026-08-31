"use client";

/**
 * Get Started — the funnel in front of activation and both signup flows.
 *
 * Login previously listed all three as parallel, permanently-visible cards
 * alongside the sign-in form: activate, open a personal account, open a
 * business account. Four live options on one screen forces the visitor to
 * self-diagnose which bucket they're in before they've done anything — a
 * decision the screen should be making easy, not asking them to make cold.
 *
 * This replaces that with two sequential questions, each phrased as the
 * customer would answer it (not "activate" — "do you already bank with us?"):
 *
 *   Do you already bank with GCB?
 *     yes → /activate directly, no second question
 *     no  → Opening this for yourself or a business?
 *             myself   → /signup
 *             business → /signup/business
 *
 * A wrong tap here is deliberately cheap to recover from rather than
 * impossible to make: this page does no lookups of its own, it only routes.
 * The real detection already lives one screen downstream — activate's
 * identify step recognises "no match" and offers /signup, signup's Ghana
 * Card lookup recognises an existing customer and offers /activate, and
 * signup/business's TIN lookup recognises an existing company and points at
 * its Corporate Admin instead of a duplicate application. So the cost of
 * guessing wrong here is one more tap on the very next screen, not a dead
 * end — which is what makes a two-question gate safe to keep this short.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, HelpCircle, Landmark, Sparkles, UserPlus } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import DevStatePanel from "@/components/states/DevStatePanel";

type GateStep = "relationship" | "type";

const GATE_STEPS: readonly GateStep[] = ["relationship", "type"];
const GATE_STEP_LABELS: Record<GateStep, string> = {
  relationship: "Already bank with GCB?",
  type: "Individual or business?",
};

export default function GetStartedPage() {
  const router = useRouter();
  const [step, setStep] = useState<GateStep>("relationship");

  const applyScenario = useCallback((id: string) => {
    setStep(id as GateStep);
  }, []);

  const headings =
    step === "relationship"
      ? {
          icon: HelpCircle,
          title: "Do you already bank with GCB?",
          description: "One tap gets you to the right place.",
        }
      : {
          icon: Sparkles,
          title: "Opening this for yourself or a business?",
          description: "This decides which application you'll complete.",
        };

  return (
    <>
      <StateSwitcher
        section="12.1"
        states={GATE_STEPS}
        value={step}
        onChange={applyScenario}
        labels={GATE_STEP_LABELS}
      />
      <DevStatePanel />

      <AuthLayout
        icon={headings.icon}
        title={headings.title}
        description={headings.description}
        footer={
          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft size={13} strokeWidth={1.9} aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        }
      >
        {step === "relationship" && (
          <div className="flex flex-col gap-2">
            <OptionRow
              icon={Landmark}
              label="Yes — I have a GCB account"
              sub="We'll get your internet banking switched on."
              onClick={() => router.push("/activate")}
            />
            <OptionRow
              icon={Sparkles}
              label="No — I'm new to GCB"
              sub="Let's open an account for you."
              onClick={() => setStep("type")}
            />
          </div>
        )}

        {step === "type" && (
          <div className="flex flex-col gap-2">
            <OptionRow
              icon={UserPlus}
              label="For myself"
              sub="Personal account — Ghana Card and a quick selfie, about five minutes."
              href="/signup"
            />
            <OptionRow
              icon={Building2}
              label="For a business"
              sub="Company account — we review applications, usually within 2 business days."
              href="/signup/business"
            />
            <button
              type="button"
              onClick={() => setStep("relationship")}
              className="mt-2 flex items-center justify-center gap-1 text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft size={12} strokeWidth={1.9} aria-hidden="true" />
              Not sure — go back
            </button>
          </div>
        )}
      </AuthLayout>
    </>
  );
}

function OptionRow({
  icon: Icon,
  label,
  sub,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  sub: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] text-foreground">{label}</span>
        <span className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{sub}</span>
      </span>
      <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </>
  );

  const className =
    "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
