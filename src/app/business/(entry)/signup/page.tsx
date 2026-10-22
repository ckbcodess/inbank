"use client";

/**
 * Business registration door, shaped like the personal one (/get-started). First: does the business already bank
 * with GCB? New to GCB asks for a call-back (/business/signup/new-to-gcb). Account holders then say how the
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
import { Button } from "@/components/ui/button";
import FindBranchDialog from "@/components/corporate/FindBranchDialog";

function BusinessSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const initialStep = searchParams.get("step");

  const [screen, setScreen] = useState<"relationship" | "type" | "company">(
    initialType === "company" ? "company" : initialStep === "type" ? "type" : "relationship",
  );
  const [showBranchDialog, setShowBranchDialog] = useState(false);

  if (screen === "company") {
    return (
      <>
        <AuthLayout
          title="Set Up Your Company"
          description="Apply online with any account your company holds. We write the request letter for your signatories to sign."
          icon={Building2}
          align="center"
          onBack={() => setScreen("type")}
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

  if (screen === "type") {
    return (
      <AuthLayout
        title="How Is Your Business Set Up?"
        description="Choose the option that describes your business."
        onBack={() => setScreen("relationship")}
        backLabel="Back to registration options"
        width="compact"
      >
        <div className="flex flex-col gap-2">
          <ChoiceTile
            icon={Store}
            label="Sole Proprietor"
            line="I run the business in my own name."
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
    <AuthLayout
      title="How Would You Like to Register?"
      description="Select the option that best describes your relationship with GCB."
      backHref="/login?type=business"
      backLabel="Back to login"
      width="compact"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <ChoiceTile
            icon={UserCheck}
            label="GCB Account Holder"
            line="My business already has a GCB account."
            onClick={() => setScreen("type")}
          />
          <ChoiceTile
            icon={Plus}
            label="New to GCB"
            line="My business does not have a GCB account."
            onClick={() => router.push("/business/signup/new-to-gcb")}
          />
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
