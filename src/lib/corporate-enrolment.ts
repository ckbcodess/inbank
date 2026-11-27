/**
 * Business internet banking enrolment: a company or a sole proprietor that already banks with GCB asks for internet
 * banking. Retail covers personal and joint accounts only; every other account, sole proprietors included, comes here
 * (bank meeting, 2026-11-26).
 *
 *   Customer (/business/signup/enrol?type=company|sole), the bank's form rethought (designer, 2026-11-26):
 *     Your details -> Company details -> Accounts -> Authorised users -> Letter (download it filled in, upload it
 *     signed, accept the terms) -> Submitted
 *   The request is saved when the letter screen opens, because signatures take days; the emailed link
 *   (`?upload=<reference>`) brings them back to upload it.
 *
 *   The form's answers become a letter the signatories sign, so the signature covers exactly what was asked for, and
 *   staff get the answers as data to check rather than retype. Nothing is looked up online: account numbers are typed
 *   and staff match them in Flexcube. No tracking page: updates go to the requester and the business's official email.
 *
 *   Staff (/admin/enrolments): letter against the answers, Flexcube, signature check -> callback -> approve or return
 */

/* ── Flow steps and Demo hub scenarios ─────────────────────────────────────── */

/** `upload` is where the emailed link lands, to upload the signed letter later. */
export type CorporateEnrolmentStep = "details" | "business" | "accounts" | "people" | "letter" | "submitted" | "upload";

/** The steps that count towards the progress bar (Submitted is the end state, not a step). */
export const ENROLMENT_PROGRESS_STEPS: CorporateEnrolmentStep[] = ["details", "business", "accounts", "people", "letter"];

/** A sole proprietor fills in the same form as a company; only the wording changes. */
export type BusinessKind = "company" | "sole";

export interface CorporateEnrolmentScenario {
  id: string;
  label: string;
  step: CorporateEnrolmentStep;
  kind?: BusinessKind;
}

export const CORPORATE_ENROLMENT_SCENARIOS: readonly CorporateEnrolmentScenario[] = [
  { id: "details", label: "Your details", step: "details" },
  { id: "business", label: "Company details", step: "business" },
  { id: "accounts", label: "Accounts", step: "accounts" },
  { id: "people", label: "Authorised users", step: "people" },
  { id: "letter", label: "Letter of request", step: "letter" },
  { id: "submitted", label: "Submitted", step: "submitted" },
  { id: "upload", label: "Upload the letter later", step: "upload" },
  { id: "sole", label: "Sole proprietor applying", step: "details", kind: "sole" },
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
  Inputter: "Prepares payments for others to approve.",
  Reviewer: "Checks payments, then passes them on or sends them back.",
  Authoriser: "Gives the final approval that sends a payment.",
  Viewer: "Sees balances, statements and history.",
};

/** Reviewers and authorisers must be named on the mandate (BRL-03), so someone added by the applicant can be neither. */
export function rolesFor(isFromMandate: boolean): readonly CorporateAppRole[] {
  return isFromMandate ? CORPORATE_ROLES : CORPORATE_ROLES.filter((r) => r !== "Authoriser" && r !== "Reviewer");
}

/** What a person may do, beyond seeing accounts. The bank's form also lists term deposits and trade inquiries. */
export type CorporateService = "transfers" | "bulk" | "trade";

/**
 * The services a user can be given, named as the bank's form names them (FT, BU and TI), so the letter and the
 * bank's records use the same words (designer, 2026-11-26). Trade Inquiries came back at the designer's request
 * (2026-11-26) although the bank said on 2026-11-18 it isn't active on its platform yet (open in WORKING_LOG). Term
 * deposits (TD) are on the form but not offered.
 */
export const CORPORATE_SERVICES: readonly { id: CorporateService; label: string }[] = [
  { id: "transfers", label: "Funds Transfer" },
  { id: "bulk", label: "Bulk Uploads (Salary Processing)" },
  { id: "trade", label: "Trade Inquiries" },
];

export function serviceLabels(services: readonly CorporateService[]): string {
  return CORPORATE_SERVICES.filter((s) => services.includes(s.id))
    .map((s) => s.label)
    .join(", ");
}

/** What the bank sets when the form's limit is left empty: GHS 10,000 for one payment (bank walkthrough, 2026-11-18). */
export const DEFAULT_USER_LIMIT = 10_000;

