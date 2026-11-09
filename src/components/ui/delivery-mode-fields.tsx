"use client";

/**
 * Mode of delivery — branch pickup (with the type-to-search branch picker) or
 * doorstep delivery (recipient, address, city, phone). Lifted out of Request a
 * Card so the cheque book request asks it the same way.
 */

import { BranchCombobox } from "@/components/ui/branch-combobox";
import { RadioGroup, type RadioOption } from "@/components/ui/radio-group";
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

const METHOD_OPTIONS: readonly RadioOption<DeliveryMethod>[] = [
  { value: "BRANCH_PICKUP", label: "Branch pickup", description: "Collect at branch" },
  { value: "DELIVERY", label: "Doorstep delivery", description: "Courier delivery" },
];

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

      <RadioGroup<DeliveryMethod>
        aria-label="Mode of Delivery"
        options={METHOD_OPTIONS}
        value={value.method}
        onChange={(method) => onChange({ method })}
      />

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
          <div className="flex flex-col gap-3 pt-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  className="h-11 rounded-2xl px-3 text-[14px]"
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
