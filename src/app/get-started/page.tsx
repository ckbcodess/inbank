"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Landmark, Plus, UserCheck } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import ChoiceRow from "@/components/auth/ChoiceRow";
import OpenGcbAccountDialog from "@/components/auth/OpenGcbAccountDialog";

export default function GetStartedPage() {
  const router = useRouter();

  // Screen 1: How will you like to register?
  // Screen 2: How would you like to proceed?
  const [screen, setScreen] = useState<1 | 2>(1);
  const [showCoosModal, setShowCoosModal] = useState(false);

  const loginLine = (
    <p className="text-center text-body text-muted-foreground">
      Already registered?{" "}
      <Link
        href="/login"
        className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
      >
        Login
      </Link>
    </p>
  );

  return (
    <>
      <AuthLayout
        title={
          screen === 1
            ? "How Would You Like to Register?"
            : "How Would You Like to Get Started?"
        }
        description={
          screen === 1
            ? "Select the option that best describes your relationship with GCB."
            : "Choose how you would like to use Internet Banking."
        }
        onBack={screen === 2 ? () => setScreen(1) : undefined}
        backHref={screen === 1 ? "/login" : undefined}
        backLabel={screen === 2 ? "Back to registration options" : "Back to login"}
        width="compact"
      >
        {screen === 1 ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              {/* GCB account holder: /activate asks which ID the account was opened with */}
              <ChoiceRow
                dataTour="gs-existing"
                icon={<UserCheck size={18} />}
                title="GCB Account Holder"
                description="I already have a GCB account."
                onClick={() => router.push("/activate")}
              />
              <ChoiceRow
                dataTour="gs-new"
                icon={<Plus size={18} />}
                title="New to GCB"
                description="I do not have a GCB account."
                onClick={() => setScreen(2)}
              />
            </div>
            {loginLine}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <ChoiceRow
                dataTour="gs-cos"
                icon={<Landmark size={18} />}
                title="Open a GCB Account"
                description="Open an account and access Internet Banking."
                onClick={() => setShowCoosModal(true)}
                end={
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition duration-hover group-hover:text-foreground">
                    <ExternalLink size={18} />
                  </div>
                }
              />
              <ChoiceRow
                dataTour="gs-walletcard"
                icon={<Plus size={18} />}
                title="Use a Wallet or Card"
                description="Use mobile money or a bank card."
                onClick={() => router.push("/signup?flow=wallet_card")}
              />
            </div>
            {loginLine}
          </div>
        )}
      </AuthLayout>

      {/* COOS Redirection Confirmation Modal */}
      <OpenGcbAccountDialog
        open={showCoosModal}
        onOpenChange={setShowCoosModal}
        dataTourConfirm="gs-cos-confirm"
      />
    </>
  );
}