/** The bank's form this application replaces; its terms are the ones signatories accept. */
export const BANK_FORM_NUMBER = "GCB/IBCAF/2014/038";

/** Where the corporate terms are read. A placeholder until the bank hosts the document (see WORKING_LOG). */
export const TERMS_URL = "https://www.gcbbank.com.gh";

/** Viewers only see balances and history, so they carry no limit and no services. No role chosen yet acts on nothing. */
export function roleActs(role: CorporateAppRole | null): role is Exclude<CorporateAppRole, "Viewer"> {
  return role !== null && role !== "Viewer";
}

/** What's missing from one person's access, or "". */
export function accessProblem(user: Pick<CorporateUserDraft, "role" | "limit" | "accountIds" | "services">): string {
  if (!user.role) return "Choose a role.";
  if (user.accountIds.length === 0) return "Choose at least one account.";
  if (!roleActs(user.role)) return "";
  if (user.services.length === 0) return "Choose at least one service.";
  if (user.limit <= 0) return "Enter a limit for one payment.";
  return "";
}

/**
 * What the people list still needs, as the Continue button says it, or "". As on the bank's form, a business that
 * only wants to view can list viewers alone. Anyone who prepares payments needs someone else to approve them
 * (BRL-04), and an authoriser in a company needs someone to prepare them. A sole proprietor can be alone as an
 * Authoriser: they approve their own payments.
 */
export function usersReady(users: CorporateUserDraft[], kind: BusinessKind = "company"): string {
  if (users.length === 0) return "Add a User";
  const hasInputter = users.some((u) => u.role === "Inputter");
  const hasAuthoriser = users.some((u) => u.role === "Authoriser");
  if (hasInputter && !hasAuthoriser) return "Add an Authoriser";
  if (hasAuthoriser && !hasInputter && kind !== "sole") return "Add an Inputter";
  const emails = users.map((u) => u.email.trim().toLowerCase()).filter(Boolean);
  if (new Set(emails).size !== emails.length) return "Remove the Duplicate Email";
  // The table on wide screens lets a row be half filled in, so every detail is checked, not only the access.
  const incomplete = users.find((u) => userMissing(u).length > 0);
  if (incomplete) return incomplete.name.trim() ? `Complete ${incomplete.name.trim()}` : "Complete the New User";
  return "";
}

/** What one user still needs, in words for a "Still needed: ..." line. Empty when they're complete. */
export function userMissing(user: CorporateUserDraft): string[] {
  const missing: string[] = [];
  if (!user.name.trim()) missing.push("full name");
  if (!user.email.includes("@")) missing.push("email address");
  if (user.mobile.replace(/\D/g, "").length < 9) missing.push("mobile number");
  if (!user.dateOfBirth) missing.push("date of birth");
  if (!user.role) missing.push("role");
  else if (roleActs(user.role)) {
    if (user.services.length === 0) missing.push("services");
    if (user.accountIds.length === 0) missing.push("accounts");
  }
  return missing;
}

/**
 * Set when someone can prepare a larger payment than any authoriser can release. The bank would set it up as asked
 * and those payments would stall, so the review says it before anyone signs.
 */
export function limitsStall(users: CorporateUserDraft[]): { prepare: number; release: number } | null {
  const top = (role: CorporateAppRole) => Math.max(0, ...users.filter((u) => u.role === role).map((u) => u.limit));
  const prepare = top("Inputter");
  const release = top("Authoriser");
  return prepare > release ? { prepare, release } : null;
}

/* ── Domain model ──────────────────────────────────────────────────────────── */

