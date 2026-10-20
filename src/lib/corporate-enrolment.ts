/**
 * Corporate Internet Banking Enrolment.
 *
 * Enables companies that already hold accounts with GCB Bank to self-serve
 * onboarding onto Corporate Internet Banking.
 *
 * Flow:
 *   Account lookup -> Applicant verification -> Users & roles configuration
 *   -> Review -> Wet-ink mandate pack download & upload -> Submitted
 *
 * Staff Review (Admin portal):
 *   RM or Corporate Operations review -> Signature specimen comparison
 *   -> Verification phone call log -> Approval (or Return/Reject)
 *   -> Activation invite links issued to all listed corporate users.
 */

/* ── Flow Steps & Dev Scenarios ────────────────────────────────────────────── */

export type CorporateEnrolmentStep =
  | "account"
  | "contact"
  | "users"
  | "review"
  | "sign"
  | "submitted";

export type CorporateEnrolmentVariant =
  | "default"
  | "notFound"
  | "alreadyEnrolled"
  | "multiAccount"
  | "noRm";

export interface CorporateEnrolmentScenario {
  id: string;
  label: string;
  step: CorporateEnrolmentStep;
  variant: CorporateEnrolmentVariant;
}

export const CORPORATE_ENROLMENT_SCENARIOS: readonly CorporateEnrolmentScenario[] = [
  { id: "enrol-account", label: "Step 1 · Find account", step: "account", variant: "default" },
  { id: "enrol-not-found", label: "Step 1 · Account not found", step: "account", variant: "notFound" },
  { id: "enrol-already-enrolled", label: "Step 1 · Already enrolled", step: "account", variant: "alreadyEnrolled" },
  { id: "enrol-multi-account", label: "Step 1 · Multi-account company", step: "account", variant: "multiAccount" },
  { id: "enrol-no-rm", label: "Step 1 · Company without RM", step: "account", variant: "noRm" },
  { id: "enrol-contact", label: "Step 2 · Applicant details & OTP", step: "contact", variant: "default" },
  { id: "enrol-users", label: "Step 3 · Users & role mandate", step: "users", variant: "default" },
  { id: "enrol-review", label: "Step 4 · Review application", step: "review", variant: "default" },
  { id: "enrol-sign", label: "Step 5 · Download & upload pack", step: "sign", variant: "default" },
  { id: "enrol-submitted", label: "Step 6 · Submitted", step: "submitted", variant: "default" },
];

export const CORPORATE_ENROLMENT_SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  CORPORATE_ENROLMENT_SCENARIOS.map((s) => [s.id, s.label]),
);

export const CORPORATE_ENROLMENT_SCENARIO_IDS = CORPORATE_ENROLMENT_SCENARIOS.map((s) => s.id);

export function findCorporateEnrolmentScenario(id: string): CorporateEnrolmentScenario | undefined {
  return CORPORATE_ENROLMENT_SCENARIOS.find((s) => s.id === id);
}

/* ── Roles & Descriptions ──────────────────────────────────────────────────── */

export type CorporateAppRole = "Maker" | "Approver" | "Corporate Admin" | "Viewer";

export interface RoleExplanation {
  role: CorporateAppRole;
  title: string;
  tagline: string;
  description: string;
}

export const CORPORATE_ROLE_EXPLANATIONS: Record<CorporateAppRole, RoleExplanation> = {
  Maker: {
    role: "Maker",
    title: "Maker",
    tagline: "Maker · initiates payments & transfers",
    description: "Can create payments, upload bulk files, and draft trade requests. Cannot authorise them.",
  },
  Approver: {
    role: "Approver",
    title: "Approver",
    tagline: "Approver · authorises payments & trade",
    description: "Reviews and approves transactions in line with the signing mandate before money leaves.",
  },
  "Corporate Admin": {
    role: "Corporate Admin",
    title: "Corporate Admin",
    tagline: "Admin · manages users & access",
    description: "Provisions company users, manages user permissions, and reviews organization audit logs.",
  },
  Viewer: {
    role: "Viewer",
    title: "Viewer",
    tagline: "Viewer · view and statement access only",
    description: "Read-only access to view balances, account activity, and download statements.",
  },
};

