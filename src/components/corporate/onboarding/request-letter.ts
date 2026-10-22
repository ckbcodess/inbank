/**
 * The request letter a company signs to ask for internet banking. GCB requires a letter on company letterhead,
 * signed per the mandate (Esther, 2026-10-16). We write it from what the applicant entered, so all they do is
 * print it on their letterhead, sign it and send it back. The top of the page is left blank for the letterhead.
 *
 * It opens as a printable page in a new tab. The bank's own application form layout isn't known yet, so the
 * user details sit in an annex to the letter rather than imitating that form (see WORKING_LOG).
 *
 * The page is a printed document outside the app, so it carries its own print styles: the app's tokens and
 * theme don't reach it, and it has to read the same on paper in either theme.
 */

import {
  CORPORATE_ROLE_LINE,
  lastFour,
  signatoryLabel,
  type CompanyApplicant,
  type CorporateCompanyRecord,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
} from "@/lib/corporate-enrolment";

export interface RequestLetterData {
  reference: string;
  company: CorporateCompanyRecord;
  accounts: EnrolledAccountSummary[];
  users: CorporateUserDraft[];
  /** Who prepared the request. When they aren't a signatory (a company secretary), the letter names them as the contact. */
  applicant?: CompanyApplicant | null;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function requestLetterHtml({ reference, company, accounts, users, applicant }: RequestLetterData): string {
  const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const addressee = company.relationshipManager
    ? `${esc(company.relationshipManager.name)}<br>Relationship Manager`
    : "The Corporate Banking Team";
  const greeting = company.relationshipManager ? `Dear ${esc(company.relationshipManager.name)},` : "Dear Sir or Madam,";

  const accountRows = accounts
    .map((a) => `<tr><td>${esc(a.name)}</td><td class="num">${esc(a.number)}</td><td>${esc(a.currency)}</td></tr>`)
    .join("");

  const userRows = users
    .map(
      (u) => `<tr>
        <td>${esc(u.name)}</td>
        <td>${esc(u.designation ?? "")}</td>
        <td class="num">${esc(u.mobile)}</td>
        <td>${esc(u.email)}</td>
        <td class="num">${esc(u.ghanaCard ?? "")}</td>
        <td>${esc(u.role)}</td>
      </tr>`,
    )
    .join("");

  const signatureBlocks = company.signatories
    .map(
      (s) => `<div class="sign">
        <div class="line"></div>
        <div>${esc(s.name)}</div>
        <div class="muted">${esc(signatoryLabel(s))}</div>
        <div class="muted">Date:</div>
      </div>`,
    )
    .join("");

  const contact =
    applicant && !applicant.isSignatory
      ? `<p>This request was prepared by ${esc(applicant.name)}${applicant.designation ? `, ${esc(applicant.designation)}` : ""}, who you may contact about it on <span class="num">${esc(applicant.mobile)}</span> or ${esc(applicant.email)}.</p>`
      : "";

  const roleNotes = (Object.keys(CORPORATE_ROLE_LINE) as (keyof typeof CORPORATE_ROLE_LINE)[])
    .map((r) => `<li><strong>${r}</strong>: ${esc(CORPORATE_ROLE_LINE[r])}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Internet banking request · ${esc(company.companyName)} · ${esc(reference)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: "Open Sans", Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; max-width: 170mm; margin: 0 auto; padding: 24px; }
  .letterhead { height: 40mm; border: 1px dashed #bbb; display: flex; align-items: center; justify-content: center; color: #888; font-size: 9pt; margin-bottom: 8mm; }
  h1 { font-size: 12pt; font-weight: 600; margin: 6mm 0 3mm; }
  h2 { font-size: 11pt; font-weight: 600; margin: 8mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 10pt; }
  th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 4px 6px 4px 0; vertical-align: top; }
  th { font-weight: 600; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .muted { color: #555; font-size: 9.5pt; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm 12mm; margin-top: 8mm; }
  .sign .line { border-bottom: 1px solid #111; height: 14mm; margin-bottom: 2mm; }
  .stamp { margin-top: 8mm; width: 45mm; height: 30mm; border: 1px dashed #bbb; display: flex; align-items: center; justify-content: center; color: #888; font-size: 9pt; }
  .annex { page-break-before: always; }
  .print { position: fixed; top: 16px; right: 16px; padding: 8px 14px; border: 0; border-radius: 8px; background: #FFC423; color: #111; font: inherit; cursor: pointer; }
  @media print { .print, .letterhead { border-color: transparent; color: transparent; } .print { display: none; } }
</style>
</head>
<body>
<button class="print" onclick="window.print()">Print</button>
<div class="letterhead">Leave this space for your company letterhead</div>

<p>${today}</p>
<p>${addressee}<br>GCB Bank PLC</p>
<p class="num">Our reference: ${esc(reference)}</p>

<p>${greeting}</p>
<h1>Request for corporate internet banking: ${esc(company.companyName)}</h1>
<p>${esc(company.companyName)} (TIN <span class="num">${esc(company.tin)}</span>) asks GCB Bank to give us access to corporate internet banking for the accounts below, for the users and roles listed in the annex to this letter.</p>

<table>
  <thead><tr><th>Account</th><th>Account number</th><th>Currency</th></tr></thead>
  <tbody>${accountRows}</tbody>
</table>

<p>We confirm that the users in the annex may act on internet banking in the roles shown, within our mandate (${esc(company.mandate.toLowerCase())}). This letter is signed by ${esc(company.signingRule)}.</p>
${contact}

<p>Yours faithfully,</p>
<div class="signs">${signatureBlocks}</div>
<div class="stamp">Company stamp</div>

<div class="annex">
  <h2>Annex: internet banking users</h2>
  <p class="muted num">${esc(company.companyName)} · ${esc(reference)} · accounts ${accounts.map((a) => esc(lastFour(a.number))).join(", ")}</p>
  <table>
    <thead><tr><th>Name</th><th>Designation</th><th>Mobile</th><th>Email</th><th>Ghana Card</th><th>Role</th></tr></thead>
    <tbody>${userRows}</tbody>
  </table>
  <ul class="muted">${roleNotes}</ul>
  <p class="muted">Signatories' Ghana Card numbers are already held by the bank. Authorisers must be signatories on the mandate.</p>
</div>
</body>
</html>`;
}

/** Opens the letter in a new tab, ready to print. */
export function openRequestLetter(data: RequestLetterData): void {
  const url = URL.createObjectURL(new Blob([requestLetterHtml(data)], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
