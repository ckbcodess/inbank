/**
 * Corporate Internet Banking enrolment: a company that already banks with GCB asks for internet banking.
 *
 * This follows how GCB onboards companies today (Esther, 2026-10-16): a request letter on company letterhead
 * plus the internet banking application form, signed per the mandate. The bank checks the signatures against
 * the specimens in Flexcube, the RM, branch or central team approves, and each user then gets their sign-in
 * details. The online journey only changes how the paperwork starts: the customer fills the form here, we write
 * the letter for them, and they upload it signed (or email it, post it or bring it to a branch). Applications
 * captured by branch staff land in the same queue (FR-ADM-05), so there is one store and one status.
 *
 *   Customer (/business/signup/enrol):
 *     Account -> Who's applying -> Code -> Users -> Review -> Letter -> Submitted
 *   Anyone at the company can apply, a signatory or not (designer, 2026-10-22). A company secretary gives their
 *   own details and proves their number with the code; the signatories approve by signing the letter.
 *   Customer (/business/signup/status): reference -> code -> status, re-upload in place
 *   Staff (/admin/enrolments): signature check against Flexcube -> callback -> approve, return or decline
 */

/* ── Flow steps and Demo hub scenarios ─────────────────────────────────────── */

export type CorporateEnrolmentStep =
  | "account"
  | "applicant"
  | "otp"
  | "users"
  | "review"
  | "letter"
  | "submitted";

/** The steps that count towards the progress bar (Submitted is the end state, not a step). */
export const ENROLMENT_PROGRESS_STEPS: CorporateEnrolmentStep[] = [
  "account",
  "applicant",
  "otp",
  "users",
  "review",
  "letter",
];

export type CorporateEnrolmentOutcome = "not-found" | "already-enrolled";

export interface CorporateEnrolmentScenario {
  id: string;
  label: string;
  step?: CorporateEnrolmentStep;
  outcome?: CorporateEnrolmentOutcome;
  /** Which demo account the scenario opens with. */
  account?: string;
  /** Opens with someone who isn't on the mandate applying (the demo company secretary). */
  nonSignatory?: boolean;
}

export const CORPORATE_ENROLMENT_SCENARIOS: readonly CorporateEnrolmentScenario[] = [
  { id: "account", label: "Find your company", step: "account" },
  { id: "applicant", label: "Who's applying", step: "applicant" },
  { id: "applicant-other", label: "Company secretary applying", step: "applicant", nonSignatory: true },
  { id: "otp", label: "Confirm code", step: "otp" },
  { id: "users", label: "Users and roles", step: "users" },
  { id: "review", label: "Review", step: "review" },
  { id: "letter", label: "Sign the letter", step: "letter" },
  { id: "submitted", label: "Submitted", step: "submitted" },
  { id: "no-rm", label: "Company without an RM", step: "account", account: "1001 8844 2200" },
  { id: "not-found", label: "Account not found", outcome: "not-found" },
  { id: "already-enrolled", label: "Already on internet banking", outcome: "already-enrolled" },
];

export function findCorporateEnrolmentScenario(id: string): CorporateEnrolmentScenario | undefined {
  return CORPORATE_ENROLMENT_SCENARIOS.find((s) => s.id === id);
}

/* ── Roles ─────────────────────────────────────────────────────────────────── */

/**
 * The roles a company asks for. The bank's form says Initiator; BRD v2 calls the same role Inputter, so we use
 * that. Reviewer is v2's middle step (BRL-03). Viewer is on the form but not in v2, an open question in WORKING_LOG.
 */
export type CorporateAppRole = "Inputter" | "Reviewer" | "Authoriser" | "Viewer";

export const CORPORATE_ROLES: readonly CorporateAppRole[] = ["Inputter", "Reviewer", "Authoriser", "Viewer"];

export const CORPORATE_ROLE_LINE: Record<CorporateAppRole, string> = {
  Inputter: "Prepares payments. Someone else reviews and authorises them.",
  Reviewer: "Checks payments and passes them on, or sends them back with a comment.",
  Authoriser: "Gives the final approval that sends a payment.",
  Viewer: "Sees balances, statements and history.",
};

/** Reviewers and authorisers must be named on the mandate (BRL-03), so someone added by the applicant can be neither. */
export function rolesFor(isFromMandate: boolean): readonly CorporateAppRole[] {
  return isFromMandate ? CORPORATE_ROLES : CORPORATE_ROLES.filter((r) => r !== "Authoriser" && r !== "Reviewer");
}