/* ── Domain Model ──────────────────────────────────────────────────────────── */

export interface CorporateUserDraft {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: CorporateAppRole;
  ghanaCard?: string;
  dateAppointed?: string;
  isFromMandate?: boolean;
  inviteStatus?: "pending" | "sent" | "used" | "expired";
  inviteToken?: string;
}

export interface EnrolledAccountSummary {
  id: string;
  name: string;
  number: string;
  currency: string;
  type: string;
  balance?: number;
}

export interface CompanyApplicant {
  name: string;
  mobile: string;
  email: string;
  ghanaCard?: string;
}

export interface SignatureCheckItem {
  signatoryName: string;
  role: string;
  specimenUrl?: string;
  status: "unreviewed" | "match" | "no_match";
  notes?: string;
}

export interface VerificationCallLog {
  logged: boolean;
  calledNumber: string;
  answeredBy: string;
  outcome: "verified" | "unreachable" | "failed" | null;
  callNotes?: string;
  calledAt?: string;
  loggedBy?: string;
}

export interface EnrolmentReturnRecord {
  id: string;
  at: string;
  by: string;
  reason: string;
  details: string;
  flaggedItems: string[];
  resolved: boolean;
  resubmittedAt?: string;
}

export interface EnrolmentTimelineEvent {
  status: string;
  label: string;
  description: string;
  timestamp: string;
  done: boolean;
  current: boolean;
}

export type EnrolmentStatus =
  | "received"
  | "rm_review"
  | "checking_signatures"
  | "call_verification"
  | "approved"
  | "returned"
  | "rejected";

export interface EnrolmentStaffAssignment {
  type: "rm" | "operations";
  name: string;
  email?: string;
  phone?: string;
}

export interface EnrolmentApplication {
  reference: string;
  createdAt: string;
  updatedAt: string;
  companyName: string;
  companyTin: string;
  companyAddress?: string;
  accounts: EnrolledAccountSummary[];
  applicant: CompanyApplicant;
  users: CorporateUserDraft[];
  mandate: string;
  approvalRule: string;
  pack: {
    downloadUrl?: string;
    uploadedFileName?: string;
    uploadedFileSize?: string;
    uploadedAt?: string;
  };
  status: EnrolmentStatus;
  assignedTo: EnrolmentStaffAssignment;
  signatureChecks: SignatureCheckItem[];
  verificationCall: VerificationCallLog;
  returns: EnrolmentReturnRecord[];
  rejectionReason?: string;
  timeline: EnrolmentTimelineEvent[];
}

/* ── Lookup helpers ────────────────────────────────────────────────────────── */

export interface MockCompanyLookupResult {
  found: boolean;
  alreadyEnrolled?: boolean;
  companyName?: string;
  tin?: string;
  accounts?: EnrolledAccountSummary[];
  mandate?: string;
  approvalRule?: string;
  relationshipManager?: { name: string; email: string; phone: string } | null;
  mandateSignatories?: Array<{
    name: string;
    role: string;
    email: string;
    mobile: string;
    specimenUrl?: string;
  }>;
}

/**
 * Normalises account number entry (removes spaces and hyphens).
 */
export function cleanAccountNumber(input: string): string {
  return input.replace(/[\s-]/g, "");
}

/**
 * Known mock corporate accounts for demo lookup.
 */
