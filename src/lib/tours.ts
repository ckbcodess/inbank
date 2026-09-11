/**
 * Guided onboarding tours for the Persona & Flow switcher.
 *
 * Each tour is one of the onboarding *user types*. A tour is pure data: an
 * ordered list of steps, each pointing at a `data-tour` anchor on a real
 * screen. The switcher runs any `startActorId` / navigates to the first step's
 * route, then `TourOverlay` spotlights each anchor in turn.
 *
 * Pass 1 walks the screens as they exist today (selfie stays in every flow).
 * Notes in the copy flag what Pass 2 will change (Wallet/Card split, a
 * device-trust selfie on the new-device path, a primary-account picker).
 */

export type TourIcon =
  | "userCheck"
  | "laptop"
  | "landmark"
  | "wallet"
  | "creditCard";

export interface TourStep {
  /** `data-tour` value to spotlight. */
  target: string;
  /** Pathname this step lives on (query ignored when matching). */
  route: string;
  /** Coach-card heading. */
  title: string;
  /** One or two sentences on what this step is and why. */
  body: string;
  /** Imperative hint — the actual thing to click. */
  action: string;
}

export interface Tour {
  id: string;
  /** Persona name shown on the launcher card. */
  name: string;
  /** The user type this tour demonstrates. */
  title: string;
  badge: string;
  summary: string;
  icon: TourIcon;
  /** Signed-in actor to seed before the first step (new-device path needs one). */
  startActorId?: string;
  /** Where the tour opens (may carry a query string). */
  startRoute: string;
  steps: TourStep[];
}

/* Shared step fragments so the four funnel entries stay identical where the
   real screens are identical. */
const ENTRY_PERSONAL: TourStep = {
  target: "entry-personal",
  route: "/",
  title: "Choose Personal banking",
  body: "Every retail journey starts here. Pick the Personal door.",
  action: "Click Personal",
};

const LOGIN_GET_STARTED: TourStep = {
  target: "login-get-started",
  route: "/login",
  title: "Open “Get started”",
  body: "First-time enrolment lives behind the sign-in form.",
  action: "Click “Get started”",
};