/** A company needs someone to prepare payments and someone else to approve them (BRL-04). */
export function usersReady(users: Pick<CorporateUserDraft, "role">[]): string {
  const hasInputter = users.some((u) => u.role === "Inputter");
  const hasAuthoriser = users.some((u) => u.role === "Authoriser");
  if (!hasInputter && !hasAuthoriser) return "Add at least one Inputter and one Authoriser.";
  if (!hasInputter) return "Add at least one Inputter, so someone can prepare payments.";
  if (!hasAuthoriser) return "Make at least one signatory an Authoriser, so payments can be approved.";
  return "";
}

/* ── Domain model ──────────────────────────────────────────────────────────── */

export interface CorporateUserDraft {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: CorporateAppRole;
  /** Signatories carry their designation from the mandate. */
  designation?: string;
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
  /** Staff-side only. The customer journey never shows balances. */
  balance?: number;
}

export interface CompanyApplicant {
  name: string;
  mobile: string;
  email: string;
  ghanaCard?: string;
  /** Their position at the company. A signatory's comes from the mandate. */
  designation?: string;
  /** False for someone applying who isn't on the mandate, such as a company secretary. */
  isSignatory: boolean;
}

/** The demo company secretary who applies without being a signatory. */
export const NON_SIGNATORY_DEMO: Omit<CompanyApplicant, "isSignatory"> = {
  name: "Adwoa Mensah",
  designation: "Company Secretary",
  mobile: "0244300420",
  email: "adwoa.mensah@adinkratextiles.com",
};

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
  | "awaiting_letter"
  | "received"
  | "rm_review"
  | "checking_signatures"
  | "call_verification"
  | "approved"
  | "returned"
  | "rejected";

/** How the application reached the bank. Email, post and branch are captured by staff. */
export type EnrolmentChannel = "online" | "email" | "post" | "branch";

/** How the signed letter reached the bank. */
export type LetterChannel = "upload" | "email" | "post" | "branch";

export const CHANNEL_LABEL: Record<EnrolmentChannel | LetterChannel, string> = {
  online: "Online",
  upload: "Uploaded online",
  email: "Email",
  post: "Post",
  branch: "Branch",
};

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
  channel: EnrolmentChannel;
  companyName: string;
  companyTin: string;
  companyAddress?: string;
  /** The company's own address on file, copied on every update so the signatories hear about it too. */
  companyEmail?: string;
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
    receivedVia?: LetterChannel;
  };
  status: EnrolmentStatus;
  assignedTo: EnrolmentStaffAssignment;
  signatureChecks: SignatureCheckItem[];
  verificationCall: VerificationCallLog;
  returns: EnrolmentReturnRecord[];
  rejectionReason?: string;
  timeline: EnrolmentTimelineEvent[];
}

/* ── Company lookup (mock Flexcube) ────────────────────────────────────────── */

export interface MandateSignatory {
  name: string;
  /** The designation held on the mandate, e.g. "Managing Director". */
  designation: string;
  /** The signing class, where the mandate uses one. */
  signingClass?: "A" | "B";
  email: string;
  mobile: string;
  ghanaCard: string;
  specimenUrl?: string;
}

export interface CorporateCompanyRecord {
  companyName: string;
  tin: string;
  address: string;
  /** The company's email address on file in Flexcube. */
  email: string;
  alreadyEnrolled?: boolean;
  mandate: string;
  /** The signing rule in plain words, used on the letter and the status page. */
  signingRule: string;
  approvalRule: string;
  relationshipManager: { name: string; email: string; phone: string } | null;
  accounts: EnrolledAccountSummary[];
  signatories: MandateSignatory[];
}

/** Who reviews an application when the company has no RM. */
export const CORPORATE_BANKING_TEAM = {
  name: "Corporate Banking Team",
  email: "corporate.onboarding@gcb.com.gh",
  phone: "+233 30 268 1521",
};

