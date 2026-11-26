/**
 * Shared Enrolment Store.
 *
 * Two journeys, one store (CONSTITUTION §1): the customer's online application (/business/signup/enrol) and the
 * staff queue (/admin/enrolments) both read and write here. The customer hears by email; there is no status page. An
 * application that arrives by email, post or at a branch is captured by staff into the same store.
 *
 * Persisted in browser localStorage (with in-memory fallback), seeded with realistic scenarios.
 */

import {
  reviewerFor,
  type CorporateCompanyRecord,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
  type EnrolmentApplication,
  type EnrolmentReturnRecord,
  type EnrolmentStaffAssignment,
  type EnrolmentStatus,
  type LetterChannel,
  type CompanyApplicant,
  type SignatureCheckItem,
  type VerificationCallLog,
} from "./corporate-enrolment";
import { AUDIT_EVENTS } from "./mock-data";

export type {
  EnrolmentApplication,
  EnrolmentReturnRecord,
  EnrolmentStaffAssignment,
  EnrolmentStatus,
  SignatureCheckItem,
  VerificationCallLog,
};

const STORAGE_KEY = "nibs_corporate_enrolments_v3";

/* ── Seed Applications ──────────────────────────────────────────────────────── */

export const INITIAL_ENROLMENTS: EnrolmentApplication[] = [
  // 1. In Review: Adinkra Textiles with RM Kwame Asante - Checking signatures
  {
    reference: "ENR-2026-0814",
    createdAt: "2026-10-18T10:30:00Z",
    updatedAt: "2026-10-19T08:15:00Z",
    channel: "online",
    companyName: "Adinkra Textiles Ltd",
    companyTin: "C0012345678",
    companyAddress: "Plot 14 Industrial Area, North Kaneshie, Accra",
    accounts: [
      { id: "acc-001", name: "Corporate Current Account", number: "1001234567890", currency: "GHS", type: "Current", balance: 1284530.44 },
      { id: "acc-002", name: "Payroll Account", number: "1001234577100", currency: "GHS", type: "Current", balance: 342118.90 },
      { id: "acc-003", name: "USD Trade Account", number: "2200889100430", currency: "USD", type: "Foreign Currency", balance: 486220.15 },
    ],
    applicant: {
      name: "Ransford Gyasi",
      mobile: "0244123456",
      email: "ransford.gyasi@adinkratextiles.com",
      isSignatory: true,
    },
    mandate: "Both to sign",
    approvalRule: "Dual authorization: 1 Signatory A (Director) + 1 Signatory B (Finance)",
    users: [
      {
        id: "u-draft-1",
        name: "Yaw Oppong",
        email: "yaw.oppong@adinkratextiles.com",
        mobile: "0541300413",
        role: "Authoriser",
        dateAppointed: "2018-04-12",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-001", "acc-002", "acc-003"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
      {
        id: "u-draft-2",
        name: "Ransford Gyasi",
        email: "ransford.gyasi@adinkratextiles.com",
        mobile: "0244300411",
        role: "Inputter",
        dateAppointed: "2020-09-01",
        isFromMandate: true,
        limit: 500_000,
        accountIds: ["acc-001", "acc-002", "acc-003"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
      {
        id: "u-draft-3",
        name: "Esther Appiah",
        email: "esther.appiah@adinkratextiles.com",
        mobile: "0244300412",
        role: "Authoriser",
        dateAppointed: "2019-01-15",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-001", "acc-002", "acc-003"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
      {
        id: "u-draft-4",
        name: "Adjoa Frimpong",
        email: "adjoa.frimpong@adinkratextiles.com",
        mobile: "0209988776",
        role: "Viewer",
        dateAppointed: "2023-02-10",
        isFromMandate: false,
        dateOfBirth: "1990-05-14",
        limit: 0,
        accountIds: ["acc-001"],
        services: [],
        inviteStatus: "pending",
      },
    ],
    pack: {
      uploadedFileName: "Adinkra_Textiles_Signed_Mandate_Pack.pdf",
      uploadedFileSize: "2.4 MB",
      uploadedAt: "2026-10-18T10:28:00Z",
    },
    status: "checking_signatures",
    assignedTo: {
      type: "rm",
      name: "Kwame Asante",
      email: "kwame.asante@gcb.com.gh",
      phone: "+233 24 499 1821",
    },
    signatureChecks: [
      {
        signatoryName: "Yaw Oppong",
        role: "Managing Director (Signatory A)",
        specimenUrl: "/signatures/specimen-yaw.svg",
        status: "unreviewed",
      },
      {
        signatoryName: "Esther Appiah",
        role: "Finance Director (Signatory B)",
        specimenUrl: "/signatures/specimen-esther.svg",
        status: "unreviewed",
      },
    ],
    verificationCall: {
      logged: false,
      calledNumber: "0244123456",
      answeredBy: "",
      outcome: null,
    },
    returns: [],
  },

  // 2. Ready for Call: Volta River Logistics - Signatures matched, awaiting phone verification
  {
    reference: "ENR-2026-0812",
    createdAt: "2026-10-17T14:10:00Z",
    updatedAt: "2026-10-18T16:20:00Z",
    channel: "online",
    companyName: "Volta River Logistics Ltd",
    companyTin: "C0098765432",
    companyAddress: "Heavy Industrial Area, Tema Harbour Road, Tema",
    accounts: [
      { id: "acc-volta-1", name: "Commercial Operating Account", number: "1001884422000", currency: "GHS", type: "Current", balance: 780400.00 },
    ],
    applicant: {
      name: "Kofi Mensah",
      mobile: "0201200314",
      email: "kofi.mensah@voltariver.com",
      isSignatory: true,
    },
    mandate: "Either to sign",
    approvalRule: "Single authorization: Any registered Signatory can approve up to GHS 500,000",
    users: [
      {
        id: "u-volta-1",
        name: "Kofi Mensah",
        email: "kofi.mensah@voltariver.com",
        mobile: "0201200314",
        role: "Authoriser",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-volta-1"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
      {
        id: "u-volta-2",
        name: "Ama Serwaa",
        email: "ama.serwaa@voltariver.com",
        mobile: "0244889911",
        role: "Inputter",
        isFromMandate: true,
        limit: 500_000,
        accountIds: ["acc-volta-1"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
    ],
    pack: {
      uploadedFileName: "Volta_River_Mandate_Executed.pdf",
      uploadedFileSize: "1.8 MB",
      uploadedAt: "2026-10-17T14:05:00Z",
    },
    status: "call_verification",
    assignedTo: {
      type: "operations",
      name: "Corporate Banking Team",
      email: "corporate.onboarding@gcb.com.gh",
      phone: "+233 30 268 1521",
    },
    signatureChecks: [
      {
        signatoryName: "Kofi Mensah",
        role: "Chief Executive Officer",
        specimenUrl: "/signatures/specimen-kofi.svg",
        status: "match",
        notes: "Matched with signature card ref SIG-2022-901",
      },
    ],
    verificationCall: {
      logged: false,
      calledNumber: "0201200314",
      answeredBy: "",
      outcome: null,
    },
    returns: [],
  },

  // 3. Returned: Accra Timber Merchants - Specific return reason with re-upload in place
  {
    reference: "ENR-2026-0790",
    createdAt: "2026-10-15T09:12:00Z",
    updatedAt: "2026-10-16T14:45:00Z",
    channel: "branch",
    companyName: "Accra Timber Merchants Ltd",
    companyTin: "C0055443322",
    companyAddress: "Timber Market, Old Fadama Road, Accra",
    accounts: [
      { id: "acc-timber-1", name: "Corporate Operations", number: "1001556677880", currency: "GHS", type: "Current", balance: 512000.00 },
    ],
    applicant: {
      name: "Kwabena Yeboah",
      mobile: "0243112233",
      email: "kyeboah@accratimber.com",
      isSignatory: true,
    },
    mandate: "Both to sign",
    approvalRule: "Two directors to sign jointly",
    users: [
      {
        id: "u-timber-1",
        name: "Kwabena Yeboah",
        email: "kyeboah@accratimber.com",
        mobile: "0243112233",
        role: "Authoriser",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-timber-1"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
      {
        id: "u-timber-2",
        name: "Emmanuel Adjei",
        email: "eadjei@accratimber.com",
        mobile: "0277889900",
        role: "Inputter",
        isFromMandate: true,
        limit: 500_000,
        accountIds: ["acc-timber-1"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
    ],
    pack: {
      uploadedFileName: "Accra_Timber_Mandate_Oct2026.pdf",
      uploadedFileSize: "3.1 MB",
      uploadedAt: "2026-10-15T09:10:00Z",
    },
    status: "returned",
    assignedTo: {
      type: "rm",
      name: "Kwame Asante",
      email: "kwame.asante@gcb.com.gh",
      phone: "+233 24 499 1821",
    },
    signatureChecks: [
      {
        signatoryName: "Emmanuel Adjei",
        role: "Director",
        status: "match",
      },
      {
        signatoryName: "Kwabena Yeboah",
        role: "Managing Director",
        status: "no_match",
        notes: "Signature on page 2 deviates substantially from registered card.",
      },
    ],
    verificationCall: {
      logged: false,
      calledNumber: "0243112233",
      answeredBy: "",
      outcome: null,
    },
    returns: [
      {
        id: "ret-1",
        at: "2026-10-16T14:45:00Z",
        by: "Kwame Asante (Relationship Manager)",
        reason: "One signature doesn't match our records",
        details: "Kwabena Yeboah's signature on the letter doesn't match the specimen we hold. Ask them to sign again the way they signed for the bank, then upload the letter here. If their signature has changed, Kwame Asante can update your mandate first.",
        flaggedItems: [
          "Signature of Kwabena Yeboah (Managing Director, Signatory A)",
        ],
        resolved: false,
      },
    ],
  },

  // 4. Approved: Ashanti Agro Exports - Showing invite link management
  {
    reference: "ENR-2026-0720",
    createdAt: "2026-10-10T08:00:00Z",
    updatedAt: "2026-10-12T11:00:00Z",
    channel: "email",
    companyName: "Ashanti Agro Exports Ltd",
    companyTin: "C0033221100",
    companyAddress: "Kumasi Industrial Park, Kaase, Kumasi",
    accounts: [
      { id: "acc-ashanti-1", name: "Commercial Current Account", number: "1001772233440", currency: "GHS", type: "Current", balance: 2150000.00 },
      { id: "acc-ashanti-2", name: "EUR Export Proceeds", number: "2200772233450", currency: "EUR", type: "Foreign Currency", balance: 340000.00 },
    ],
    applicant: {
      name: "Nana Akua Osei",
      mobile: "0244778899",
      email: "akua.osei@ashantiagro.com",
      isSignatory: true,
    },
    mandate: "Any two to sign",
    approvalRule: "Dual sign-off for outward payments",
    users: [
      {
        id: "u-ash-1",
        name: "Nana Akua Osei",
        email: "akua.osei@ashantiagro.com",
        mobile: "0244778899",
        role: "Authoriser",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-ashanti-1", "acc-ashanti-2"],
        services: ["transfers", "bulk"],
        inviteStatus: "used",
        inviteToken: "corp-inv-001",
      },
      {
        id: "u-ash-2",
        name: "Osei Kwadwo",
        email: "okwadwo@ashantiagro.com",
        mobile: "0554112233",
        role: "Inputter",
        isFromMandate: true,
        limit: 500_000,
        accountIds: ["acc-ashanti-1", "acc-ashanti-2"],
        services: ["transfers", "bulk"],
        inviteStatus: "sent",
        inviteToken: "corp-inv-002",
      },
      {
        id: "u-ash-3",
        name: "Akosua Mansah",
        email: "amansah@ashantiagro.com",
        mobile: "0209445566",
        role: "Authoriser",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-ashanti-1", "acc-ashanti-2"],
        services: ["transfers", "bulk"],
        inviteStatus: "sent",
        inviteToken: "corp-inv-003",
      },
      {
        id: "u-ash-4",
        name: "Felix Boakye",
        email: "fboakye@ashantiagro.com",
        mobile: "0244001122",
        role: "Viewer",
        isFromMandate: false,
        dateOfBirth: "1990-05-14",
        limit: 0,
        accountIds: ["acc-ashanti-1"],
        services: [],
        inviteStatus: "expired",
        inviteToken: "corp-inv-004",
      },
    ],
    pack: {
      uploadedFileName: "Ashanti_Agro_Executed_Mandate.pdf",
      uploadedFileSize: "2.9 MB",
      uploadedAt: "2026-10-10T08:00:00Z",
    },
    status: "approved",
    assignedTo: {
      type: "rm",
      name: "Kwame Asante",
      email: "kwame.asante@gcb.com.gh",
      phone: "+233 24 499 1821",
    },
    signatureChecks: [
      { signatoryName: "Nana Akua Osei", role: "Executive Director", status: "match" },
      { signatoryName: "Akosua Mansah", role: "Finance Director", status: "match" },
    ],
    verificationCall: {
      logged: true,
      calledNumber: "0244778899",
      answeredBy: "Nana Akua Osei",
      outcome: "verified",
      callNotes: "Confirmed all 4 users and account mandate parameters.",
      calledAt: "2026-10-12T10:45:00Z",
      loggedBy: "Kwame Asante",
    },
    returns: [],
  },

  // 5. Waiting for the signed letter: applied online, chose to email the letter to their RM
  {
    reference: "ENR-2026-0821",
    createdAt: "2026-10-20T09:05:00Z",
    updatedAt: "2026-10-20T09:05:00Z",
    channel: "online",
    companyName: "Volta River Logistics Ltd",
    companyTin: "C0098765432",
    companyAddress: "Harbour Road, Tema",
    accounts: [
      { id: "acc-volta-1", name: "Commercial Operating Account", number: "1001884422000", currency: "GHS", type: "Current", balance: 780400 },
    ],
    applicant: {
      name: "Kofi Mensah",
      mobile: "0201200314",
      email: "kofi.mensah@voltariver.com",
      isSignatory: true,
    },
    mandate: "Either to sign",
    approvalRule: "Single authorisation: any registered signatory can approve up to GHS 500,000",
    users: [
      {
        id: "u-volta-new-1",
        name: "Kofi Mensah",
        email: "kofi.mensah@voltariver.com",
        mobile: "0201200314",
        role: "Authoriser",
        designation: "Chief Executive Officer",
        isFromMandate: true,
        limit: 1_000_000,
        accountIds: ["acc-volta-1"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
      {
        id: "u-volta-new-2",
        name: "Efua Badu",
        email: "efua.badu@voltariver.com",
        mobile: "0245567788",
        role: "Inputter",
        isFromMandate: false,
        dateOfBirth: "1990-05-14",
        limit: 500_000,
        accountIds: ["acc-volta-1"],
        services: ["transfers", "bulk"],
        inviteStatus: "pending",
      },
    ],
    pack: {},
    status: "awaiting_letter",
    assignedTo: {
      type: "operations",
      name: "Corporate Banking Team",
      email: "corporate.onboarding@gcb.com.gh",
      phone: "+233 30 268 1521",
    },
    signatureChecks: [
      { signatoryName: "Kofi Mensah", role: "Chief Executive Officer", specimenUrl: "/signatures/specimen-kofi.svg", status: "unreviewed" },
      { signatoryName: "Ama Serwaa", role: "Chief Operating Officer", specimenUrl: "/signatures/specimen-ama.svg", status: "unreviewed" },
    ],
    verificationCall: {
      logged: false,
      calledNumber: "0201200314",
      answeredBy: "",
      outcome: null,
    },
    returns: [],
  },
];

/* ── Store Operations ──────────────────────────────────────────────────────── */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

let inMemoryStore: EnrolmentApplication[] = [...INITIAL_ENROLMENTS];

function loadFromStorage(): EnrolmentApplication[] {
  if (!isBrowser()) return inMemoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ENROLMENTS));
      return INITIAL_ENROLMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_ENROLMENTS;
  } catch {
    return inMemoryStore;
  }
}

function persistToStorage(records: EnrolmentApplication[]): void {
  inMemoryStore = records;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn("Failed to persist enrolment store:", err);
  }
}

export function getAllEnrolments(): EnrolmentApplication[] {
  return loadFromStorage();
}

export function getEnrolment(reference: string): EnrolmentApplication | undefined {
  const norm = reference.trim().toUpperCase();
  const all = getAllEnrolments();
  return all.find((app) => app.reference.toUpperCase() === norm);
}

export function saveEnrolment(application: EnrolmentApplication): void {
  const all = getAllEnrolments();
  const index = all.findIndex((a) => a.reference.toUpperCase() === application.reference.toUpperCase());
  if (index >= 0) {
    all[index] = { ...application, updatedAt: new Date().toISOString() };
  } else {
    all.unshift({ ...application, updatedAt: new Date().toISOString() });
  }
  persistToStorage(all);
}

export function updateEnrolment(
  reference: string,
  patch: Partial<EnrolmentApplication>,
): EnrolmentApplication | undefined {
  const all = getAllEnrolments();
  const index = all.findIndex((a) => a.reference.toUpperCase() === reference.toUpperCase());
  if (index < 0) return undefined;

  const current = all[index];
  const updated: EnrolmentApplication = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  persistToStorage(all);
  return updated;
}

/**
 * Staff Action: Approves the application and issues user setup invites.
 */
export function approveEnrolment(
  reference: string,
  staffName = "Kwame Asante",
  staffRole = "Relationship Manager",
): EnrolmentApplication | undefined {
  const app = getEnrolment(reference);
  if (!app) return undefined;

  const nowIso = new Date().toISOString();

  // Update user draft invites
  const updatedUsers = app.users.map((u, i) => ({
    ...u,
    inviteStatus: "sent" as const,
    inviteToken: `corp-inv-${app.reference.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i + 1}`,
  }));

  const updated = updateEnrolment(reference, {
    status: "approved",
    users: updatedUsers,
  });

  // Record audit log entry
  AUDIT_EVENTS.unshift({
    id: `aud-${Date.now()}`,
    timestamp: nowIso,
    actor: staffName,
    role: staffRole,
    action: "Approved corporate enrolment",
    target: `${app.companyName} · ${app.reference}`,
    channel: "Admin Portal",
    ip: "10.0.4.12",
  });

  return updated;
}

/**
 * Staff Action: Returns application for clarification (recoverable).
 */
export function returnEnrolment(
  reference: string,
  reason: string,
  details: string,
  flaggedItems: string[],
  staffName = "Kwame Asante",
  staffRole = "Relationship Manager",
): EnrolmentApplication | undefined {
  const app = getEnrolment(reference);
  if (!app) return undefined;

  const nowIso = new Date().toISOString();

  const newReturn: EnrolmentReturnRecord = {
    id: `ret-${Date.now()}`,
    at: nowIso,
    by: `${staffName} (${staffRole})`,
    reason,
    details,
    flaggedItems,
    resolved: false,
  };

  const updated = updateEnrolment(reference, {
    status: "returned",
    returns: [newReturn, ...app.returns],
  });

  AUDIT_EVENTS.unshift({
    id: `aud-${Date.now()}`,
    timestamp: nowIso,
    actor: staffName,
    role: staffRole,
    action: "Returned corporate enrolment for clarification",
    target: `${app.companyName} · ${app.reference} (${reason})`,
    channel: "Admin Portal",
    ip: "10.0.4.12",
  });

  return updated;
}

/**
 * Staff Action: Rejects application (terminal).
 */
export function rejectEnrolment(
  reference: string,
  reason: string,
  staffName = "Kwame Asante",
  staffRole = "Relationship Manager",
): EnrolmentApplication | undefined {
  const app = getEnrolment(reference);
  if (!app) return undefined;

  const nowIso = new Date().toISOString();

  const updated = updateEnrolment(reference, {
    status: "rejected",
    rejectionReason: reason,
  });

  AUDIT_EVENTS.unshift({
    id: `aud-${Date.now()}`,
    timestamp: nowIso,
    actor: staffName,
    role: staffRole,
    action: "Declined corporate enrolment application",
    target: `${app.companyName} · ${app.reference} · Reason: ${reason}`,
    channel: "Admin Portal",
    ip: "10.0.4.12",
  });

  return updated;
}

/**
 * Staff Action: Reassigns application between RM and Corporate Operations.
 */
export function reassignEnrolment(
  reference: string,
  newAssignment: EnrolmentStaffAssignment,
  staffName = "Kwame Asante",
  staffRole = "Relationship Manager",
): EnrolmentApplication | undefined {
  const app = getEnrolment(reference);
  if (!app) return undefined;

  const nowIso = new Date().toISOString();
  const updated = updateEnrolment(reference, {
    assignedTo: newAssignment,
  });

  AUDIT_EVENTS.unshift({
    id: `aud-${Date.now()}`,
    timestamp: nowIso,
    actor: staffName,
    role: staffRole,
    action: `Reassigned enrolment to ${newAssignment.name}`,
    target: `${app.companyName} · ${app.reference}`,
    channel: "Admin Portal",
    ip: "10.0.4.12",
  });

  return updated;
}

/** Staff: sends a user their login link and code again (the first link expired, or never reached them). */
export function resendUserInvite(
  reference: string,
  userId: string,
  staffName: string,
  staffRole: string,
): EnrolmentApplication | undefined {
  const app = getEnrolment(reference);
  const user = app?.users.find((u) => u.id === userId);
  if (!app || !user) return undefined;

  const updated = updateEnrolment(reference, {
    users: app.users.map((u) =>
      u.id === userId ? { ...u, inviteStatus: "sent" as const, inviteToken: `corp-inv-${Date.now().toString(36)}` } : u,
    ),
  });
  AUDIT_EVENTS.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: staffName,
    role: staffRole,
    action: `Resent login details to ${user.name}`,
    target: `${app.companyName} · ${app.reference}`,
    channel: "Admin Portal",
    ip: "10.0.4.12",
  });
  return updated;
}

/* ── Online applications and the signed letter ─────────────────────────────── */

export interface NewEnrolmentInput {
  reference: string;
  company: CorporateCompanyRecord;
  accounts: EnrolledAccountSummary[];
  applicant: CompanyApplicant;
  users: CorporateUserDraft[];
  /** The signed letter, when uploaded now. Without it the application waits for the letter. */
  letter?: { fileName: string; fileSize: string };
}

/** Customer: submits an online application, with or without the signed letter. */
export function submitEnrolment(input: NewEnrolmentInput): EnrolmentApplication {
  const nowIso = new Date().toISOString();
  const assignedTo = reviewerFor(input.company);
  const status = input.letter ? "checking_signatures" : "awaiting_letter";
  const application: EnrolmentApplication = {
    reference: input.reference,
    createdAt: nowIso,
    updatedAt: nowIso,
    channel: "online",
    companyName: input.company.companyName,
    companyTin: input.company.tin,
    companyAddress: input.company.address,
    companyEmail: input.company.email,
    accounts: input.accounts,
    applicant: { ...input.applicant },
    users: input.users.map((u) => ({ ...u, inviteStatus: "pending" })),
    mandate: input.company.mandate,
    approvalRule: input.company.approvalRule,
    pack: input.letter
      ? {
          uploadedFileName: input.letter.fileName,
          uploadedFileSize: input.letter.fileSize,
          uploadedAt: nowIso,
          receivedVia: "upload",
        }
      : {},
    status,
    assignedTo,
    signatureChecks: input.company.signatories.map((sig) => ({
      signatoryName: sig.name,
      role: sig.designation,
      specimenUrl: sig.specimenUrl,
      status: "unreviewed",
    })),
    verificationCall: {
      logged: false,
      calledNumber: input.applicant.isSignatory
        ? input.applicant.mobile
        : (input.company.signatories[0]?.mobile ?? ""),
      answeredBy: "",
      outcome: null,
    },
    returns: [],
  };
  saveEnrolment(application);
  return application;
}

/**
 * Staff: records a signed letter that arrived by email, post or at a branch: the first one, or a corrected one after
 * a return. Either way the signatures are checked again from the start.
 */
export function recordLetterReceived(
  reference: string,
  via: Exclude<LetterChannel, "upload">,
  staffName: string,
  staffRole: string,
): EnrolmentApplication | undefined {
  const app = getEnrolment(reference);
  if (!app || (app.status !== "awaiting_letter" && app.status !== "returned")) return undefined;
  const corrected = app.status === "returned";
  const nowIso = new Date().toISOString();
  const updated = updateEnrolment(app.reference, {
    status: "checking_signatures",
    pack: { uploadedAt: nowIso, receivedVia: via },
    signatureChecks: app.signatureChecks.map((c) => ({ ...c, status: "unreviewed" as const })),
    returns: app.returns.map((r) => (r.resolved ? r : { ...r, resolved: true, resubmittedAt: nowIso })),
  });
  AUDIT_EVENTS.unshift({
    id: `aud-${Date.now()}`,
    timestamp: nowIso,
    actor: staffName,
    role: staffRole,
    action: `Recorded ${corrected ? "corrected" : "signed"} letter received by ${via}`,
    target: `${app.companyName} · ${app.reference}`,
    channel: "Admin Portal",
    ip: "10.0.4.12",
  });
  return updated;
}
