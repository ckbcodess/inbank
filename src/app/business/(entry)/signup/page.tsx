"use client";

/**
 * Business registration door, shaped like the personal one (/get-started). First: does the business already bank
 * with GCB? New to GCB opens the bank's account opening portal, as personal does. Account holders then say how the
 * business is set up: sole proprietors self-onboard online (BRD v2 §5.1); companies apply online with a letter we
 * write for their signatories, or at a branch, and both reach the same bank review (FR-ADM-05).
 * `?type=company` opens on the company screen, `?step=type` on the business-type question.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Plus, Store, UserCheck } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import ChoiceTile from "@/components/auth/ChoiceTile";
import OpenGcbAccountDialog from "@/components/auth/OpenGcbAccountDialog";
import { Button } from "@/components/ui/button";

function BusinessSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const initialStep = searchParams.get("step");

  const [screen, setScreen] = useState<"relationship" | "type" | "company">(
    initialType === "company" ? "company" : initialStep === "type" ? "type" : "relationship",
  );
  const [showOpenAccount, setShowOpenAccount] = useState(false);

  if (screen === "company") {
    return (
      <>
        <AuthLayout
          title="Set Up Your Company"
          description="We prepare the letter. Your signatories sign it."
          icon={Building2}
          align="center"
          onBack={() => setScreen("type")}
          backLabel="Back to business options"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button
              size="md"
              className="w-full"
              onClick={() => router.push("/business/signup/enrol")}
            >
              Apply Online
            </Button>
            <p className="pt-2 text-center text-body text-muted-foreground">
              Apply in person?{" "}
              <button
                type="button"
                onClick={() => router.push("/branches")}
                className="cursor-pointer font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Find a branch
              </button>
            </p>
          </div>
        </AuthLayout>
      </>
    );
  }

  if (screen === "type") {
    return (
      <AuthLayout
        title="Your Business Type"
        onBack={() => setScreen("relationship")}
        backLabel="Back to registration options"
        width="compact"
      >
        <div className="flex flex-col gap-2">
          <ChoiceTile
            icon={Store}
            label="Sole Proprietor"
            line="Registered in your own name."
            onClick={() => router.push("/business/signup/sole-proprietor")}
          />
          <ChoiceTile
            icon={Building2}
            label="Company or Organisation"
            line="Limited company, partnership, NGO and others."
            onClick={() => setScreen("company")}
          />
        </div>
      </AuthLayout>
    );
  }

  return (
    <>
      <AuthLayout
        title="Register Your Business"
        backHref="/login?type=business"
        backLabel="Back to login"
        width="compact"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <ChoiceTile
              icon={UserCheck}
              label="GCB Account Holder"
              line="Already banks with GCB."
              onClick={() => setScreen("type")}
            />
            <ChoiceTile
              icon={Plus}
              label="New to GCB"
              line="Open a business account first."
              onClick={() => setShowOpenAccount(true)}
              external
            />
          </div>

          <p className="text-center text-body text-muted-foreground">
            Already registered?{" "}
            <Link
              href="/login?type=business"
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              Log In
            </Link>
          </p>
        </div>
      </AuthLayout>

      <OpenGcbAccountDialog open={showOpenAccount} onOpenChange={setShowOpenAccount} />
    </>
  );
}

export default function BusinessSignupPage() {
  return (
    <Suspense fallback={null}>
      <BusinessSignupContent />
    </Suspense>
  );
}