/** Strips spaces and hyphens from a typed account number. */
export function cleanAccountNumber(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export const MOCK_CORPORATE_COMPANIES: Record<string, CorporateCompanyRecord> = {
  // Several accounts and a dedicated RM
  "100123456789": {
    companyName: "Adinkra Textiles Ltd",
    tin: "C0012345678",
    address: "Plot 14 Industrial Area, North Kaneshie, Accra",
    email: "info@adinkratextiles.com",
    mandate: "Both to sign",
    signingRule: "one Signatory A and one Signatory B",
    approvalRule: "Dual authorisation: 1 Signatory A (Director) + 1 Signatory B (Finance)",
    relationshipManager: {
      name: "Kwame Asante",
      email: "kwame.asante@gcb.com.gh",
      phone: "+233 24 499 1821",
    },
    accounts: [
      { id: "acc-001", name: "Corporate Current Account", number: "1001 2345 6789", currency: "GHS", type: "Current", balance: 1284530.44 },
      { id: "acc-002", name: "Payroll Account", number: "1001 2345 7710", currency: "GHS", type: "Current", balance: 342118.9 },
      { id: "acc-003", name: "USD Trade Account", number: "2200 8891 0043", currency: "USD", type: "Foreign Currency", balance: 486220.15 },
    ],
    signatories: [
      { name: "Yaw Oppong", designation: "Managing Director", signingClass: "A", email: "yaw.oppong@adinkratextiles.com", mobile: "0244123456", ghanaCard: "GHA-789012345-1", specimenUrl: "/signatures/specimen-yaw.svg" },
      { name: "Esther Appiah", designation: "Finance Director", signingClass: "B", email: "esther.appiah@adinkratextiles.com", mobile: "0244300412", ghanaCard: "GHA-345678901-2", specimenUrl: "/signatures/specimen-esther.svg" },
      { name: "Ransford Gyasi", designation: "Executive Director", signingClass: "A", email: "ransford.gyasi@adinkratextiles.com", mobile: "0244300411", ghanaCard: "GHA-334455667-8", specimenUrl: "/signatures/specimen-kwame.svg" },
    ],
  },
  // One account, no RM: the Corporate Banking Team reviews it
  "100188442200": {
    companyName: "Volta River Logistics Ltd",
    tin: "C0098765432",
    address: "Harbour Road, Tema",
    email: "operations@voltariver.com",
    mandate: "Either to sign",
    signingRule: "either signatory",
    approvalRule: "Single authorisation: any registered signatory can approve up to GHS 500,000",
    relationshipManager: null,
    accounts: [
      { id: "acc-volta-1", name: "Commercial Operating Account", number: "1001 8844 2200", currency: "GHS", type: "Current", balance: 780400 },
    ],
    signatories: [
      { name: "Kofi Mensah", designation: "Chief Executive Officer", email: "kofi.mensah@voltariver.com", mobile: "0201200314", ghanaCard: "GHA-901234567-3", specimenUrl: "/signatures/specimen-kofi.svg" },
      { name: "Ama Serwaa", designation: "Chief Operating Officer", email: "ama.serwaa@voltariver.com", mobile: "0244889911", ghanaCard: "GHA-123456789-0", specimenUrl: "/signatures/specimen-ama.svg" },
    ],
  },
  // Already on internet banking
  "100199224411": {
    companyName: "Gold Coast Agro Processing Ltd",
    tin: "C0044556677",
    address: "Spintex Road, Accra",
    email: "admin@goldcoastagro.com",
    alreadyEnrolled: true,
    mandate: "Any two to sign",
    signingRule: "any two signatories",
    approvalRule: "Two approvers required for any disbursement above GHS 100,000",
    relationshipManager: {
      name: "Abena Owusu",
      email: "abena.owusu@gcb.com.gh",
      phone: "+233 24 440 0512",
    },
    accounts: [
      { id: "acc-agro-1", name: "Primary Treasury", number: "1001 9922 4411", currency: "GHS", type: "Current", balance: 3500000 },
    ],
    signatories: [
      { name: "Nana Addo Dankwa", designation: "Chairman", email: "nana.addo@goldcoastagro.com", mobile: "0244400511", ghanaCard: "GHA-556677889-1", specimenUrl: "/signatures/specimen-nana.svg" },
    ],
  },
};

export const ENROLMENT_DEMO_ACCOUNTS = {
  default: "1001 2345 6789",
  noRm: "1001 8844 2200",
  alreadyEnrolled: "1001 9922 4411",
  notFound: "9999 0000 1111",
} as const;

export function lookupCorporateAccount(rawAccountNumber: string): CorporateCompanyRecord | null {
  return MOCK_CORPORATE_COMPANIES[cleanAccountNumber(rawAccountNumber)] ?? null;
}

/** "Managing Director · Signatory A" */
export function signatoryLabel(s: Pick<MandateSignatory, "designation" | "signingClass">): string {
  return s.signingClass ? `${s.designation} · Signatory ${s.signingClass}` : s.designation;
}

/** "•••• 6789" */
export function lastFour(accountNumber: string): string {
  return `•••• ${accountNumber.replace(/\s/g, "").slice(-4)}`;
}

/** Who will review the application, in a sentence-ready form. */
export function reviewerFor(record: Pick<CorporateCompanyRecord, "relationshipManager">): EnrolmentStaffAssignment {
  return record.relationshipManager
    ? { type: "rm", ...record.relationshipManager }
    : { type: "operations", ...CORPORATE_BANKING_TEAM };
}

export function newEnrolmentReference(): string {
  return `ENR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
