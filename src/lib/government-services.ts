/**
 * Government payments, all under the Ghana.gov biller: an agency, then one of its services, then a form.
 * Services differ in how they are paid, so each says so: `pay` (the customer already has an invoice or reference)
 * and/or `invoice` (the customer can raise the invoice here first, then pay now or later). Adding a service or an
 * agency is one entry below; the screen reads it and draws the right steps.
 */

/** On the Ghana.gov biller: pay an invoice you have, or generate a new one. */
export type GovMode = "pay" | "invoice";

export interface GovField {
  id: string;
  label: string;
  placeholder?: string;
  /** A free-text box by default; a list when `select`, with its choices in `options`. */
  type?: "text" | "select";
  options?: readonly string[];
  /** The field that identifies the bill. It is the one that is name-checked and carried to the receipt. */
  reference?: boolean;
}

export interface GovService {
  id: string;
  name: string;
  /** Shown under the name when it says more than the name does. */
  description?: string;
  /** What the agency calls the number the customer brings (Account Number, Bill Number, Reference). Default: Invoice Number. */
  reference?: string;
  /** The form the agency asks for when paying. Without it, the service asks for one reference (see `reference`). */
  fields?: readonly GovField[];
  /** What the agency asks for when an invoice is generated under Ghana.gov. Defaults to name, phone and `reference`. */
  invoiceFields?: readonly GovField[];
}

export interface GovAgency {
  id: string;
  name: string;
  /** Where the customer finds it: as its own biller in Pay Bills, or only under the Ghana.gov biller. */
  via: "biller" | "ghanagov";
  services: readonly GovService[];
}

// The choices in these lists are stand-ins until the agencies' real lists are known (see WORKING_LOG).
const DISTRICTS = ["Kumasi Metropolitan", "Sekondi-Takoradi Metropolitan", "Tamale Metropolitan", "Atiwa West", "Wassa Amenfi West"];
const REVENUE_TYPES = ["Stumpage Fee", "Timber Rights Fee", "Permit Fee", "Other"];
const field = (id: string, label: string, extra: Partial<GovField> = {}): GovField => ({ id, label, ...extra });

/** Asked on every invoice. */
export const DEFAULT_INVOICE_FIELDS: readonly GovField[] = [
  { id: "payer", label: "Full Name", placeholder: "Name on the invoice" },
  { id: "phone", label: "Phone Number", placeholder: "For the invoice SMS" },
];

