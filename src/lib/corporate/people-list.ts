/**
 * Adding many people to a company's application from one file. The bank's paper form has room for four initiators,
 * four authorisers and six viewers, and companies with more attach a list; some have over a hundred people. Good
 * rows are added, and the rest come back with the reason, so one mistake doesn't send the whole file back.
 *
 * Only people who aren't on the mandate are added this way: signatories are already in the list from the bank's
 * records. So the file takes Inputters and Viewers (BRL-03).
 */

import {
  DEFAULT_USER_LIMIT,
  CORPORATE_SERVICES,
  roleActs,
  rolesFor,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
} from "../corporate-enrolment";
import { csvRows, splitCsvRow } from "../csv";
import { parseDateOfBirth } from "../date-of-birth";
import { isCompleteGhanaMobile, toLocalMobile } from "../phone";

const COLUMNS = ["name", "email", "mobile", "date_of_birth", "role", "limit", "accounts"] as const;

/** A template with two example rows. `accounts` takes last four digits separated by semicolons, or "all". */
export function peopleTemplateCsv(accounts: readonly EnrolledAccountSummary[]): string {
  const last = accounts[0]?.number.slice(-4) ?? "0000";
  return `${COLUMNS.join(",")}
Adwoa Mensah,adwoa.mensah@example.com,0244300420,14/05/1990,Inputter,10000,${last}
Kojo Asamoah,kojo.asamoah@example.com,0209988776,02/11/1986,Viewer,,all
`;
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
  const missing = COLUMNS.filter((c) => c !== "limit" && !header.includes(c));
  if (missing.length > 0) {
    return { problem: `The file is missing the ${missing.join(", ")} column${missing.length > 1 ? "s" : ""}. Use the template.` };
  }
  if (rows.length === 1) return { problem: "The file has nobody under the header." };

  const roles = rolesFor(false);
  const seen = new Set(existing.map((u) => u.email.toLowerCase()));
  const people: CorporateUserDraft[] = [];
  const problems: PeopleListResult["problems"] = [];

  rows.slice(1).forEach((line, i) => {
    const cells = splitCsvRow(line);
    const cell = (name: (typeof COLUMNS)[number]) => cells[header.indexOf(name)] ?? "";
    const row = i + 2;
    const fail = (reason: string) => problems.push({ row, reason });

    const name = cell("name");
    const email = cell("email");
    const dateOfBirth = parseDateOfBirth(cell("date_of_birth"));
    const role = roles.find((r) => r.toLowerCase() === cell("role").toLowerCase());
    const wanted = cell("accounts").split(/[;\s]+/).filter(Boolean);
    const unknown = wanted.filter((w) => w.toLowerCase() !== "all" && !accounts.some((a) => a.number.endsWith(w)));
    const accountIds = wanted.some((w) => w.toLowerCase() === "all")
      ? accounts.map((a) => a.id)
      : accounts.filter((a) => wanted.some((w) => a.number.endsWith(w))).map((a) => a.id);
    // "10,000.00" and "10000" are the same limit; an empty one takes the bank's default.
    const limitText = cell("limit").split(".")[0].replace(/\D/g, "");
    const limit = limitText === "" ? DEFAULT_USER_LIMIT : Number(limitText);

    if (!name) return fail("The name is missing.");
    if (!email.includes("@")) return fail(`Check ${name}'s email.`);
    if (seen.has(email.toLowerCase())) return fail(`${email} is already in the list.`);
    if (!isCompleteGhanaMobile(cell("mobile"))) return fail(`Check ${name}'s mobile number.`);
    if (!dateOfBirth) return fail(`Check ${name}'s date of birth. Put the day first.`);
    if (!role) return fail(`${name}'s role has to be ${roles.join(" or ")}. Only signatories review or authorise.`);
    if (unknown.length > 0) return fail(`Account ${unknown[0]} isn't one you chose.`);
    if (accountIds.length === 0) return fail(`Choose an account for ${name}.`);
    if (roleActs(role) && limit <= 0) return fail(`Enter a limit for ${name}.`);

    seen.add(email.toLowerCase());
    people.push({
      id: `u-list-${Date.now()}-${row}`,
      name,
      email,
      mobile: toLocalMobile(cell("mobile")),
      dateOfBirth,
      role,
      isFromMandate: false,
      limit: roleActs(role) ? limit : 0,
      accountIds,
      services: roleActs(role) ? CORPORATE_SERVICES.map((s) => s.id) : [],
    });
  });

  return { people, problems };
}
