/**
 * Adding many authorised users to a business's request from one CSV file (designer, 2026-11-26, restored from the
 * earlier people step). The bank's paper form has room for four initiators, four authorisers and six viewers, and
 * companies with more attach a list; some have over a hundred people. Good rows are added, and the rest come back
 * with the reason, so one mistake doesn't send the whole file back. Nothing is added until the review is confirmed.
 *
 * Every role on the request can come from the file. An Authoriser must be a signatory (BRL-03): the file says so by
 * the role, as the dialog does, and staff check it against the mandate.
 */

import {
  CORPORATE_SERVICES,
  DEFAULT_USER_LIMIT,
  roleActs,
  type CorporateAppRole,
  type CorporateService,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
} from "../corporate-enrolment";
import { csvRows, splitCsvRow } from "../csv";
import { parseDateOfBirth } from "../date-of-birth";
import { isCompleteGhanaMobile, toLocalMobile } from "../phone";

const ROLES: CorporateAppRole[] = ["Viewer", "Inputter", "Authoriser"];
const COLUMNS = ["name", "email", "mobile", "date_of_birth", "role", "limit", "services", "account_last_4_digits"] as const;
/** Columns that may be left out of the file: an empty limit takes the bank's default, empty services take them all. */
const OPTIONAL: readonly (typeof COLUMNS)[number][] = ["limit", "services"];

/** Files made from the earlier template called the accounts column "accounts". */
const COLUMN_ALIASES: Partial<Record<(typeof COLUMNS)[number], string>> = { account_last_4_digits: "accounts" };

/** The words the services column takes, per service. */
const SERVICE_WORDS: Record<CorporateService, string[]> = {
  transfers: ["transfer", "transfers", "funds transfer", "ft"],
  bulk: ["bulk", "bulk uploads", "salary", "bu"],
  trade: ["trade", "trade inquiries", "trade enquiries", "ti"],
};

/**
 * A template with three example rows, using the request's own accounts. The accounts column takes each account's
 * last four digits, separated by semicolons, or "all". Services take "transfer", "bulk" and "trade", separated by
 * semicolons, or "all". Dates are written with the month's name (14 May 1990): Excel can re-save 14/05/1990 as 05/14/1990 on a
 * computer set to US dates, and a month name can't be misread.
 */
export function peopleTemplateCsv(accounts: readonly EnrolledAccountSummary[]): string {
  const last = accounts[0]?.number.slice(-4) ?? "0000";
  return `${COLUMNS.join(",")}
Adwoa Mensah,adwoa.mensah@example.com,0244300420,14 May 1990,Inputter,50000,transfer;bulk;trade,all
Yaw Oppong,yaw.oppong@example.com,0244123456,2 Sep 1971,Authoriser,500000,transfer,${last}
Esi Boateng,esi.boateng@example.com,0552309981,21 Nov 1993,Viewer,,,all
`;
}

/** Downloads the template as a CSV file. */
export function downloadPeopleTemplate(accounts: readonly EnrolledAccountSummary[]): void {
  const url = URL.createObjectURL(new Blob([peopleTemplateCsv(accounts)], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "GCB-authorised-users-template.csv";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface PeopleListResult {
  people: CorporateUserDraft[];
  /** One per row that wasn't added. `row` is the row number a spreadsheet shows. */
  problems: { row: number; reason: string }[];
}

export function parsePeopleCsv(
  text: string,
  accounts: readonly EnrolledAccountSummary[],
  existing: readonly Pick<CorporateUserDraft, "email">[],
): PeopleListResult | { problem: string } {
  const rows = csvRows(text);
  if (rows.length === 0) return { problem: "The file is empty." };
  const header = splitCsvRow(rows[0]).map((h) => h.toLowerCase());
  const column = (c: (typeof COLUMNS)[number]) => {
    const at = header.indexOf(c);
    const alias = COLUMN_ALIASES[c];
    return at >= 0 || !alias ? at : header.indexOf(alias);
  };
  const missing = COLUMNS.filter((c) => !OPTIONAL.includes(c) && column(c) < 0);
  if (missing.length > 0) {
    return {
      problem: `The file is missing the ${missing.join(", ")} column${missing.length > 1 ? "s" : ""}. Please use the template.`,
    };
  }
  if (rows.length === 1) return { problem: "The file has no users under the header row." };

  const seen = new Set(existing.map((u) => u.email.toLowerCase()));
  const people: CorporateUserDraft[] = [];
  const problems: PeopleListResult["problems"] = [];

  rows.slice(1).forEach((line, i) => {
    const cells = splitCsvRow(line);
    const cell = (name: (typeof COLUMNS)[number]) => (column(name) >= 0 ? (cells[column(name)] ?? "") : "");
    const row = i + 2;
    const fail = (reason: string) => problems.push({ row, reason });

    const name = cell("name");
    const email = cell("email");
    const dateOfBirth = parseDateOfBirth(cell("date_of_birth"));
    const role = ROLES.find((r) => r.toLowerCase() === cell("role").toLowerCase());
    const wanted = cell("account_last_4_digits").split(/[;\s]+/).filter(Boolean);
    const unknown = wanted.filter((w) => w.toLowerCase() !== "all" && !accounts.some((a) => a.number.endsWith(w)));
    const accountIds = wanted.some((w) => w.toLowerCase() === "all")
      ? accounts.map((a) => a.id)
      : accounts.filter((a) => wanted.some((w) => a.number.endsWith(w))).map((a) => a.id);
    const serviceWords = cell("services").toLowerCase().split(";").map((w) => w.trim()).filter(Boolean);
    const services =
      serviceWords.length === 0 || serviceWords.includes("all")
        ? CORPORATE_SERVICES.map((s) => s.id)
        : CORPORATE_SERVICES.filter((s) => serviceWords.some((w) => SERVICE_WORDS[s.id].includes(w))).map((s) => s.id);
    // "10,000.00" and "10000" are the same limit; an empty one takes the bank's default.
    const limitText = cell("limit").split(".")[0].replace(/\D/g, "");
    const limit = limitText === "" ? DEFAULT_USER_LIMIT : Number(limitText);

    if (!name) return fail("The name is missing.");
    if (!email.includes("@")) return fail(`Please check ${name}'s email address.`);
    if (seen.has(email.toLowerCase())) return fail(`${email} is already on the list.`);
    if (!isCompleteGhanaMobile(cell("mobile"))) return fail(`Please check ${name}'s mobile number.`);
    if (!dateOfBirth) return fail(`Please check ${name}'s date of birth. Write it as 14 May 1990.`);
    if (!role) return fail(`${name}'s role must be Viewer, Inputter or Authoriser.`);
    if (unknown.length > 0) return fail(`Account ${unknown[0]} is not one of the accounts on this request.`);
    if (roleActs(role) && accountIds.length === 0) return fail(`Please give an account for ${name}.`);
    if (roleActs(role) && services.length === 0) return fail(`${name}'s services must be transfer, bulk, trade or all.`);
    if (roleActs(role) && limit <= 0) return fail(`Please give a limit for ${name}.`);

    seen.add(email.toLowerCase());
    people.push({
      id: `u-list-${Date.now()}-${row}`,
      name,
      email,
      mobile: toLocalMobile(cell("mobile")),
      dateOfBirth,
      role,
      isFromMandate: role === "Authoriser",
      limit: roleActs(role) ? limit : 0,
      // Viewers see every account on the request, as in the dialog.
      accountIds: roleActs(role) ? accountIds : accounts.map((a) => a.id),
      services: roleActs(role) ? services : [],
    });
  });

  return { people, problems };
}