// Which services can raise an invoice, and what they ask for, is assumed until the bank confirms it (see WORKING_LOG).
export const GOV_AGENCIES: readonly GovAgency[] = [
  { id: "ama", name: "Accra Metropolitan Assembly", via: "ghanagov", services: [{ id: "ama-services", name: "AMA Services", reference: "Account Number" }] },
  {
    id: "ahpc",
    name: "Allied Health Professions Council of Ghana",
    via: "biller",
    services: [
      { id: "ahpc-main", name: "Licensure Exams (Main)" },
      { id: "ahpc-supp", name: "Licensure Exams (Supplementary)" },
      { id: "ahpc-perm", name: "Permanent Registration" },
      { id: "ahpc-pin", name: "Pin Renewal" },
      { id: "ahpc-prov", name: "Provisional Registration", description: "Provisional exams" },
      { id: "ahpc-up-perm", name: "Upgrade (Permanent Registration)" },
      { id: "ahpc-up-prov", name: "Upgrade (Provisional Registration)" },
    ],
  },
  {
    id: "dvla",
    name: "Driver and Vehicle Licensing Agency (DVLA)",
    via: "ghanagov",
    services: [
      { id: "dvla-ccr", name: "Collection Cost Recovery" },
      { id: "dvla-lic", name: "Licensing Duties" },
      { id: "dvla-tp", name: "Third Party" },
      {
        id: "dvla-reg",
        name: "Vehicle Registration",
        invoiceFields: [...DEFAULT_INVOICE_FIELDS, { id: "vehicle", label: "Vehicle Registration Number", placeholder: "For example GR 1234-24" }],
      },
    ],
  },
  {
    id: "fc",
    name: "Forestry Commission",
    via: "biller",
    services: [
      {
        id: "fc-known",
        name: "Known Contractor Payments",
        description: "Contractor payment for known contractors",
        fields: [
          field("mark", "Property Mark", { reference: true }),
          field("phone", "Company Phone"),
          field("revenue", "Revenue Type", { type: "select", options: REVENUE_TYPES }),
          field("district", "District", { type: "select", options: DISTRICTS }),
        ],
      },
      {
        id: "fc-unknown",
        name: "Unknown Contractor Payments",
        description: "Contractor payment for unknown contractors",
        fields: [
          field("mark", "Property Mark", { reference: true }),
          field("company", "Company Name"),
          field("phone", "Company Phone"),
          field("revenue", "Revenue Type", { type: "select", options: REVENUE_TYPES }),
          field("district", "District", { type: "select", options: DISTRICTS }),
        ],
      },
    ],
  },
  { id: "ghlink", name: "Ghana Link", via: "biller", services: [{ id: "ghlink-track", name: "Tracking Invoice Payment" }] },
  { id: "gsl", name: "Ghana School of Law", via: "ghanagov", services: [{ id: "gsl-pay", name: "Ghana School of Law Payment" }] },
  {
    id: "lands",
    name: "Lands Commission",
    via: "ghanagov",
    services: [
      { id: "lands-bill", name: "Lands Commission Bill", reference: "Bill Number" },
      {
        id: "lands-stamp",
        name: "Stamp Duty",
        invoiceFields: [...DEFAULT_INVOICE_FIELDS, { id: "property", label: "Property Reference", placeholder: "Land or document reference" }],
      },
    ],
  },
  { id: "mps", name: "Meridian Port Services (MPS)", via: "biller", services: [{ id: "mps-invoices", name: "MPS Invoices", reference: "Reference" }] },
  {
    id: "nmc",
    name: "Nursing and Midwifery Council (NMC)",
    via: "ghanagov",
    services: [
      { id: "nmc-badge", name: "Badge", description: "For practitioners without a badge" },
      { id: "nmc-foreign", name: "Foreign Exam/Registration" },
      { id: "nmc-gov", name: "Exams Registration, Pin Renewal and Foreign Verification" },
      { id: "nmc-index", name: "Indexing" },
      { id: "nmc-late-exam", name: "Late Examination Penalty" },
      { id: "nmc-late-reg", name: "Late Registration Penalty" },
      { id: "nmc-other", name: "Other Payments" },
      { id: "nmc-premium", name: "Other Premium Services Payments" },
      {
        id: "nmc-pin",
        name: "PIN/AIN Renewal",
        invoiceFields: [...DEFAULT_INVOICE_FIELDS, { id: "pin", label: "PIN or AIN", placeholder: "Your current PIN or AIN" }],
      },
    ],
  },
  {
    id: "orc",
    name: "Office of the Registrar of Companies (ORC)",
    via: "ghanagov",
    services: [
      { id: "orc-existing", name: "Existing ORC Application" },
      {
        id: "orc-renewal",
        name: "ORC Business Renewal",
        invoiceFields: [...DEFAULT_INVOICE_FIELDS, { id: "business", label: "Business Registration Number", placeholder: "For example CS123456789" }],
      },
    ],
  },
  {
    id: "parker",
    name: "Parker Consulting / COCOSHE Project",
    via: "biller",
    services: [{ id: "parker-share", name: "Share Contributions", description: "Parker Consulting - Cocoshe Project share contributions" }],
  },
  {
    id: "ssnit",
    name: "Social Security and National Insurance Trust (SSNIT)",
    via: "biller",
    services: [
      {
        id: "ssnit-advice",
        name: "Advice Payment",
        fields: [
          field("advice", "Payment Advice Reference", { reference: true }),
          field("type", "Type of Advice", { type: "select", options: ["Contribution Advice", "Penalty Advice", "Arrears Advice"] }),
          field("txn", "Transaction Type", { type: "select", options: ["Contribution", "Penalty", "Arrears"] }),
        ],
      },
    ],
  },
  { id: "sltf", name: "Student Loan Trust Fund", via: "biller", services: [{ id: "sltf-pay", name: "Student Loan Trust Fund Payment" }] },
  {
    id: "tdc",
    name: "TDC Development Company Limited",
    via: "biller",
    services: [
      { id: "tdc-forms", name: "Forms Purchase" },
      { id: "tdc-rental", name: "Rental Debtors Payment" },
      { id: "tdc-services", name: "Services Payment" },
    ],
  },
];

export function findGovAgency(name?: string | null): GovAgency | undefined {
  return name ? GOV_AGENCIES.find((a) => a.name === name) : undefined;
}

export function findGovService(agencyName?: string | null, serviceId?: string | null): GovService | undefined {
  return serviceId ? findGovAgency(agencyName)?.services.find((s) => s.id === serviceId) : undefined;
}

/** The agencies reached through the Ghana.gov biller. */
export const GHANAGOV_AGENCIES: readonly GovAgency[] = GOV_AGENCIES.filter((a) => a.via === "ghanagov");

/** The id of an agency's own biller in Pay Bills (see BILLERS). */
export const govBillerId = (agencyId: string) => `bil-gov-${agencyId}`;

/** The agency a biller stands for, when it is one of the agencies that has its own biller. */
export function govAgencyForBiller(billerId?: string | null): GovAgency | undefined {
  return billerId ? GOV_AGENCIES.find((a) => a.via === "biller" && govBillerId(a.id) === billerId) : undefined;
}