export const TOURS: Tour[] = [
  /* 1 ── Existing customer, not yet activated ─────────────────────────────── */
  {
    id: "existing-not-activated",
    name: "Ama Serwaa",
    title: "Existing customer · not activated",
    badge: "Activation",
    summary: "Already banks with GCB, switching internet banking on for the first time.",
    icon: "userCheck",
    startRoute: "/",
    steps: [
      ENTRY_PERSONAL,
      LOGIN_GET_STARTED,
      {
        target: "gs-existing",
        route: "/get-started",
        title: "“Yes — I have a GCB account”",
        body: "This routes an existing customer to activation, not account opening.",
        action: "Click the first option",
      },
      {
        target: "activate-card",
        route: "/activate",
        title: "Enter the Ghana Card",
        body: "Identity is matched against the NIA register. The demo number is prefilled.",
        action: "Click Continue",
      },
      {
        target: "activate-selfie",
        route: "/activate",
        title: "Capture a selfie",
        body: "A liveness selfie confirms it’s really her.",
        action: "Click Capture photo",
      },
      {
        target: "activate-review",
        route: "/activate",
        title: "Confirm the matched details",
        body: "Pulled from the account — nothing is retyped.",
        action: "Click Confirm and send code",
      },
      {
        target: "activate-otp",
        route: "/activate",
        title: "Enter the code",
        body: "Type any 6 digits, then verify.",
        action: "Enter the code and Verify",
      },
      {
        target: "activate-password",
        route: "/activate",
        title: "Create a password",
        body: "Any password works in this demo — enter 00000 to see the error state. Then continue.",
        action: "Click Save password and continue",
      },
      {
        target: "activate-pin",
        route: "/activate",
        title: "Set a transaction PIN",
        body: "The 4-digit PIN authorises payments. This finishes activation.",
        action: "Click Finish activation",
      },
    ],
  },

  /* 2 ── Existing customer, activated, new device ─────────────────────────── */
  {
    id: "new-device",
    name: "Yaw Oppong",
    title: "Existing customer · new device",
    badge: "Device trust",
    summary: "Already enrolled, signing in from an unrecognised browser.",
    icon: "laptop",
    startActorId: "u-yaw",
    startRoute: "/mfa?device=new",
    steps: [
      {
        target: "mfa-device-info",
        route: "/mfa",
        title: "New-device challenge",
        body: "GCB flagged an unrecognised browser and location, so it re-proves possession rather than identity. (A device-trust selfie is added in Pass 2.)",
        action: "Read the device details, then continue",
      },
      {
        target: "mfa-otp",
        route: "/mfa",
        title: "Enter the code",
        body: "Type any 6 digits — it auto-verifies, you can trust this browser for 30 days, and you land on the dashboard.",
        action: "Enter any 6 digits to finish",
      },
    ],
  },

  /* 3 ── New customer, open a full account (COS) ──────────────────────────── */
  {
    id: "new-cos",
    name: "Kofi Mensah",
    title: "New customer · open account (COS)",
    badge: "Account opening",
    summary: "New to GCB, opening a full account on the COOS origination portal.",
    icon: "landmark",
    startRoute: "/",
    steps: [
      ENTRY_PERSONAL,
      LOGIN_GET_STARTED,
      {
        target: "gs-new",
        route: "/get-started",
        title: "“No — I am new to GCB”",
        body: "Opens the new-customer options.",
        action: "Click the second option",
      },
      {
        target: "gs-cos",
        route: "/get-started",
        title: "Open a GCB Account",
        body: "A full account is opened on the COOS origination portal.",
        action: "Click Open a GCB Account",
      },
      {
        target: "gs-cos-confirm",
        route: "/get-started",
        title: "Continue to COOS",
        body: "This hands off to the secure account-opening portal (opens externally).",
        action: "Click Open account on COOS",
      },
    ],
  },

  /* 4 ── New customer, start with a Wallet ────────────────────────────────── */
  {
    id: "new-wallet",
    name: "Tsotsoo Mills",
    title: "New customer · start with Wallet",
    badge: "Wallet",
    summary: "Registers with Ghana Card, then links a mobile-money wallet.",
    icon: "wallet",
    startRoute: "/",
    steps: [
      ENTRY_PERSONAL,
      LOGIN_GET_STARTED,
      {
        target: "gs-new",
        route: "/get-started",
        title: "“No — I am new to GCB”",
        body: "Opens the new-customer options.",
        action: "Click the second option",
      },
      {
        target: "gs-walletcard",
        route: "/get-started",
        title: "Start with a Wallet or Card",
        body: "Register with Ghana Card and link mobile money. (Wallet and Card split into two options in Pass 2.)",
        action: "Click Start with a Wallet or Card",
      },
      {
        target: "signup-card",
        route: "/signup",
        title: "Enter the Ghana Card",
        body: "Verified against the NIA register. The demo number is prefilled.",
        action: "Click Proceed",
      },
      {
        target: "signup-selfie",
        route: "/signup",
        title: "Capture a selfie",
        body: "Liveness check — new customers prove identity from scratch.",
        action: "Click Take photo",
      },
      {
        target: "signup-review",
        route: "/signup",
        title: "Verify the details",
        body: "Confirm the information matched from national records.",
        action: "Click Proceed",
      },
      {
        target: "signup-otp",
        route: "/signup",
        title: "Enter the code",
        body: "Type any 6 digits, then proceed.",
        action: "Enter the code and Proceed",
      },
      {
        target: "signup-password",
        route: "/signup",
        title: "Set a password",
        body: "Any password works in this demo — enter 00000 to see the error state. Then continue.",
        action: "Click Proceed",
      },
      {
        target: "signup-pin",
        route: "/signup",
        title: "Create a PIN",
        body: "The 4-digit PIN authorises payments. This finishes registration and lands on linking a wallet.",
        action: "Click Proceed",
      },
    ],
  },

  /* 5 ── New customer, start with a Card ──────────────────────────────────── */
  {
    id: "new-card",
    name: "Tsotsoo Mills",
    title: "New customer · start with Card",
    badge: "Card",
    summary: "Registers with Ghana Card, then links a bank card as the funding source.",
    icon: "creditCard",
    startRoute: "/",
    steps: [
      ENTRY_PERSONAL,
      LOGIN_GET_STARTED,
      {
        target: "gs-new",
        route: "/get-started",
        title: "“No — I am new to GCB”",
        body: "Opens the new-customer options.",
        action: "Click the second option",
      },
      {
        target: "gs-walletcard",
        route: "/get-started",
        title: "Start with a Wallet or Card",
        body: "Same entry as Wallet today — a dedicated Card path arrives in Pass 2.",
        action: "Click Start with a Wallet or Card",
      },
      {
        target: "signup-card",
        route: "/signup",
        title: "Enter the Ghana Card",
        body: "Verified against the NIA register. The demo number is prefilled.",
        action: "Click Proceed",
      },
      {
        target: "signup-selfie",
        route: "/signup",
        title: "Capture a selfie",
        body: "Liveness check — new customers prove identity from scratch.",
        action: "Click Take photo",
      },
      {
        target: "signup-review",
        route: "/signup",
        title: "Verify the details",
        body: "Confirm the information matched from national records.",
        action: "Click Proceed",
      },
      {
        target: "signup-otp",
        route: "/signup",
        title: "Enter the code",
        body: "Type any 6 digits, then proceed.",
        action: "Enter the code and Proceed",
      },
      {
        target: "signup-password",
        route: "/signup",
        title: "Set a password",
        body: "Any password works in this demo — enter 00000 to see the error state. Then continue.",
        action: "Click Proceed",
      },
      {
        target: "signup-pin",
        route: "/signup",
        title: "Create a PIN",
        body: "The 4-digit PIN authorises payments. This finishes registration and lands on linking a card.",
        action: "Click Proceed",
      },
    ],
  },
];

export function findTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}
