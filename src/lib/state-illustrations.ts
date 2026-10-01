/**
 * Registry of every illustrated state. One entry per *situation*, not per screen.
 *
 * To ship a drawing: export it as `public/illustrations/<id>.svg` (see the spec in
 * `.ai/STATES.md`), then flip `drawn` to true. Until then the screen keeps its
 * existing icon, so nothing breaks or 404s while the set is being drawn.
 */

export type Placement = "empty" | "success" | "moment";

/** Rendered size in CSS px per placement. Author the SVG at 2x this in its viewBox. */
export const PLACEMENT_SIZE: Record<Placement, { w: number; h: number }> = {
  empty: { w: 200, h: 132 },
  success: { w: 240, h: 160 },
  moment: { w: 320, h: 200 },
};

interface Entry {
  placement: Placement;
  /** What the picture is for, in words the illustrator can work from. */
  brief: string;
  /** The SVG exists in public/illustrations. Flip this when the file ships. */
  drawn: boolean;
  /** A `<id>.dark.svg` exists too. Without it, the light file is used in dark mode. */
  dark?: boolean;
}

export const STATE_ILLUSTRATIONS = {
  // Shared situations
  "caught-up": { placement: "empty", brief: "Nothing waiting on you. Calm, a small reward.", drawn: false },
  "no-results": { placement: "empty", brief: "A filter or search matched nothing. Neutral.", drawn: false },
  "load-error": { placement: "empty", brief: "Couldn't load. Reassuring: your data is safe.", drawn: false },

  // First-time empty, one per domain object
  "empty-cards": { placement: "empty", brief: "No cards yet. Invitation to request one.", drawn: false },
  "empty-activity": { placement: "empty", brief: "No transactions or activity yet.", drawn: false },
  "empty-people": { placement: "empty", brief: "No people or billers saved.", drawn: false },
  "empty-groups": { placement: "empty", brief: "No payment groups.", drawn: false },
  "empty-standing": { placement: "empty", brief: "No standing orders.", drawn: false },
  "empty-sources": { placement: "empty", brief: "No cards or wallets linked.", drawn: false },
  "empty-statements": { placement: "empty", brief: "No statements available.", drawn: false },
  "empty-rates": { placement: "empty", brief: "No FX rates published today.", drawn: false },
  "empty-chart": { placement: "empty", brief: "No spend in this period.", drawn: false },

  // Success screens
  "success-sent": { placement: "success", brief: "Money sent or paid.", drawn: false },
  "success-scheduled": { placement: "success", brief: "Payment scheduled or repeating.", drawn: false },
  "success-created": { placement: "success", brief: "Something created: card requested, group made, account requested.", drawn: false },
  "success-funded": { placement: "success", brief: "Source linked or wallet funded.", drawn: false },
  "success-welcome": { placement: "success", brief: "Account opened, onboarding done.", drawn: false },
  "success-pending-approval": { placement: "success", brief: "Sent for approval (maker-checker).", drawn: false },
  "success-secured": { placement: "success", brief: "Password reset or card verified.", drawn: false },

  // Moments: one-time milestones, modals and interstitials
  "moment-welcome": { placement: "moment", brief: "First-run welcome. Warm, the biggest one.", drawn: false },
  "moment-account-ready": { placement: "moment", brief: "Virtual wallet / GCB account is ready.", drawn: false },
  "moment-migration-welcome": { placement: "moment", brief: "Welcome for migrating customers.", drawn: false },

  // Card delivery journey
  "delivery-preparing": { placement: "moment", brief: "Card is being prepared / in production.", drawn: false },
  "delivery-in-transit": { placement: "moment", brief: "Card is on the way.", drawn: false },
  "delivery-out-for-delivery": { placement: "moment", brief: "Rider has the card, arriving today.", drawn: false },
  "delivery-ready-for-pickup": { placement: "moment", brief: "Card is ready at the branch.", drawn: false },
  "delivery-arrived": { placement: "moment", brief: "Card has arrived, needs activating.", drawn: false },
} as const satisfies Record<string, Entry>;

export type StateIllustrationId = keyof typeof STATE_ILLUSTRATIONS;
