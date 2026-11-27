"use client";

/**
 * Business registration door, shaped like the personal one (/get-started). First: does the business already bank
 * with GCB? New to GCB opens the bank's account opening portal, as personal does. Account holders then say how the
 * business is set up; both go straight to the same online request (letter of request, uploaded), which reaches the
 * bank's review like a branch request (FR-ADM-05). `?step=type` opens on the business-type question.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Plus, Store, UserCheck } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import ChoiceTile from "@/components/auth/ChoiceTile";
import OpenGcbAccountDialog from "@/components/auth/OpenGcbAccountDialog";

function BusinessSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `?type=company` was the old "apply online or at a branch" screen; it now opens the business type question.
  const initialStep = searchParams.get("step") ?? (searchParams.get("type") ? "type" : null);

  const [screen, setScreen] = useState<"relationship" | "type">(initialStep === "type" ? "type" : "relationship");
  const [showOpenAccount, setShowOpenAccount] = useState(false);

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
            onClick={() => router.push("/business/signup/enrol?type=sole")}
          />
          <ChoiceTile
            icon={Building2}
            label="Company or Organisation"
            line="Limited company, partnership, NGO and others."
            onClick={() => router.push("/business/signup/enrol?type=company")}
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