export const MOCK_CORPORATE_COMPANIES: Record<string, {
  companyName: string;
  tin: string;
  alreadyEnrolled?: boolean;
  mandate: string;
  approvalRule: string;
  relationshipManager: { name: string; email: string; phone: string } | null;
  accounts: EnrolledAccountSummary[];
  signatories: Array<{
    name: string;
    role: string;
    email: string;
    mobile: string;
    specimenUrl?: string;
  }>;
}> = {
  // 1. Adinkra Textiles Ltd - Multi-account company with dedicated RM
  "100123456789": {
    companyName: "Adinkra Textiles Ltd",
    tin: "C0012345678",
    alreadyEnrolled: false,
    mandate: "Both to sign",
    approvalRule: "Dual authorization: 1 Signatory A (Director) + 1 Signatory B (Finance)",
    relationshipManager: {
      name: "Kwame Asante",
      email: "kwame.asante@gcb.com.gh",
      phone: "+233 24 499 1821",
    },
    accounts: [
      { id: "acc-001", name: "Corporate Current Account", number: "1001 2345 6789", currency: "GHS", type: "Current", balance: 1284530.44 },
      { id: "acc-002", name: "Payroll Account", number: "1001 2345 7710", currency: "GHS", type: "Current", balance: 342118.90 },
      { id: "acc-003", name: "USD Trade Account", number: "2200 8891 0043", currency: "USD", type: "Foreign Currency", balance: 486220.15 },
    ],
    signatories: [
      { name: "Yaw Oppong", role: "Managing Director (Signatory A)", email: "yaw.oppong@adinkratextiles.com", mobile: "0244123456", specimenUrl: "/signatures/specimen-yaw.svg" },
      { name: "Esther Appiah", role: "Finance Director (Signatory B)", email: "esther.appiah@adinkratextiles.com", mobile: "0244300412", specimenUrl: "/signatures/specimen-esther.svg" },
      { name: "Kwame Boateng", role: "Executive Director (Signatory A)", email: "kwame.boateng@adinkratextiles.com", mobile: "0244300411", specimenUrl: "/signatures/specimen-kwame.svg" },
    ],
  },
  // 2. Volta River Logistics - Single account company, no dedicated RM (handled by Operations Team)
  "100188442200": {
    companyName: "Volta River Logistics Ltd",
    tin: "C0098765432",
    alreadyEnrolled: false,
    mandate: "Either to sign",
    approvalRule: "Single authorization: Any registered Signatory can approve up to GHS 500,000",
    relationshipManager: null, // Assigned to Corporate Banking Team
    accounts: [
      { id: "acc-volta-1", name: "Commercial Operating Account", number: "1001 8844 2200", currency: "GHS", type: "Current", balance: 780400.00 },
    ],
    signatories: [
      { name: "Kofi Mensah", role: "Chief Executive Officer", email: "kofi.mensah@voltariver.com", mobile: "0201200314", specimenUrl: "/signatures/specimen-kofi.svg" },
      { name: "Ama Serwaa", role: "Chief Operating Officer", email: "ama.serwaa@voltariver.com", mobile: "0244889911", specimenUrl: "/signatures/specimen-ama.svg" },
    ],
  },
  // 3. Gold Coast Agro Processing - Already enrolled demo
  "100199224411": {
    companyName: "Gold Coast Agro Processing Ltd",
    tin: "C0044556677",
    alreadyEnrolled: true,
    mandate: "Any two to sign",
    approvalRule: "Two approvers required for any disbursement above GHS 100,000",
    relationshipManager: {
      name: "Abena Owusu",
      email: "abena.owusu@gcb.com.gh",
      phone: "+233 24 440 0512",
    },
    accounts: [
      { id: "acc-agro-1", name: "Primary Treasury", number: "1001 9922 4411", currency: "GHS", type: "Current", balance: 3500000.00 },
    ],
    signatories: [
      { name: "Nana Addo Dankwa", role: "Chairman", email: "nana.addo@goldcoastagro.com", mobile: "0244400511", specimenUrl: "/signatures/specimen-nana.svg" },
    ],
  },
};

/**
 * Looks up a company by account number.
 */
export function lookupCorporateAccount(rawAccountNumber: string): MockCompanyLookupResult {
  const cleaned = cleanAccountNumber(rawAccountNumber);
  const found = MOCK_CORPORATE_COMPANIES[cleaned];

  if (!found) {
    return { found: false };
  }

  return {
    found: true,
    alreadyEnrolled: found.alreadyEnrolled,
    companyName: found.companyName,
    tin: found.tin,
    accounts: found.accounts,
    mandate: found.mandate,
    approvalRule: found.approvalRule,
    relationshipManager: found.relationshipManager,
    mandateSignatories: found.signatories,
  };
}

/**
 * Formats enrolment reference for display.
 */
export function formatEnrolmentRef(ref: string): string {
  return ref.toUpperCase();
}
