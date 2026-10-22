/**
 * Bulk payments (BRD v2 §13 portal bulk payment, §14, BRL-21, SEC-19, FR-COR-39). A batch is many payments from one
 * account, entered on screen or uploaded as a CSV. Every line is checked before anything is submitted: required
 * fields, the account number's shape, the payment type, the amount, and duplicates (a line repeated inside the file,
 * or the whole file submitted before). Lines that fail come back with the reason, can be fixed in place or removed,
 * and can be downloaded as an error report. The batch then takes one batch ID and travels the same approval path as
 * a single payment (review above the threshold, then authorise with a code), against the inputter's limit for its
 * total. On release each line goes out on its own payment type and reports its own status.
 *
 * Payment types are the ones with fees in the shared table (PAYMENT_METHODS: GIP, ACH, ACH NRT), so a fee reads the
 * same here as on a single payment. Mobile money, GCB-to-GCB, Express, GhanaPay and OBVAM need their fees from the
 * bank first (see WORKING_LOG).
 *
 * Mock data, in memory, like the rest of the prototype's store.
 */

import { PAYMENT_METHODS } from "@/components/payments/flows/shared";
import { recordTransaction, type Transaction } from "../mock-data";
import { roundMoney, sumMoney } from "../money";
import { APPROVAL_QUEUE, type ApprovalItem } from "./approvals";
import { approvalPath } from "./controls";

export type BulkRail = "gip" | "ach" | "ach-nrt";
export const BULK_RAILS: BulkRail[] = ["gip", "ach", "ach-nrt"];

