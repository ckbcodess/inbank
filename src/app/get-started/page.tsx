"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  Plus,
  Sparkles,
  UserCheck,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
        stepProgress={
          screen === 2
            ? {
                current: 2,
                total: 8,
              }
            : undefined
        }
        width="compact"
        footer={
          <div className="flex justify-center">
            {screen === 1 ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Back to sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setScreen(1)}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Back to previous step
              </button>
            )}
          </div>
        }
      >
        {screen === 1 ? (
          <div className="flex flex-col gap-3.5">
            {/* Option 1: GCB Account Holder -> Immediate route to /activate */}
            <button
              type="button"
              data-tour="gs-existing"
              onClick={handleChooseExisting}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
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
                    Link your existing account to get started.
                  </span>
                </div>
              </div>

              <ChevronRight
                size={20}
                strokeWidth={2.2}
                className="shrink-0 text-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </button>

            {/* Option 2: New to GCB -> Immediate transition to Step 2 */}
            <button
              type="button"
              data-tour="gs-new"
              onClick={handleChooseNew}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
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
                    Open an account with your wallet or card.
                  </span>
                </div>
              </div>

              <ChevronRight
                size={20}
                strokeWidth={2.2}
                className="shrink-0 text-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Step 2 Option 1: Open a GCB Account -> Immediate COOS modal */}
            <button
              type="button"
              data-tour="gs-cos"
              onClick={handleChooseCoos}
              className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Landmark size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-foreground">
                      Open a GCB Account
                    </span>
                    <Badge variant="warning" className="gap-1 text-[10.5px]">
                      <Sparkles size={11} />
                      Fast online opening
                    </Badge>
                  </div>
                  <span className="text-[13px] text-muted-foreground mt-0.5">
                    Create a full bank account via GCB Account Opening Portal.
                  </span>
                </div>
              </div>

              <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground">
                <ExternalLink size={18} strokeWidth={2} />
              </div>
            </button>

            {/* Step 2 Option 2: Start with a Wallet or Card -> Immediate route to /signup */}
            <button
              type="button"
              data-tour="gs-walletcard"
              onClick={handleChooseWalletCard}
              className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CreditCard size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-foreground">
                    Start with a Wallet or Card
                  </span>
                  <span className="text-[13px] text-muted-foreground mt-0.5">
                    Register with Ghana Card and link your mobile money or bank card.
                  </span>
                </div>
              </div>

              <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground">
                <ArrowRight size={18} strokeWidth={2} />
              </div>
            </button>
          </div>
        )}
      </AuthLayout>

      {/* COOS Redirection Confirmation Modal */}
      <Dialog open={showCoosModal} onOpenChange={setShowCoosModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Account opening portal</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              You will be redirected to our secure Customer Onboarding & Origination System (COOS) portal at{" "}
              <span className="font-medium text-foreground">accountopening.gcb.com.gh</span> to complete your full account creation.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCoosModal(false)}
              disabled={isRedirecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              data-tour="gs-cos-confirm"
              onClick={executeCoosRedirect}
              disabled={isRedirecting}
              className="gap-1.5"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Opening portal...
                </>
              ) : (
                <>
                  Open on COOS
                  <ExternalLink className="size-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
