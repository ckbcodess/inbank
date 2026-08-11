"use client";

/**
 * Suspension / Deactivation Modal — sections 7 and 8.
 *
 * 12.6 is explicit: this is a SINGLE shared compliance modal used from both
 * User Details (customer/corporate shell) and Customer Details (Admin Portal
 * shell) — built once, not twice. It lives outside both shells' folders for
 * that reason.
 *
 * The section 8 pattern itself now lives in ComplianceActionDialog, because
 * card block/unblock (FR-34) is a second confirmed application of it. This
 * component keeps the suspend/deactivate wording and call signature its two
 * existing call sites already use.
 */

import ComplianceActionDialog from "@/components/ComplianceActionDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { reason: string }) => void;
  /** Name of the user or customer being actioned. */
  subject: string;
  action: "suspend" | "deactivate";
  /** Step-up MFA is required for higher-risk changes (section 8). */
  requiresStepUp?: boolean;
}

export default function SuspensionDialog({
  open,
  onOpenChange,
  onConfirm,
  subject,
  action,
  requiresStepUp = true,
}: Props) {
  const verb = action === "suspend" ? "Suspend" : "Deactivate";

  return (
    <ComplianceActionDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={`${verb} ${subject}?`}
      confirmLabel={`${verb} now`}
      reasonPlaceholder={`Why is this ${action === "suspend" ? "suspension" : "deactivation"} being applied?`}
      destructive
      requiresStepUp={requiresStepUp}
    />
  );
}
