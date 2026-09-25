/**
 * The shared step list for both onboarding flows (`/activate` for GCB account
 * holders, `/signup` for new-to-GCB). Either page opens on a step via
 * `?step=<id>` — the Demo hub uses it to jump anywhere in a flow.
 */

export const ONBOARDING_STEPS = [
  { id: "ghana_card", label: "Ghana Card" },
  { id: "selfie", label: "Selfie Match" },
  { id: "review_details", label: "Review Details" },
  { id: "otp", label: "Confirm Your Code" },
  { id: "password", label: "Create Your Password" },
  { id: "referral", label: "Referral Code" },
  { id: "pin", label: "Set Your PIN" },
  { id: "confirm_pin", label: "Confirm Your PIN" },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]["id"];

export function parseOnboardingStep(value: string | null): OnboardingStep | null {
  return ONBOARDING_STEPS.some((s) => s.id === value) ? (value as OnboardingStep) : null;
}
