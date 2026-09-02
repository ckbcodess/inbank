"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";

export default function GetStartedPage() {
  const router = useRouter();

  // Screen 1: How will you like to register?
  // Screen 2: How would you like to proceed?
  const [screen, setScreen] = useState<1 | 2>(1);
  const [showCoosModal, setShowCoosModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  function executeCoosRedirect() {
    setIsRedirecting(true);
    setTimeout(() => {
      window.open("https://accountopening.gcb.com.gh", "_blank");
      setIsRedirecting(false);
      setShowCoosModal(false);
    }, 1000);
  }

  return (
    <>
      <AuthLayout
        title={
          screen === 1
            ? "How will you like to register?"
            : "How would you like to proceed?"
        }
        description={
          screen === 1
            ? "Select the option that best describes your relationship with GCB."
            : "Select your preferred option to get started on GCB Internet Banking."
        }
        stepProgress={{
          current: screen,
          total: 8,
        }}
        width="compact"
        footer={
          <div className="flex justify-center">
            {screen === 1 ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96]"
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Back to sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setScreen(1)}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96] cursor-pointer"
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Back to previous step
              </button>
            )}
          </div>
        }
      >
        {screen === 1 ? (
          <div className="flex flex-col gap-3">
            {/* Option 1: Yes - I have a GCB account -> Immediate route to /activate */}
            <button
              type="button"
              onClick={handleChooseExisting}
              className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                  <Landmark size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14.5px] font-semibold text-foreground">
                    Yes — I have a GCB account
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    We will get your internet banking switched on.
                  </span>
                </div>
              </div>

              <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
                <ArrowRight size={16} strokeWidth={2} />
              </div>
            </button>

            {/* Option 2: No - I'm new to GCB -> Immediate transition to Step 2 */}
            <button
              type="button"
              onClick={handleChooseNew}
              className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                  <UserPlus size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14.5px] font-semibold text-foreground">
                    No — I am new to GCB
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    Open a new account or start with a card or wallet.
                  </span>
                </div>
              </div>

              <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
                <ArrowRight size={16} strokeWidth={2} />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Step 2 Option 1: Open a GCB Account -> Immediate COOS modal */}
            <button
              type="button"
              onClick={handleChooseCoos}
              className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                  <Landmark size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-foreground">
                      Open a GCB Account
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3D6] px-2 py-0.5 text-[10.5px] font-semibold text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
                      <Sparkles size={11} />
                      Fast online opening
                    </span>
                  </div>
                  <span className="text-[12.5px] text-muted-foreground">
                    Create a full bank account via GCB Account Opening Portal.
                  </span>
                </div>
              </div>

              <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
                <ExternalLink size={16} strokeWidth={2} />
              </div>
            </button>

            {/* Step 2 Option 2: Start with a Wallet or Card -> Immediate route to /signup */}
            <button
              type="button"
              onClick={handleChooseWalletCard}
              className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                  <CreditCard size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14.5px] font-semibold text-foreground">
                    Start with a Wallet or Card
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    Register with Ghana Card and link your mobile money or bank card.
                  </span>
                </div>
              </div>

              <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
                <ArrowRight size={16} strokeWidth={2} />
              </div>
            </button>
          </div>
        )}
      </AuthLayout>

      {/* COOS Redirection Confirmation Modal */}
      {showCoosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-black/10 bg-card p-6 sm:p-7 shadow-2xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
                <ExternalLink size={28} strokeWidth={2} />
              </div>

              <h3 className="text-[19px] font-semibold text-foreground">
                Redirecting to GCB Account Opening
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                You will be redirected to our secure Customer Onboarding &amp; Origination System (COOS) portal at{" "}
                <span className="font-semibold text-foreground">
                  accountopening.gcb.com.gh
                </span>{" "}
                to complete your full account creation.
              </p>

              <div className="mt-6 flex w-full flex-col gap-2.5">
                <Button
                  type="button"
                  onClick={executeCoosRedirect}
                  disabled={isRedirecting}
                  className="h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] shadow-md shadow-[#F2B200]/20 cursor-pointer"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Opening secure portal...
                    </>
                  ) : (
                    <>
                      Open account on COOS
                      <ExternalLink className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCoosModal(false)}
                  disabled={isRedirecting}
                  className="h-11 w-full rounded-2xl text-[13.5px] text-muted-foreground hover:text-foreground active:scale-[0.96] cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