export interface CorporateUserDraft {
  id: string;
  name: string;
  email: string;
  mobile: string;
  /** Null until the company chooses one. Nothing is chosen for them; only the limit starts at the bank's default
   *  (designer, 2026-11-26). Every submitted application has one. */
  role: CorporateAppRole | null;
  /** Their position, where it's known. */
  designation?: string;
  /** ISO date. A signatory's is on the bank's records; anyone else gives theirs. Activation checks it. */
  dateOfBirth?: string;
  dateAppointed?: string;
  /** Whether they sign for the business, as the applicant says. Staff confirm it against the mandate. Only
   *  signatories can review or authorise (BRL-03). */
  isFromMandate?: boolean;
  /** The most they may prepare, pass on or release in one payment, in GHS. 0 for viewers. */
  limit: number;
  /** The accounts they can see and act on. */
  accountIds: string[];
  /** What they may do. Empty for viewers. */
  services: CorporateService[];
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

/** Whoever fills in the request: often a secretary or an accountant, not a signatory. */
export interface CompanyApplicant {
  name: string;
  mobile: string;
  email: string;
  /** Their position at the business, as they give it. */
  designation?: string;
  /** Kept for staff records made before 2026-11-26; the online request doesn't ask. */
  isSignatory: boolean;
}

/** What the applicant types about the business. Nothing is looked up from it. */
export interface BusinessDetails {
  kind: BusinessKind;
  name: string;
  /** What the business does: the form's "nature of business". */
  nature: string;
  email: string;
  phone: string;
  /** Where the business is, in their own words: the form's address, suburb, landmark and city in one line. */
  location: string;
}

/** Account numbers are typed, never looked up. GCB's are 13 digits; 10 to 16 allows for older ones. */
export function accountNumberProblem(raw: string): string {
  const digits = cleanAccountNumber(raw);
  if (!digits) return "";
  if (!/^\d+$/.test(digits)) return "Please use digits only.";
  if (digits.length < 10 || digits.length > 16) return "Account numbers must be 10 to 16 digits.";
  return "";
}

/** A typed account as the request carries it. Staff fill in the name, type and currency from Flexcube. */
export function typedAccount(number: string): EnrolledAccountSummary {
  const clean = cleanAccountNumber(number);
  return { id: clean, name: "", number: clean, currency: "", type: "" };
}

/** The business as the submission needs it, from what was typed. Staff add the rest from the letter and Flexcube. */
export function businessRecord(details: BusinessDetails): CorporateCompanyRecord {
  return {
    companyName: details.name,
    tin: "",
    address: details.location,
    phone: details.phone,
    structure: details.kind === "sole" ? "Sole proprietor" : "Company or organisation",
    email: details.email,
    mandate: "",
    signingRule: "",
    approvalRule: "",
    relationshipManager: null,
    accounts: [],
    signatories: [],
  };
}

/** What the Demo hub fills in when it jumps past the first screen. */
export const ENROLMENT_DEMO = {
  requester: { name: "Adwoa Mensah", mobile: "0244300420", email: "adwoa.mensah@adinkratextiles.com" },
  business: {
    name: "Adinkra Textiles Ltd",
    nature: "Textile manufacturing and wholesale",
    email: "info@adinkratextiles.com",
    phone: "0302224410",
    location: "Plot 14 Industrial Area, North Kaneshie, Accra",
  },
  accounts: ["1001234567890", "1001234577100"],
  users: [
    {
      id: "u-demo-1",
      name: "Adwoa Mensah",
      email: "adwoa.mensah@adinkratextiles.com",
      mobile: "0244300420",
      dateOfBirth: "1988-03-14",
      role: "Inputter",
      limit: 50_000,
      accountIds: ["1001234567890", "1001234577100"],
      services: ["transfers", "bulk"],
    },
    {
      id: "u-demo-2",
      name: "Yaw Oppong",
      email: "yaw.oppong@adinkratextiles.com",
      mobile: "0244123456",
      dateOfBirth: "1971-09-02",
      role: "Authoriser",
      isFromMandate: true,
      limit: 500_000,
      accountIds: ["1001234567890", "1001234577100"],
      services: ["transfers", "bulk"],
    },
    {
      id: "u-demo-3",
      name: "Esi Boateng",
      email: "esi.boateng@adinkratextiles.com",
      mobile: "0552309981",
      dateOfBirth: "1993-11-21",
      role: "Viewer",
      limit: 0,
      accountIds: ["1001234567890", "1001234577100"],
      services: [],
    },
  ] satisfies CorporateUserDraft[],
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
  /** Sole proprietor or company, as the applicant chose. */
  businessKind?: BusinessKind;
  /** The business's phone, as typed. */
  companyPhone?: string;
  /** What the business does, as typed. */
  natureOfBusiness?: string;
  /** Whether staff have found the business in Flexcube. Online requests start without it: the account numbers are
   *  on the letter. */
  foundInFlexcube?: boolean;
  /**
   * Who was told a request was made: the business's email on file and every signatory's mobile in Flexcube, so a
   * stranger asking in the business's name is seen at once.
   */
  startAlert?: { at: string; companyEmail: string; signatoryMobiles: string[] };
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
  specimenUrl?: string;
}

export interface CorporateCompanyRecord {
  companyName: string;
  tin: string;
  address: string;
  phone: string;
  /** What the form calls the nature of business: sole proprietor, partnership or company. */
  structure: string;
  /** The company's email address on file in Flexcube. */
  email: string;
  alreadyEnrolled?: boolean;
  mandate: string;
  /** The signing rule in plain words, used on the letter. */
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
  "1001234567890": {
    companyName: "Adinkra Textiles Ltd",
    tin: "C0012345678",
    address: "Plot 14 Industrial Area, North Kaneshie, Accra",
    phone: "+233 30 222 4410",
    structure: "Limited company",
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
      { id: "acc-001", name: "Corporate Current Account", number: "1001234567890", currency: "GHS", type: "Current", balance: 1284530.44 },
      { id: "acc-002", name: "Payroll Account", number: "1001234577100", currency: "GHS", type: "Current", balance: 342118.9 },
      { id: "acc-003", name: "USD Trade Account", number: "2200889100430", currency: "USD", type: "Foreign Currency", balance: 486220.15 },
    ],
    signatories: [
      { name: "Yaw Oppong", designation: "Managing Director", signingClass: "A", email: "yaw.oppong@adinkratextiles.com", mobile: "0244123456", specimenUrl: "/signatures/specimen-yaw.svg" },
      { name: "Esther Appiah", designation: "Finance Director", signingClass: "B", email: "esther.appiah@adinkratextiles.com", mobile: "0244300412", specimenUrl: "/signatures/specimen-esther.svg" },
      { name: "Ransford Gyasi", designation: "Executive Director", signingClass: "A", email: "ransford.gyasi@adinkratextiles.com", mobile: "0244300411", specimenUrl: "/signatures/specimen-kwame.svg" },
    ],
  },
  // One account, no RM: the Corporate Banking Team reviews it
  "1001884422000": {
    companyName: "Volta River Logistics Ltd",
    tin: "C0098765432",
    address: "Harbour Road, Tema",
    phone: "+233 30 320 1184",
    structure: "Limited company",
    email: "operations@voltariver.com",
    mandate: "Either to sign",
    signingRule: "either signatory",
    approvalRule: "Single authorisation: any registered signatory can approve up to GHS 500,000",
    relationshipManager: null,
    accounts: [
      { id: "acc-volta-1", name: "Commercial Operating Account", number: "1001884422000", currency: "GHS", type: "Current", balance: 780400 },
    ],
    signatories: [
      { name: "Kofi Mensah", designation: "Chief Executive Officer", email: "kofi.mensah@voltariver.com", mobile: "0201200314", specimenUrl: "/signatures/specimen-kofi.svg" },
      { name: "Ama Serwaa", designation: "Chief Operating Officer", email: "ama.serwaa@voltariver.com", mobile: "0244889911", specimenUrl: "/signatures/specimen-ama.svg" },
    ],
  },
  // Already on internet banking
  "1001992244110": {
    companyName: "Gold Coast Agro Processing Ltd",
    tin: "C0044556677",
    address: "Spintex Road, Accra",
    phone: "+233 30 281 0077",
    structure: "Limited company",
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
      { id: "acc-agro-1", name: "Primary Treasury", number: "1001992244110", currency: "GHS", type: "Current", balance: 3500000 },
    ],
    signatories: [
      { name: "Nana Addo Dankwa", designation: "Chairman", email: "nana.addo@goldcoastagro.com", mobile: "0244400511", specimenUrl: "/signatures/specimen-nana.svg" },
    ],
  },
};

/** Staff side only: the business's Flexcube record, found from an account number on the letter. */
export function lookupCorporateAccount(rawAccountNumber: string): CorporateCompanyRecord | null {
  return MOCK_CORPORATE_COMPANIES[cleanAccountNumber(rawAccountNumber)] ?? null;
}

/** "Managing Director · Signatory A" */
export function signatoryLabel(s: Pick<MandateSignatory, "designation" | "signingClass">): string {
  return s.signingClass ? `${s.designation} · Signatory ${s.signingClass}` : s.designation;
}

/** "•••• 7890" */
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
