"use client";

import React, { useState } from "react";
import {
  Check,
  Clock,
  Truck,
  MapPin,
  Building2,
  Copy,
  CheckCircle2,
  Package,
  ShieldCheck,
  Phone,
  QrCode,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PaymentCard, DeliveryStatus } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CardDeliveryTrackerProps {
  card: PaymentCard;
  className?: string;
  isCompact?: boolean;
}

interface TrackingStep {
  key: DeliveryStatus;
  title: string;
  description: string;
  dateStr?: string;
}

const TRACKING_STEPS: readonly TrackingStep[] = [
  {
    key: "processing",
    title: "Request Approved",
    description: "Application verified and security clearance granted.",
    dateStr: "Sep 16, 2026 • 10:45 AM",
  },
  {
    key: "in_production",
    title: "Card in Production",
    description: "Embossing cardholder name and programming EMV chip.",
    dateStr: "Sep 17, 2026 • 02:15 PM",
  },
  {
    key: "in_transit",
    title: "Dispatched & In Transit",
    description: "Card secured in tamper-evident envelope and en route.",
    dateStr: "Sep 18, 2026 • 09:30 AM",
  },
  {
    key: "ready_for_pickup",
    title: "Ready for Pickup / Delivered",
    description: "Available for collection at branch or delivered to recipient.",
    dateStr: "Expected Sep 21, 2026",
  },
] as const;

function getStepIndex(status?: DeliveryStatus): number {
  switch (status) {
    case "processing":
      return 0;
    case "in_production":
      return 1;
    case "in_transit":
      return 2;
    case "ready_for_pickup":
    case "delivered":
      return 3;
    default:
      return 1; // Default to in_production for demo cards
  }
}

export function CardDeliveryTracker({ card, className, isCompact = false }: CardDeliveryTrackerProps) {
  const [copied, setCopied] = useState(false);
  const currentStepIndex = getStepIndex(card.deliveryStatus);
  const isBranchPickup = card.deliveryMethod === "BRANCH_PICKUP" || !card.deliveryAddress;
  const trackingNumber = card.trackingNumber || `GCB-CRD-${card.id.slice(-6).toUpperCase()}`;

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    toast.success("Tracking number copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      {/* Top Header Card */}
      <div className="rounded-[16px] border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-11 rounded-2xl bg-muted flex items-center justify-center shrink-0 text-foreground">
            {isBranchPickup ? (
              <Building2 size={20} strokeWidth={1.8} />
            ) : (
              <Truck size={20} strokeWidth={1.8} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] sm:text-[16px] font-medium text-foreground tracking-[-0.01em]">
                {isBranchPickup ? "Branch Pickup" : "Doorstep Delivery"}
              </span>
              <Badge
                variant={
                  card.deliveryStatus === "ready_for_pickup" || card.deliveryStatus === "delivered"
                    ? "success"
                    : "secondary"
                }
                className="text-[11px] capitalize"
              >
                {card.deliveryStatus === "ready_for_pickup"
                  ? "Ready for Collection"
                  : card.deliveryStatus === "in_transit"
                  ? "In Transit"
                  : card.deliveryStatus === "in_production"
                  ? "In Production"
                  : "Order Placed"}
              </Badge>
            </div>
            <p className="text-[13px] text-muted-foreground truncate">
              {isBranchPickup
                ? card.deliveryBranch || "GCB Head Office Branch (High Street, Accra)"
                : card.deliveryAddress || "Standard Residential Delivery"}
            </p>
          </div>
        </div>

        {/* Tracking Reference Pill */}
        <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border shrink-0">
          <span className="text-[12px] text-muted-foreground">Tracking ID:</span>
          <span className="text-[13px] font-medium text-foreground font-mono tabular-nums">
            {trackingNumber}
          </span>
          <button
            type="button"
            onClick={handleCopyTracking}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
            title="Copy tracking number"
            aria-label="Copy tracking number"
          >
            {copied ? <Check size={14} className="text-foreground" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* 4-Step Interactive Timeline */}
      <div className="rounded-[16px] border border-border bg-card p-5 sm:p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h4 className="text-[15px] font-medium text-foreground tracking-[-0.01em]">
            Delivery Progress
          </h4>
          <span className="text-[12.5px] text-muted-foreground">
            {card.estimatedDeliveryDate
              ? `ETA: ${card.estimatedDeliveryDate}`
              : "Estimated: 3-5 business days"}
          </span>
        </div>

        {/* Stepper Node Tree */}
        <div className="relative flex flex-col gap-8 pl-2 sm:pl-3">
          {TRACKING_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;
            const isLast = idx === TRACKING_STEPS.length - 1;

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Connecting vertical stroke line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[15px] top-[32px] bottom-[-24px] w-[2px] transition-colors",
                      isCompleted ? "bg-foreground" : "bg-border"
                    )}
                  />
                )}

                {/* Node circle indicator */}
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center shrink-0 border transition-all z-10",
                    isCompleted
                      ? "bg-foreground border-foreground text-background"
                      : isCurrent
                      ? "bg-background border-foreground text-foreground ring-4 ring-muted"
                      : "bg-background border-border text-muted-foreground opacity-60"
                  )}
                >
                  {isCompleted ? (
                    <Check size={15} strokeWidth={2.4} />
                  ) : (
                    <span className="text-[12px] font-medium tabular-nums">{idx + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[14px] font-medium tracking-[-0.01em]",
                        isPending ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.dateStr && (
                      <span className="text-[12px] text-muted-foreground tabular-nums">
                        {step.dateStr}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fulfillment Instructions Card (Branch Pickup or Delivery) */}
      {isBranchPickup ? (
        <div className="rounded-[16px] border border-border bg-muted/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-5">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-foreground font-medium text-[14px]">
              <MapPin size={16} strokeWidth={1.8} className="text-foreground shrink-0" />
              <span>Branch Collection Instructions</span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              When your card arrives at{" "}
              <span className="text-foreground font-medium">
                {card.deliveryBranch || "GCB Head Office Branch"}
              </span>
              , present your valid national ID (Ghana Card) along with your secure pickup code to
              collect your card package.
            </p>
            <div className="flex items-center gap-4 text-[12px] text-muted-foreground mt-1">
              <span>Hours: Mon - Fri (8:00 AM - 5:00 PM)</span>
              <span>•</span>
              <span>Branch Support: 0800 422 422</span>
            </div>
          </div>

          {/* Pickup Verification Code Box */}
          <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col items-center justify-center shrink-0 min-w-[140px] text-center shadow-2xs">
            <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Pickup Code
            </span>
            <span className="text-[20px] font-medium text-foreground tracking-widest font-mono mt-0.5">
              {card.pickupCode || "4920"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">Show to Branch Teller</span>
          </div>
        </div>
      ) : (
        <div className="rounded-[16px] border border-border bg-muted/40 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-foreground font-medium text-[14px]">
            <Truck size={16} strokeWidth={1.8} className="text-foreground shrink-0" />
            <span>Courier Dispatch & Delivery Note</span>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Your card is delivered in a sealed, tamper-evident security pouch. The courier will
            require biometric or SMS OTP confirmation upon handover at{" "}
            <span className="text-foreground font-medium">{card.deliveryAddress}</span>.
          </p>
        </div>
      )}
    </div>
  );
}

export interface CardDeliveryTrackerModalProps {
  card: PaymentCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardDeliveryTrackerModal({
  card,
  open,
  onOpenChange,
}: CardDeliveryTrackerModalProps) {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Card Delivery Tracking</DialogTitle>
        </DialogHeader>
        <DialogBody className="py-2">
          <CardDeliveryTracker card={card} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
