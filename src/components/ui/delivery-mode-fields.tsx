"use client";

/**
 * Mode of delivery — branch pickup (with the type-to-search branch picker) or
 * doorstep delivery (recipient, address, city, phone). Lifted out of Request a
 * Card so the cheque book request asks it the same way.
 */

import { BranchCombobox } from "@/components/ui/branch-combobox";
import { SmoothCollapse } from "@/components/ui/smooth-height";
import { PhoneInput } from "@/components/ui/phone-input";
import { GCB_BRANCHES, type DeliveryMethod, type GcbBranch } from "@/lib/mock-data";

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
      <label className="text-[14px] font-medium text-foreground">
        Mode of delivery
      </label>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange({ method: "BRANCH_PICKUP" })}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            value.method === "BRANCH_PICKUP"
              ? "border-foreground bg-muted/40 dark:bg-muted/20 ring-1 ring-foreground/20 text-foreground shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/20 text-foreground"
          }`}
        >
          <div
            className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              value.method === "BRANCH_PICKUP"
                ? "border-foreground bg-foreground"
                : "border-muted-foreground/40 bg-transparent"
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
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            value.method === "DELIVERY"
              ? "border-foreground bg-muted/40 dark:bg-muted/20 ring-1 ring-foreground/20 text-foreground shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/20 text-foreground"
          }`}
        >
          <div
            className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              value.method === "DELIVERY"
                ? "border-foreground bg-foreground"
                : "border-muted-foreground/40 bg-transparent"
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

      <SmoothCollapse open={value.method === "BRANCH_PICKUP"} className="w-full">
        <div className="flex flex-col gap-2 pt-1">
          <label className="text-[14px] font-medium text-foreground">
            Pickup branch
          </label>
          <BranchCombobox
            value={value.branch}
            onChange={(branch) => onChange({ branch })}
            branches={GCB_BRANCHES}
          />
        </div>
      </SmoothCollapse>

      <SmoothCollapse open={value.method === "DELIVERY"} className="w-full">
        <div className="flex flex-col gap-3.5 pt-1">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">
              Recipient name
            </label>
            <input
              type="text"
              value={value.recipientName}
              onChange={(e) => onChange({ recipientName: e.target.value })}
              placeholder="Full name"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">
              Delivery address
            </label>
            <input
              type="text"
              value={value.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="Street or digital address"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-foreground">City</label>
              <input
                type="text"
                value={value.city}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="City"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-foreground">Phone</label>
              <PhoneInput
                value={value.phone}
                onValueChange={(phone) => onChange({ phone })}
                aria-label="Delivery phone number"
                className="h-13 rounded-2xl border-border/80 bg-card px-4 text-[15px] focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 dark:border-border/80 dark:bg-card dark:focus-within:bg-card"
              />
            </div>
          </div>
        </div>
      </SmoothCollapse>
    </>
  );
}
