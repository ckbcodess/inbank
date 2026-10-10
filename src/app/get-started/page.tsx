"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  Landmark,
  Plus,
  UserCheck,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import OpenGcbAccountDialog from "@/components/accounts/OpenGcbAccountDialog";

export default function GetStartedPage() {
  const router = useRouter();

  // Screen 1: How will you like to register?
  // Screen 2: How would you like to proceed?
  const [screen, setScreen] = useState<1 | 2>(1);
  const [showCoosModal, setShowCoosModal] = useState(false);

  function handleChooseExisting() {
    router.push("/activate");
  }

  function handleChooseNew() {
    setScreen(2);
  }

  function handleChooseCoos() {
    setShowCoosModal(true);
  }

  function handleChooseWalletCard() {
    router.push("/signup?flow=wallet_card");
  }

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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
            {/* Option 1: GCB Account Holder -> Immediate route to /activate */}
            <button
              type="button"
              data-tour="gs-existing"
              onClick={handleChooseExisting}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card-item p-4.5 sm:p-5 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UserCheck size={18} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">
                    GCB Account Holder
                  </span>
                  <span className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                    I already have a GCB account.
                  </span>
                </div>
              </div>

              <ChevronRight
                size={20}
                strokeWidth={2.2}
                className="shrink-0 text-foreground/70 transition duration-200 group-hover:text-foreground"
              />
            </button>

            {/* Option 2: New to GCB -> Immediate transition to Step 2 */}
            <button
              type="button"
              data-tour="gs-new"
              onClick={handleChooseNew}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card-item p-4.5 sm:p-5 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Plus size={19} strokeWidth={2.4} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">
                    New to GCB
                  </span>
                  <span className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                    I do not have a GCB account.
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
                href="/login"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Login
              </Link>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
            {/* Step 2 Option 1: Open a GCB Account -> Immediate COOS modal */}
            <button
              type="button"
              data-tour="gs-cos"
              onClick={handleChooseCoos}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card-item p-4.5 sm:p-5 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Landmark size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">
                    Open a GCB Account
                  </span>
                  <span className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                    Open an account and access Internet Banking.
                  </span>
                </div>
              </div>

              <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition duration-200 group-hover:text-foreground">
                <ExternalLink size={18} strokeWidth={2} />
              </div>
            </button>

            {/* Step 2 Option 2: Use a Wallet or Card -> Immediate route to /signup */}
            <button
              type="button"
              data-tour="gs-walletcard"
              onClick={handleChooseWalletCard}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card-item p-4.5 sm:p-5 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Plus size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">
                    Use a Wallet or Card
                  </span>
                  <span className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                    Use mobile money or a bank card.
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
                href="/login"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Login
              </Link>
            </p>
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
