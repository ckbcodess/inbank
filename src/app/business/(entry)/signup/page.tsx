"use client";

/**
 * Business registration door. Sole proprietors self-onboard online (BRD v2 §5.1). Companies apply online with
 * a letter we write for their signatories, or at a branch; both reach the same bank review (FR-ADM-05).
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronRight, Store } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import FindBranchDialog from "@/components/corporate/FindBranchDialog";

function BusinessSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const [screen, setScreen] = useState<"choose" | "company">(
    initialType === "company" ? "company" : "choose",
  );
  const [showBranchDialog, setShowBranchDialog] = useState(false);

  function handleChooseSoleProprietor() {
    router.push("/business/signup/sole-proprietor");
  }

  function handleChooseCompany() {
    setScreen("company");
  }

  if (screen === "company") {
    return (
      <>
        <AuthLayout
          title="Set Up Your Company"
          description="Apply online with any account your company holds. We write the request letter for your signatories to sign."
          icon={Building2}
          align="center"
          onBack={() => setScreen("choose")}
          backLabel="Back to business options"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="h-10 w-full text-[14px]"
              onClick={() => router.push("/business/signup/enrol")}
            >
              Apply Online
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-10 w-full text-[14px]"
              onClick={() => router.push("/business/signup/status")}
            >
              Track an Application
            </Button>
            <p className="pt-2 text-center text-[13px] text-muted-foreground">
              Prefer to apply in person?{" "}
              <button
                type="button"
                onClick={() => setShowBranchDialog(true)}
                className="cursor-pointer font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Find a branch
              </button>
            </p>
          </div>
        </AuthLayout>

        <FindBranchDialog
          open={showBranchDialog}
          onOpenChange={setShowBranchDialog}
        />
      </>
    );
  }

  return (
    <AuthLayout
      title="How Is Your Business Set Up?"
      description="Choose the option that describes your business."
      backHref="/login?type=business"
      backLabel="Back to login"
      width="compact"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          {/* Option 1: Sole Proprietor */}
          <button
            type="button"
            onClick={handleChooseSoleProprietor}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card-item p-4 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs sm:p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Store size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[15.5px] font-medium tracking-[var(--ls-tight)] text-foreground sm:text-[16.5px]">
                  Sole Proprietor
                </span>
                <span className="mt-0.5 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px]">
                  I run the business in my own name.
                </span>
              </div>
            </div>

            <ChevronRight
              size={20}
              strokeWidth={2.2}
              className="shrink-0 text-foreground/70 transition duration-200 group-hover:text-foreground"
            />
          </button>

          {/* Option 2: Company or Organisation */}
          <button
            type="button"
            onClick={handleChooseCompany}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card-item p-4 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs sm:p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Building2 size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[15.5px] font-medium tracking-[var(--ls-tight)] text-foreground sm:text-[16.5px]">
                  Company or Organisation
                </span>
                <span className="mt-0.5 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px]">
                  Limited company, partnership, NGO and others.
                </span>
              </div>
            </div>

            <ChevronRight
              size={20}
              strokeWidth={2.2}
              className="shrink-0 text-foreground/70 transition duration-200 group-hover:text-foreground"
            />
          </button>
        </div>

        <p className="text-center text-[13px] text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login?type=business"
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function BusinessSignupPage() {
  return (
    <Suspense fallback={null}>
      <BusinessSignupContent />
    </Suspense>
  );
}
