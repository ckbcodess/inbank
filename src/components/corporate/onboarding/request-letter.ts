/**
 * The letter of request, written from the form's answers (designer, 2026-11-26): the business, its accounts and each
 * person's details, role, limit, services and accounts. The signatories sign it as their mandate requires and each
 * user signs beside their name, which also makes it the "board resolution or letter specifying users" the bank's
 * form (GCB/IBCAF/2014/038) asks for. Because the signature sits on exactly what was asked for, staff check the
 * answers against it instead of retyping it.
 *
 * Signatories' names are left for them to write: nothing is looked up online, so the form doesn't know them.
 *
 * The same HTML is previewed in the app (an iframe) and downloaded as a page that prints on A4 with room for the
 * letterhead. It is a printed document outside the app, so it carries its own print styles: the app's tokens and
 * theme don't reach it, and it has to read the same on paper in either theme.
 */

import {
  BANK_FORM_NUMBER,
  lastFour,
  roleActs,
  serviceLabels,
  type BusinessDetails,
  type CompanyApplicant,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
  type EnrolmentApplication,
} from "@/lib/corporate-enrolment";
import { displayDateOfBirth } from "@/lib/date-of-birth";
import { formatMoney } from "@/lib/mock-data";

export interface RequestLetterData {
  reference: string;
  business: BusinessDetails;
  applicant: CompanyApplicant;
  accounts: EnrolledAccountSummary[];
  users: CorporateUserDraft[];
}

