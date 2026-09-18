"use client";

import React, { useState } from "react";
import {
  Check,
  Building2,
  ChevronRight,
  ChevronLeft,
  X,
  Bike,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
} from "@/components/ui/dialog";
import type { PaymentCard, DeliveryStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface CardDeliveryTrackerProps {
  card: PaymentCard;
  className?: string;
  onShowPickupCode?: () => void;
}

// 6-dot matrix keypad icon matching Figma
function KeypadMatrixIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="5" r="1.75" />
      <circle cx="10" cy="5" r="1.75" />
      <circle cx="15" cy="5" r="1.75" />
      <circle cx="5" cy="10" r="1.75" />
      <circle cx="10" cy="10" r="1.75" />
      <circle cx="15" cy="10" r="1.75" />
      <circle cx="5" cy="15" r="1.75" />
      <circle cx="10" cy="15" r="1.75" />
      <circle cx="15" cy="15" r="1.75" />
    </svg>
  );
}

export interface DeliveryTrackingStep {
  key: DeliveryStatus;
  stepNum: number;
  title: string;
  description?: string;
  dateStr?: string;
}

function getStepIndex(status?: DeliveryStatus): number {
  switch (status) {
    case "processing":
      return 0;
    case "in_production":
      return 1;
    case "in_transit":
    case "out_for_delivery":
      return 2;
    case "ready_for_pickup":
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

export function getTrackingSteps(
  card: PaymentCard,
  isBranch: boolean
): readonly DeliveryTrackingStep[] {
  const currentStepIndex = getStepIndex(card.deliveryStatus);
  const isOutForDelivery = card.deliveryStatus === "out_for_delivery";

  return [
    {
      key: "processing",
      stepNum: 1,
      title: "Request Approved",
      description: "Application verified and card order confirmed.",
      dateStr: currentStepIndex >= 0 ? "Sep 16, 2026 • 10:45 AM" : undefined,
    },
    {
      key: "in_production",
      stepNum: 2,
      title: "Card in Production",
      description: "Embossing cardholder name and programming EMV chip.",
      dateStr:
        currentStepIndex > 1
          ? "Sep 17, 2026 • 02:15 PM"
          : currentStepIndex === 1
          ? "In progress"
          : undefined,
    },
    {
      key: isOutForDelivery ? "out_for_delivery" : "in_transit",
      stepNum: 3,
      title: isBranch
        ? "In Transit to Branch"
        : isOutForDelivery
        ? "Out for Delivery"
        : "Dispatched & In Transit",
      description: isBranch
        ? "Card secured in tamper-evident envelope and en route to branch."
        : isOutForDelivery && card.courierRider
        ? `Courier ${card.courierRider.name} (${card.courierRider.vehiclePlate || "Motorbike"}) is en route to your address.`
        : "Card secured in tamper-evident envelope and en route.",
      dateStr:
        currentStepIndex > 2
          ? "Sep 18, 2026 • 08:30 AM"
          : currentStepIndex === 2
          ? isOutForDelivery
            ? "Out for delivery today"
            : "In transit"
          : undefined,
    },
    {
      key: "ready_for_pickup",
      stepNum: 4,
      title: isBranch ? "Ready for Pickup" : "Delivered",
      description: isBranch
        ? "Available for collection at branch."
        : "Delivered to recipient address.",
      dateStr:
        currentStepIndex >= 3
          ? isBranch
            ? "Ready for collection"
            : "Delivered"
          : undefined,
    },
  ];
}

export function CardDeliveryTracker({
  card,
  className,
  onShowPickupCode,
}: CardDeliveryTrackerProps) {
  const isBranchPickup = card.deliveryMethod === "BRANCH_PICKUP" || !card.deliveryAddress;
  const currentStepIndex = getStepIndex(card.deliveryStatus);
  const steps = getTrackingSteps(card, isBranchPickup);
  const isReadyForPickup =
    card.deliveryStatus === "ready_for_pickup" || card.deliveryStatus === "delivered";

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      {/* Subheader: Delivery Progress + Status Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-medium text-foreground tracking-[-0.01em]">
          Delivery Progress
        </h3>
        <span className="rounded-full bg-[#fef3eb] dark:bg-amber-950/50 px-3 py-0.5 text-[12px] font-medium text-[#b54708] dark:text-amber-400">
          {isReadyForPickup ? "Ready" : "Pending"}
        </span>
      </div>

      {/* 4-Step Timeline Stepper matching Figma 1:1 */}
      <div className="relative flex flex-col pl-1">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIndex;
          const isLast = idx === steps.length - 1;
          const isCurrentActive = idx === currentStepIndex;

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
              {/* Connecting vertical stroke line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[13px] top-[26px] bottom-0 w-[2px] transition-colors",
                    isCompleted && idx < currentStepIndex
                      ? "bg-[#ffbc04]"
                      : "bg-[#e5e5e5] dark:bg-border"
                  )}
                />
              )}

              {/* Node indicator */}
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center shrink-0 transition-all z-10 select-none",
                  isCompleted
                    ? "bg-[#ffbc04] text-[#121212] font-medium"
                    : "bg-[#f5f5f5] dark:bg-muted text-muted-foreground text-[12px] border border-border"
                )}
              >
                {isCompleted ? (
                  <Check size={15} strokeWidth={2.4} />
                ) : (
                  <span className="text-[12px] font-medium tabular-nums">{step.stepNum}</span>
                )}
              </div>

              {/* Content Row */}
              <div className="flex flex-col min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[15px] leading-tight tracking-[-0.01em]",
                      isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.dateStr && (
                    <span
                      className={cn(
                        "text-[13px] tabular-nums",
                        isCurrentActive ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {step.dateStr}
                    </span>
                  )}
                </div>

                {step.description && (
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Branch Location Item (Shows when branch details exist) */}
      {isBranchPickup && isReadyForPickup && (
        <div className="flex items-center gap-3 pt-2">
          <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 text-foreground">
            <Building2 size={20} strokeWidth={1.8} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-medium text-foreground leading-tight">
              Branch Pickup
            </span>
            <span className="text-[13px] text-muted-foreground mt-0.5 truncate">
              {card.deliveryBranch || "GCB Head Office Branch (High Street, Accra)"}
            </span>
          </div>
        </div>
      )}

      {/* Rider Contact Card (Shows when doorstep delivery has assigned rider) */}
      {!isBranchPickup && card.courierRider && (card.deliveryStatus === "out_for_delivery" || card.deliveryStatus === "in_transit") && (
        <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full bg-primary/15 text-foreground flex items-center justify-center shrink-0">
              <Bike size={20} strokeWidth={1.8} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-medium text-foreground truncate">
                  {card.courierRider.name}
                </span>
                <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                  Rider
                </span>
              </div>
              <span className="text-[12.5px] text-muted-foreground truncate">
                {card.courierRider.company || "GCB Express Courier"} • {card.courierRider.vehiclePlate || "Motorbike"}
              </span>
            </div>
          </div>
          <a
            href={`tel:${card.courierRider.phone}`}
            className="flex size-9 items-center justify-center rounded-full bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer shrink-0"
            title={`Call rider: ${card.courierRider.phone}`}
            aria-label="Call dispatch rider"
          >
            <Phone size={16} strokeWidth={1.8} />
          </a>
        </div>
      )}

      {/* "Show Pickup Code" Action Row Button matching Screenshot 2 */}
      {isBranchPickup && isReadyForPickup && onShowPickupCode && (
        <button
          type="button"
          onClick={onShowPickupCode}
          className="w-full rounded-2xl bg-[#f6f6f5] dark:bg-muted/70 hover:bg-[#ededec] dark:hover:bg-muted transition-colors p-4 flex items-center justify-between gap-3 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="text-foreground shrink-0">
              <KeypadMatrixIcon className="size-5 text-foreground" />
            </div>
            <span className="text-[15px] font-medium text-foreground">
              Show Pickup Code
            </span>
          </div>
          <ChevronRight
            size={18}
            className="text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all"
          />
        </button>
      )}
    </div>
  );
}

export interface CardDeliveryTrackerModalProps {
  card: PaymentCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: "timeline" | "pickup-code";
}

export function CardDeliveryTrackerModal({
  card,
  open,
  onOpenChange,
  initialView = "timeline",
}: CardDeliveryTrackerModalProps) {
  const [view, setView] = useState<"timeline" | "pickup-code">(initialView);

  React.useEffect(() => {
    if (open) {
      setView(initialView);
    }
  }, [open, initialView]);

  if (!card) return null;

  const isBranchPickup = card.deliveryMethod === "BRANCH_PICKUP" || !card.deliveryAddress;
  const branchName = card.deliveryBranch || "GCB Head Office Branch";
  const pickupCode = card.pickupCode || "4920";

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setView("timeline"), 200);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent size="md" className="p-0 overflow-hidden rounded-[20px]">
        {/* Custom Header matching Figma Node 1646:4485 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            {view === "pickup-code" && initialView === "timeline" && (
              <button
                type="button"
                onClick={() => setView("timeline")}
                className="flex size-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer mr-1"
                aria-label="Back to timeline"
                title="Back to timeline"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
            )}
            <h2 className="text-[18px] font-medium text-foreground tracking-[-0.01em]">
              {view === "pickup-code"
                ? isBranchPickup
                  ? "Branch Pickup Code"
                  : "Secure Handover Code"
                : "Track Delivery"}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex size-9 items-center justify-center rounded-full bg-[#f6f6f5] dark:bg-muted text-muted-foreground hover:text-foreground hover:bg-[#ededec] dark:hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <DialogBody className="px-6 pb-7 pt-3">
          {view === "timeline" ? (
            <CardDeliveryTracker
              card={card}
              onShowPickupCode={() => setView("pickup-code")}
            />
          ) : isBranchPickup ? (
            /* Branch Pickup Code View matching Figma Node 1646:4485 & Screenshot 3 */
            <div className="flex flex-col items-center justify-center py-4 text-center gap-8">
              {/* Huge Bold Pickup Code */}
              <div className="flex flex-col items-center gap-4">
                <span className="text-[46px] sm:text-[48px] font-mono font-medium tracking-[4px] text-foreground tabular-nums select-all">
                  {pickupCode}
                </span>

                {/* Instruction Paragraph */}
                <p className="text-[14px] text-[#747472] dark:text-muted-foreground max-w-[380px] leading-[22px]">
                  When your card arrives at{" "}
                  <span className="text-foreground font-medium">{branchName}</span>, present your
                  Ghana Card and pickup code to collect it.
                </p>
              </div>

              {/* Operating Hours & Support metadata */}
              <div className="flex flex-col items-center gap-2 text-[15px] font-medium text-[#a1a1a1] dark:text-muted-foreground/80">
                <span>Hours: Mon - Fri (8:00 AM - 5:00 PM)</span>
                <span>Branch Support: 030 4222 422</span>
              </div>
            </div>
          ) : (
            /* Doorstep Courier Handover Code View */
            <div className="flex flex-col items-center justify-center py-4 text-center gap-6">
              {/* Huge Bold Handover Code */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-[46px] sm:text-[48px] font-mono font-medium tracking-[6px] text-foreground tabular-nums select-all">
                  {card.deliveryCode || card.pickupCode || "8419"}
                </span>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-foreground text-[12px] font-medium">
                  <ShieldCheck size={14} className="text-foreground" />
                  <span>Handover Verification Code</span>
                </div>

                {/* Instruction Paragraph */}
                <p className="text-[14px] text-muted-foreground max-w-[380px] leading-[22px] mt-1">
                  Show this code to your courier rider{" "}
                  <span className="text-foreground font-medium">
                    ({card.courierRider?.name || "Kofi Mensah"})
                  </span>{" "}
                  upon arrival. The rider must confirm this code on their terminal to verify your identity and release your card.
                </p>
              </div>

              {/* Security Hint */}
              <div className="w-full rounded-xl bg-muted/40 border border-border/80 px-4 py-3 text-[12.5px] text-muted-foreground text-center">
                <span>Do not share this code via phone or SMS. Present it only in person upon delivery.</span>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

