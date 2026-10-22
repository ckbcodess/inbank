"use client";

/**
 * A business that doesn't bank with GCB yet asks to be contacted — /business/signup/new-to-gcb.
 *
 * Internet banking rests on an existing account and mandate, and online account opening is out of Phase 1
 * (designer, 2026-10-20). So this doesn't open an account: it takes a few contact details and the bank's business
 * banking team calls back to open one at a branch. Once it's open, they come back and register the normal way.
 * `?type=company` or `?type=sole` skips the first question when the door already knows the answer.
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, Store } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { maskMobile } from "@/lib/auth-shared";
import { isCompleteGhanaMobile } from "@/lib/phone";

type BusinessKind = "sole" | "company";

const KIND_OPTIONS: { kind: BusinessKind; label: string; line: string; icon: typeof Store }[] = [
  { kind: "sole", label: "Sole Proprietor", line: "I run the business in my own name.", icon: Store },
  { kind: "company", label: "Company or Organisation", line: "Limited company, partnership, NGO and others.", icon: Building2 },
];

function NewToGcbContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const initialKind: BusinessKind | null = typeParam === "company" || typeParam === "sole" ? typeParam : null;

  const [kind, setKind] = useState<BusinessKind | null>(initialKind);
  const [step, setStep] = useState<"kind" | "details" | "sent">(initialKind ? "details" : "kind");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [town, setTown] = useState("");
  const [busy, setBusy] = useState(false);

  const mobileError = mobile && !isCompleteGhanaMobile(mobile) ? "Enter a full Ghana mobile number." : "";
  const ready =
    businessName.trim() !== "" &&
    contactName.trim() !== "" &&
    isCompleteGhanaMobile(mobile) &&
    email.includes("@") &&
    town.trim() !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("sent");
    }, 600);
  }

  if (step === "sent") {
    return (
      <AuthLayout
        title="Request Sent"
        description={`Our business banking team will call ${maskMobile(mobile)} to open your account at a branch near ${town.trim()}. Once it's open, come back and register for internet banking.`}
        icon={CheckCircle2}
        align="center"
        width="compact"
      >
        <Button size="lg" className="h-10 w-full text-[14px]" onClick={() => router.push("/login?type=business")}>
          Back to Login
        </Button>
      </AuthLayout>
    );
  }

  if (step === "kind") {
    return (
      <AuthLayout
        title="Open a Business Account"
        description="Internet banking needs a GCB business account. Tell us about your business and we'll call you to open one."
        onBack={() => router.push("/business/signup")}
        backLabel="Back to registration options"
        width="compact"
      >
        <div role="radiogroup" aria-label="How is your business set up?" className="flex flex-col gap-2">
          {KIND_OPTIONS.map(({ kind: k, label, line, icon: Icon }) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                setStep("details");
              }}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-hover hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tile)] text-foreground">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] text-foreground">{label}</span>
                <span className="block text-[12px] text-muted-foreground">{line}</span>
              </span>
            </button>
          ))}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Tell Us About Your Business"
      description="We'll call you to arrange opening the account at a branch."
      onBack={() => (initialKind ? router.back() : setStep("kind"))}
      backLabel="Back to previous step"
      width="compact"
      animateHeight
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Field label="Business Name" htmlFor="businessName">
            <Input
              id="businessName"
              autoComplete="organization"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Your Name" htmlFor="contactName">
            <Input id="contactName" autoComplete="name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label="Mobile Number" htmlFor="contactMobile" hint="We'll call you on this number." error={mobileError}>
            <PhoneInput id="contactMobile" value={mobile} onValueChange={setMobile} />
          </Field>
          <Field label="Email" htmlFor="contactEmail">
            <Input id="contactEmail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Town or City" htmlFor="town" hint="So we can match you with a branch nearby.">
            <Input id="town" autoComplete="address-level2" value={town} onChange={(e) => setTown(e.target.value)} />
          </Field>
        </div>

        <Button type="submit" size="lg" loading={busy} disabled={!ready} className="h-10 w-full text-[14px]">
          Send Request
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function NewToGcbPage() {
  return (
    <Suspense fallback={null}>
      <NewToGcbContent />
    </Suspense>
  );
}