/** The letter's data from a saved request, for downloading it again from the emailed link. */
export function letterDataFrom(app: EnrolmentApplication): RequestLetterData {
  return {
    reference: app.reference,
    business: {
      kind: app.businessKind ?? "company",
      name: app.companyName,
      nature: app.natureOfBusiness ?? "",
      email: app.companyEmail ?? "",
      phone: app.companyPhone ?? "",
      location: app.companyAddress ?? "",
    },
    applicant: app.applicant,
    accounts: app.accounts,
    users: app.users,
  };
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function requestLetterHtml(
  { reference, business, applicant, accounts, users }: RequestLetterData,
  { printButton = true }: { printButton?: boolean } = {},
): string {
  const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const sole = business.kind === "sole";

  const accountRows = accounts
    .map((a, i) => `<tr><td class="num">${i + 1}</td><td class="num">${esc(a.number)}</td></tr>`)
    .join("");

  const userRows = users
    .map((u) => {
      const theirs = accounts.filter((a) => u.accountIds.includes(a.id));
      return `<tr>
        <td>${esc(u.name)}</td>
        <td>${esc(u.role ?? "")}</td>
        <td class="num">${roleActs(u.role) ? esc(formatMoney(u.limit, "GHS", true)) : "None"}</td>
        <td>${roleActs(u.role) ? esc(serviceLabels(u.services)) : "View only"}</td>
        <td class="num">${theirs.length === accounts.length ? "All" : esc(theirs.map((a) => lastFour(a.number)).join(", "))}</td>
        <td>${esc(u.email)}</td>
        <td class="num">${esc(u.mobile)}</td>
        <td class="num">${esc(displayDateOfBirth(u.dateOfBirth ?? ""))}</td>
        <td class="specimen"></td>
      </tr>`;
    })
    .join("");

  const signBlock = `<div class="sign"><div class="line"></div><div>Name:</div><div>Position:</div><div>Date:</div></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Letter of request · internet banking · ${esc(reference)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: "Open Sans", Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #111; background: #fff; max-width: 178mm; margin: 0 auto; padding: 24px; }
  .letterhead { height: 30mm; border: 1px dashed #bbb; display: flex; align-items: center; justify-content: center; color: #888; font-size: 9pt; margin-bottom: 6mm; }
  .top { display: flex; justify-content: space-between; gap: 12mm; }
  h1 { font-size: 11.5pt; font-weight: 600; margin: 5mm 0 2mm; }
  h2 { font-size: 10.5pt; font-weight: 600; margin: 6mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 3mm; font-size: 8.5pt; }
  th, td { text-align: left; border: 1px solid #bbb; padding: 4px 5px; vertical-align: top; }
  th { font-weight: 600; background: #f4f4f4; }
  td.specimen { width: 24mm; height: 10mm; }
  .num { font-variant-numeric: tabular-nums; }
  .muted { color: #555; font-size: 9pt; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm 12mm; margin-top: 6mm; }
  .sign .line { border-bottom: 1px solid #111; height: 14mm; margin-bottom: 2mm; }
  .stamp { margin-top: 6mm; width: 45mm; height: 28mm; border: 1px dashed #bbb; display: flex; align-items: center; justify-content: center; color: #888; font-size: 9pt; }
  .print { position: fixed; top: 16px; right: 16px; padding: 8px 14px; border: 0; border-radius: 8px; background: #FFC423; color: #111; font: inherit; cursor: pointer; }
  @media print { .letterhead, .stamp { border-color: transparent; color: transparent; } .print { display: none; } }
</style>
</head>
<body>
${printButton ? `<button class="print" onclick="window.print()">Print</button>` : ""}
<div class="letterhead">Leave this space for your letterhead</div>

<div class="top">
  <p>The Corporate Banking Team<br>GCB Bank PLC</p>
  <p class="num" style="text-align:right">${esc(today)}<br>Reference: ${esc(reference)}</p>
</div>

<p>Dear Sir or Madam,</p>
<h1>Request for GCB Internet Banking (Corporate): ${esc(business.name)}</h1>
<p>${esc(business.name)}${sole ? ", a sole proprietorship" : ""}${business.nature.trim() ? `, engaged in ${esc(business.nature.charAt(0).toLowerCase() + business.nature.slice(1))}` : ""}, of ${esc(business.location)}, hereby requests GCB Bank PLC to provide internet banking for the accounts and the authorised users listed below. Our official email address is ${esc(business.email)} and our office telephone number is <span class="num">${esc(business.phone)}</span>.</p>

<h2>Accounts</h2>
<table>
  <thead><tr><th style="width:10mm">#</th><th>Account number</th></tr></thead>
  <tbody>${accountRows}</tbody>
</table>

<h2>Authorised users</h2>
<table>
  <thead><tr><th>Name</th><th>Role</th><th>Limit for one payment</th><th>Services</th><th>Accounts</th><th>Email</th><th>Mobile</th><th>Date of birth</th><th>Signature</th></tr></thead>
  <tbody>${userRows}</tbody>
</table>
<p class="muted">Inputters prepare payments; Authorisers approve them; Viewers may view balances, statements and transaction history. Inputters and Authorisers may also view. Default account, cheque and customer services are included. Each authorised user signs beside their name.</p>

<p>We confirm that the authorised users above may act on internet banking in the roles, up to the limits and on the accounts shown, within our mandate. We have read and accept the GCB Internet Banking (Corporate) Terms &amp; Conditions (form ${BANK_FORM_NUMBER}). This letter is signed as our mandate requires.</p>

<p>Yours faithfully,</p>
<div class="signs">${signBlock}${signBlock}</div>
<div class="stamp">${sole ? "Business stamp" : "Company stamp"}</div>

<p class="muted" style="margin-top:8mm">Prepared online by ${esc(applicant.name)}${applicant.designation ? `, ${esc(applicant.designation)}` : ""}. Please upload the signed letter, quoting reference <span class="num">${esc(reference)}</span>, using the link sent to ${esc(applicant.email)}.</p>
</body>
</html>`;
}

/** Downloads the letter as a page they can print on their letterhead and sign. */
export function downloadRequestLetter(data: RequestLetterData): void {
  const url = URL.createObjectURL(new Blob([requestLetterHtml(data)], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `GCB-internet-banking-request-${data.reference}.html`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
