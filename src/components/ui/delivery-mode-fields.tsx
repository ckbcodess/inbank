"use client";

/**
 * Mode of delivery — branch pickup (with the type-to-search branch picker) or
 * doorstep delivery (recipient, address, city, phone). Lifted out of Request a
 * Card so the cheque book request asks it the same way.
 */

import { BranchCombobox } from "@/components/ui/branch-combobox";
import { SmoothHeight } from "@/components/ui/smooth-height";
import { PhoneInput } from "@/components/ui/phone-input";
import { GCB_BRANCHES, type DeliveryMethod, type GcbBranch } from "@/lib/mock-data";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export interface DeliveryDetails {
  method: DeliveryMethod | null;
  branch: GcbBranch | null;
  recipientName: string;
  address: string;
  city: string;
  phone: string;
}

/** Enough to act on: a branch for pickup, or name + address + phone for delivery. */
export function deliveryComplete(d: DeliveryDetails): boolean {
  if (d.method === "BRANCH_PICKUP") return d.branch !== null;
  if (d.method === "DELIVERY") return Boolean(d.recipientName.trim() && d.address.trim() && d.phone.trim());
  return false;
}

/** One line for reviews and receipts. */
export function deliverySummary(d: DeliveryDetails): string {
  if (d.method === "BRANCH_PICKUP") return `Collect at ${d.branch?.name ?? "a branch"}`;
  if (d.method === "DELIVERY") return `Deliver to ${d.address.trim()}${d.city.trim() ? `, ${d.city.trim()}` : ""}`;
  return "";
}

export function DeliveryModeFields({
  value,
  onChange,
}: {
  value: DeliveryDetails;
  onChange: (patch: Partial<DeliveryDetails>) => void;
}) {
  return (
    <>
      <Label>
        Mode of Delivery
      </Label>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange({ method: "BRANCH_PICKUP" })}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            value.method === "BRANCH_PICKUP"
              ? "border-field-border-focus bg-field text-foreground"
              : "border-field-border bg-field hover:bg-field-hover text-foreground"
          }`}
        >
          <div
            className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              value.method === "BRANCH_PICKUP"
                ? "border-field-border-focus bg-field-border-focus"
                : "border-field-border bg-transparent"
            }`}
          >
            {value.method === "BRANCH_PICKUP" && (
              <div className="size-1.5 rounded-full bg-background" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-medium leading-tight">Branch pickup</span>
            <span className="text-[11.5px] text-muted-foreground mt-0.5">
              Collect at branch
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ method: "DELIVERY" })}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            value.method === "DELIVERY"
              ? "border-field-border-focus bg-field text-foreground"
              : "border-field-border bg-field hover:bg-field-hover text-foreground"
          }`}
        >
          <div
            className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              value.method === "DELIVERY"
                ? "border-field-border-focus bg-field-border-focus"
                : "border-field-border bg-transparent"
            }`}
          >
            {value.method === "DELIVERY" && (
              <div className="size-1.5 rounded-full bg-background" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-medium leading-tight">Doorstep delivery</span>
            <span className="text-[11.5px] text-muted-foreground mt-0.5">
              Courier delivery
            </span>
          </div>
        </button>
      </div>

      {/* One height-animated region for both modes, so the two panels swap inside it. Two separate collapses left an
          exiting panel and its flex gap behind, and the layout jumped when the exit finished. */}
      <SmoothHeight className="w-full" overflowWhenIdle="visible">
        {value.method === "BRANCH_PICKUP" && (
          <div key="branch" className="animate-in fade-in">
          <div className="flex flex-col gap-2 pt-1">
            <Label>
              Pickup Branch
            </Label>
            <BranchCombobox
              value={value.branch}
              onChange={(branch) => onChange({ branch })}
              branches={GCB_BRANCHES}
            />
          </div>
          </div>
        )}
        {value.method === "DELIVERY" && (
          <div key="delivery" className="animate-in fade-in">
          <div className="flex flex-col gap-3.5 pt-1">
            <div className="flex flex-col gap-2">
              <Label>
                Recipient Name
              </Label>
              <Input
                type="text"
                value={value.recipientName}
                onChange={(e) => onChange({ recipientName: e.target.value })}
                placeholder="Full name"
                
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Delivery Address
              </Label>
              <Input
                type="text"
                value={value.address}
                onChange={(e) => onChange({ address: e.target.value })}
                placeholder="Street or digital address"
                
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>City</Label>
                <Input
                  type="text"
                  value={value.city}
                  onChange={(e) => onChange({ city: e.target.value })}
                  placeholder="City"
                  
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Phone</Label>
                <PhoneInput
                  value={value.phone}
                  onValueChange={(phone) => onChange({ phone })}
                  aria-label="Delivery phone number"
                  className="h-13 rounded-2xl border-field-border bg-field px-4 text-[14px] focus-within:border-field-border-focus focus-within:ring-0"
                />
              </div>
            </div>
          </div>
          </div>
        )}
      </SmoothHeight>
    </>
  );
}