export function railFor(id: string) {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export function feeFor(rail: string): number {
  return railFor(rail)?.fee ?? 0;
}

export interface BulkLine {
  /** Position in the batch, from 1. */
  row: number;
  name: string;
  bank: string;
  account: string;
  rail: string;
  amount: number;
  reference: string;
}

export type LineStatus = "paid" | "processing" | "failed" | "waiting";

export interface BatchLine extends BulkLine {
  status: LineStatus;
  /** Why it failed at the receiving bank, when it did. */
  failure?: string;
}

export interface BulkBatch {
  id: string;
  name: string;
  accountId: string;
  fileName?: string;
  /** A fingerprint of the uploaded file, to stop the same file being submitted twice (SEC-19). */
  fileHash?: string;
  submittedBy: string;
  submittedAt: string;
  status: "awaiting-approval" | "returned" | "released";
  lines: BatchLine[];
  /** The ledger entry and the approval item it created. */
  transactionId?: string;
  approvalId?: string;
}

/* ── Checking lines ────────────────────────────────────────────────────────── */

const digits = (s: string) => s.replace(/\D/g, "");

/** What's wrong with a line, if anything. Duplicates are found across the whole batch. */
export function lineErrors(line: BulkLine, all: BulkLine[]): string[] {
  const errors: string[] = [];
  if (!line.name.trim()) errors.push("Add the recipient's name.");
  if (!line.bank.trim()) errors.push("Add the recipient's bank.");
  const n = digits(line.account).length;
  if (n === 0) errors.push("Add the account number.");
  else if (n < 10 || n > 16 || /[^\d\s-]/.test(line.account)) errors.push("The account number should be 10 to 16 digits.");
  if (!BULK_RAILS.includes(line.rail as BulkRail)) errors.push("Use GIP, ACH or ACH NRT as the payment type.");
  if (!(line.amount > 0)) errors.push("The amount should be more than zero.");
  const twin = all.find(
    (o) =>
      o.row < line.row &&
      digits(o.account) === digits(line.account) &&
      o.amount === line.amount &&
      o.reference.trim().toLowerCase() === line.reference.trim().toLowerCase(),
  );
  if (twin && n > 0) errors.push(`Same as line ${twin.row}: same account, amount and reference.`);
  return errors;
}

export function renumber(lines: BulkLine[]): BulkLine[] {
  return lines.map((l, i) => ({ ...l, row: i + 1 }));
}

export function totals(lines: BulkLine[]) {
  const amount = sumMoney(lines.map((l) => l.amount));
  const fees = sumMoney(lines.map((l) => feeFor(l.rail)));
  return { amount, fees, debit: roundMoney(amount + fees) };
}

/* ── CSV ───────────────────────────────────────────────────────────────────── */

export const CSV_HEADER = "name,bank,account_number,payment_type,amount,reference";

/** A template with two example lines, so the first upload has the right columns. */
export const CSV_TEMPLATE = `${CSV_HEADER}
Ama Darko,Absa Bank Ghana Limited,0119223477120,ACH,3800.00,October salary
Yaw Mensah,Ecobank Ghana Limited,1441009873311,GIP,4100.00,October salary
`;

function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Reads a CSV in the template's columns. Returns the lines, or why the file can't be read at all. */
export function parseCsv(text: string): { lines: BulkLine[] } | { problem: string } {
  const rows = text.replace(/\r\n?/g, "\n").split("\n").filter((r) => r.trim() !== "");
  if (rows.length === 0) return { problem: "The file is empty." };
  const header = splitCsvRow(rows[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const needed = ["name", "bank", "account_number", "payment_type", "amount"];
  const missing = needed.filter((n) => col(n) < 0);
  if (missing.length > 0) {
    return { problem: `The file is missing the ${missing.join(", ")} column${missing.length > 1 ? "s" : ""}. Use the template.` };
  }
  if (rows.length === 1) return { problem: "The file has no payment lines under the header." };
  const lines = rows.slice(1).map((r, i) => {
    const c = splitCsvRow(r);
    const type = (c[col("payment_type")] ?? "").toLowerCase().replace(/\s+/g, "-");
    return {
      row: i + 1,
      name: c[col("name")] ?? "",
      bank: c[col("bank")] ?? "",
      account: c[col("account_number")] ?? "",
      rail: type === "ach-nrt" || type === "nrt" ? "ach-nrt" : type,
      amount: Number((c[col("amount")] ?? "").replace(/[^0-9.]/g, "")) || 0,
      reference: col("reference") >= 0 ? (c[col("reference")] ?? "") : "",
    };
  });
  return { lines };
}

/** The lines that need attention, with the reason, as a CSV to fix and upload again. */
export function errorReportCsv(lines: BulkLine[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = lines
    .map((l) => ({ l, errors: lineErrors(l, lines) }))
    .filter((x) => x.errors.length > 0)
    .map(({ l, errors }) =>
      [String(l.row), l.name, l.bank, l.account, l.rail.toUpperCase(), String(l.amount), l.reference, errors.join(" ")].map(esc).join(","),
    );
  return [`line,${CSV_HEADER},problem`, ...rows].join("\n");
}

/** A short, stable fingerprint of a file's content. */
export function fingerprint(text: string): string {
  let h = 5381;
  const norm = text.replace(/\r\n?/g, "\n").trim();
  for (let i = 0; i < norm.length; i++) h = ((h << 5) + h + norm.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ── Batches ───────────────────────────────────────────────────────────────── */

function seedLines(lines: Omit<BatchLine, "row">[]): BatchLine[] {
  return lines.map((l, i) => ({ ...l, row: i + 1 }));
}

export const BULK_BATCHES: BulkBatch[] = [
  {
    id: "batch-0091",
    name: "Payroll — August",
    accountId: "acc-002",
    fileName: "payroll-august-2026.csv",
    fileHash: "seed-0091",
    submittedBy: "Ransford Gyasi",
    submittedAt: "2026-08-10 08:40",
    status: "released",
    transactionId: "txn-002",
    lines: seedLines([
      { name: "Ama Darko", bank: "Absa Bank Ghana Limited", account: "0119223477120", rail: "ach", amount: 3_800, reference: "August salary", status: "paid" },
      { name: "Yaw Mensah", bank: "Ecobank Ghana Limited", account: "1441009873311", rail: "gip", amount: 4_100, reference: "August salary", status: "paid" },
      { name: "Akua Boakye", bank: "GCB Bank PLC", account: "1001223477990", rail: "gip", amount: 3_950, reference: "August salary", status: "paid" },
      { name: "Kofi Nyarko", bank: "Stanbic Bank Ghana Limited", account: "9040007712345", rail: "ach", amount: 4_400, reference: "August salary", status: "processing" },
      { name: "Efua Owusu", bank: "Fidelity Bank Ghana Limited", account: "2400118856001", rail: "ach-nrt", amount: 3_650, reference: "August salary", status: "paid" },
    ]),
  },
  {
    id: "batch-0090",
    name: "Payroll — July",
    accountId: "acc-002",
    fileName: "payroll-july-2026.csv",
    fileHash: "seed-0090",
    submittedBy: "Ransford Gyasi",
    submittedAt: "2026-08-08 09:05",
    status: "released",
    lines: seedLines([
      { name: "Ama Darko", bank: "Absa Bank Ghana Limited", account: "0119223477120", rail: "ach", amount: 3_800, reference: "July salary", status: "paid" },
      { name: "Yaw Mensah", bank: "Ecobank Ghana Limited", account: "1441009873311", rail: "gip", amount: 4_100, reference: "July salary", status: "paid" },
      {
        name: "Kwesi Amoah",
        bank: "Absa Bank Ghana Limited",
        account: "0119223477810",
        rail: "ach",
        amount: 4_200,
        reference: "July salary",
        status: "failed",
        failure: "The receiving bank says this account is closed. Nothing was debited for this line.",
      },
    ]),
  },
];

export function findBatch(id: string): BulkBatch | undefined {
  return BULK_BATCHES.find((b) => b.id === id);
}

/** A batch already submitted from the same file, if there is one. */
export function duplicateOf(hash: string): BulkBatch | undefined {
  return BULK_BATCHES.find((b) => b.fileHash === hash && b.status !== "returned");
}

let seq = 91;

function stampNow() {
  const d = new Date().toISOString();
  return { day: d.slice(0, 10), time: d.slice(11, 16) };
}

/**
 * Submit a checked batch for approval: one ledger entry for the total (awaiting approval) and one approval item
 * that carries the batch ID. Only lines without errors are submitted.
 */
export function submitBatch(input: {
  name: string;
  accountId: string;
  lines: BulkLine[];
  submittedBy: string;
  fileName?: string;
  fileHash?: string;
}): BulkBatch {
  seq += 1;
  const id = `batch-${String(seq).padStart(4, "0")}`;
  const { day, time } = stampNow();
  const { amount, fees } = totals(input.lines);
  const reference = `NIB-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;

  const transaction: Transaction = {
    id: `txn-${id}`,
    reference,
    date: day,
    time,
    valueDate: day,
    description: input.name,
    counterparty: input.lines.length === 1 ? "1 payee" : `${input.lines.length} payees`,
    counterpartyAccount: "—",
    accountId: input.accountId,
    currency: "GHS",
    amount,
    direction: "debit",
    kind: "bulk",
    state: "awaiting-approval",
    channel: "Bulk Upload",
    paymentMethod: "bulk",
    fee: fees,
    batchId: id,
    category: "Suppliers",
    profileKind: "CORPORATE",
  };
  recordTransaction(transaction);

  const submittedAt = `${day} ${time}`;
  const approval: ApprovalItem = {
    id: `apr-${id}`,
    reference,
    type: "payment",
    description: input.name,
    counterparty: `${input.name} · ${transaction.counterparty}`,
    currency: "GHS",
    amount,
    accountId: input.accountId,
    batchId: id,
    submittedBy: input.submittedBy,
    submittedAt,
    priority: "standard",
    steps: approvalPath(amount).map((kind) => ({ kind })),
    current: 0,
    status: "open",
    trail: [{ by: input.submittedBy, role: "Inputter", action: "submitted", at: submittedAt }],
  };
  APPROVAL_QUEUE.unshift(approval);

  const batch: BulkBatch = {
    id,
    name: input.name,
    accountId: input.accountId,
    fileName: input.fileName,
    fileHash: input.fileHash,
    submittedBy: input.submittedBy,
    submittedAt,
    status: "awaiting-approval",
    lines: input.lines.map((l) => ({ ...l, status: "waiting" })),
    transactionId: transaction.id,
    approvalId: approval.id,
  };
  BULK_BATCHES.unshift(batch);
  return batch;
}

/**
 * Release an authorised batch: each line goes out on its own payment type. In the prototype GIP lines are paid at
 * once, ACH and ACH NRT lines are processing, and an account number ending 0000 fails at the receiving bank, so the
 * per-line statuses and a failed line can be seen.
 */
export function releaseBatch(id: string): void {
  const batch = findBatch(id);
  if (!batch) return;
  batch.status = "released";
  for (const line of batch.lines) {
    if (digits(line.account).endsWith("0000")) {
      line.status = "failed";
      line.failure = "The receiving bank couldn't find this account. Nothing was debited for this line.";
    } else line.status = line.rail === "gip" ? "paid" : "processing";
  }
}

export function returnBatch(id: string): void {
  const batch = findBatch(id);
  if (batch) batch.status = "returned";
}
