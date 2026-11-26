"use client";

/**
 * Who will use internet banking, and what each person can do. Part of the company's application
 * (/business/signup/enrol). Four views, one at a time: the list, a new person's details, one person's access, and
 * the rows a file couldn't add. The list carries a dashed drop zone for a file of people, with its template. The page owns which view is open, because its title and Back follow it.
 *
 * Each person carries what the bank's form asks for (role, limit, what they can do, accounts), because the signed
 * letter is the contract and the bank sets up exactly what is on it.
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, FileSpreadsheet, Paperclip, Plus, UserPlus, X } from "@/components/ui/icons";
import UserAccessFields from "@/components/corporate/admin/UserAccessFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateOfBirthInput } from "@/components/ui/date-of-birth-input";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { AppLoader } from "@/components/ui/loader";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  accessProblem,
  CORPORATE_ROLES,
  CORPORATE_SERVICES,
  DEFAULT_USER_LIMIT,
  roleActs,
  usersReady,
  type CorporateAppRole,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
} from "@/lib/corporate-enrolment";
import { parsePeopleCsv, peopleTemplateCsv, type PeopleListResult } from "@/lib/corporate/people-list";
import { displayDateOfBirth, isCompleteDateOfBirth, parseDateOfBirth } from "@/lib/date-of-birth";
import { formatMoney } from "@/lib/mock-data";
import { isCompleteGhanaMobile } from "@/lib/phone";

export type PeopleView =
  | { kind: "list" }
  | { kind: "details"; draft: CorporateUserDraft }
  | { kind: "access"; draft: CorporateUserDraft; isNew: boolean }
  /** What a chosen file holds, to review before anyone is added. */
  | { kind: "file"; result: PeopleListResult };

/** A person with nothing chosen for them: no role, services or accounts. Only the limit starts at the bank's default. */
export function newPerson(
  accounts: readonly EnrolledAccountSummary[],
  known: Partial<Pick<CorporateUserDraft, "name" | "email" | "mobile" | "designation">> = {},
): CorporateUserDraft {
  return {
    id: `u-added-${Date.now()}`,
    name: "",
    email: "",
    mobile: "",
    role: null,
    isFromMandate: false,
    limit: DEFAULT_USER_LIMIT,
    accountIds: [],
    services: [],
    ...known,
  };
}

/** "Yaw Oppong" → "YO". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "Authoriser, up to GHS 10,000.00" */
export function accessLine(user: CorporateUserDraft): string {
  if (!user.role) return "";
  return roleActs(user.role) ? `${user.role}, up to ${formatMoney(user.limit, "GHS", true)}` : user.role;
}

export default function PeopleStep({
  view,
  onViewChange,
  users,
  onUsersChange,
  accounts,
  self,
  onContinue,
}: {
  view: PeopleView;
  onViewChange: (view: PeopleView) => void;
  users: CorporateUserDraft[];
  onUsersChange: (users: CorporateUserDraft[]) => void;
  /** The accounts chosen for the application. */
  accounts: EnrolledAccountSummary[];
  /** The applicant, when they aren't a user yet. Offers to add them with what they already typed. */
  self: Pick<CorporateUserDraft, "name" | "email" | "mobile" | "designation"> | null;
  onContinue: () => void;
}) {
  if (view.kind === "details") {
    return (
      <PersonDetails
        draft={view.draft}
        taken={users.map((u) => u.email.toLowerCase())}
        onNext={(draft) => onViewChange({ kind: "access", draft, isNew: true })}
      />
    );
  }

  if (view.kind === "access") {
    return (
      <PersonAccess
        draft={view.draft}
        isNew={view.isNew}
        accounts={accounts}
        onChange={(draft) => onViewChange({ ...view, draft })}
        onSave={() => {
          onUsersChange(
            view.isNew ? [...users, view.draft] : users.map((u) => (u.id === view.draft.id ? view.draft : u)),
          );
          onViewChange({ kind: "list" });
        }}
        onRemove={() => {
          const before = users;
          onUsersChange(users.filter((u) => u.id !== view.draft.id));
          onViewChange({ kind: "list" });
          toast.success(`${view.draft.name} removed`, { action: { label: "Undo", onClick: () => onUsersChange(before) } });
        }}
      />
    );
  }

  if (view.kind === "file") {
    return (
      <PeopleFile
        result={view.result}
        accounts={accounts}
        users={users}
        onAdd={(people) => {
          onUsersChange([...users, ...people]);
          toast.success(people.length === 1 ? "1 person added" : `${people.length} people added`);
          onViewChange({ kind: "list" });
        }}
        onReplace={(result) => onViewChange({ kind: "file", result })}
        onCancel={() => onViewChange({ kind: "list" })}
      />
    );
  }

  const block = usersReady(users);
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col">
        {users.map((u) => {
          const problem = accessProblem(u);
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onViewChange({ kind: "access", draft: u, isNew: false })}
                className="-mx-2 flex w-[calc(100%+var(--spacing)*4)] cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-hover hover:bg-muted/50"
              >
                {/* Who they are on the left (where the name came from), what they can do on the right. Someone
                    with no role yet is amber on both sides (designer, 2026-11-26, people list variation 9). */}
                <span
                  aria-hidden="true"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-caption font-medium ${
                    u.role ? "bg-muted text-foreground" : "bg-warning/15 text-warning-text"
                  }`}
                >
                  {initials(u.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-foreground">{u.name}</span>
                  <span
                    className={`block truncate text-caption ${u.role && problem ? "text-warning-text" : "text-muted-foreground"}`}
                  >
                    {u.role && problem ? problem : u.isFromMandate ? (u.designation ?? "Signatory") : "Added by you"}
                  </span>
                </span>
                <span className="shrink-0 text-right text-caption">
                  {u.role ? (
                    <>
                      <span className="block text-foreground">{u.role}</span>
                      {roleActs(u.role) && (
                        <span className="tabular block text-muted-foreground">{formatMoney(u.limit, "GHS", true)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-warning-text">Set up</span>
                  )}
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        {self && (
          <Button
            variant="outline"
            size="md"
            className="w-full"
            onClick={() => onViewChange({ kind: "details", draft: newPerson(accounts, self) })}
          >
            <UserPlus size={16} />
            Add Myself
          </Button>
        )}
        <Button
          variant="outline"
          size="md"
          className="w-full"
          onClick={() => onViewChange({ kind: "details", draft: newPerson(accounts) })}
        >
          <Plus size={16} />
          Add a Person
        </Button>
      </div>

      <PeopleDropZone accounts={accounts} users={users} onParsed={(result) => onViewChange({ kind: "file", result })} />

      <div className="flex flex-col gap-2">
        <Button size="md" disabled={Boolean(block)} onClick={onContinue} className="w-full">
          Continue
        </Button>
        {block && <p className="text-center text-caption text-muted-foreground">{block}</p>}
      </div>
    </div>
  );
}

/* ── A new person's details ─────────────────────────────────────────────────── */

function PersonDetails({
  draft,
  taken,
  onNext,
}: {
  draft: CorporateUserDraft;
  /** Emails already in the list. Email is a login, so two people can't share one. */
  taken: string[];
  onNext: (draft: CorporateUserDraft) => void;
}) {
  const [name, setName] = useState(draft.name);
  const [mobile, setMobile] = useState(draft.mobile);
  const [email, setEmail] = useState(draft.email);
  const [birth, setBirth] = useState(draft.dateOfBirth ? displayDateOfBirth(draft.dateOfBirth) : "");

  const dateOfBirth = parseDateOfBirth(birth);
  const birthError = isCompleteDateOfBirth(birth) && !dateOfBirth ? "Enter a real date, day first." : "";
  const mobileError = mobile && !isCompleteGhanaMobile(mobile) ? "Enter a full Ghana mobile number." : "";
  const emailError = taken.includes(email.trim().toLowerCase()) ? "This email is already listed." : "";
  const ready =
    name.trim() !== "" && email.includes("@") && !emailError && isCompleteGhanaMobile(mobile) && dateOfBirth !== "";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onNext({ ...draft, name: name.trim(), email: email.trim(), mobile, dateOfBirth });
      }}
    >
      <Field label="Full Name" htmlFor="personName">
        <Input id="personName" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Mobile Number" htmlFor="personMobile" error={mobileError}>
        <PhoneInput id="personMobile" value={mobile} onValueChange={setMobile} />
      </Field>
      <Field label="Email" htmlFor="personEmail" error={emailError}>
        <Input id="personEmail" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Date of Birth" htmlFor="personBirth" error={birthError}>
        <DateOfBirthInput id="personBirth" value={birth} onValueChange={setBirth} aria-invalid={Boolean(birthError)} />
      </Field>
      <Button type="submit" size="md" disabled={!ready} className="mt-2 w-full">
        Continue
      </Button>
    </form>
  );
}

/* ── One person's access ────────────────────────────────────────────────────── */

function PersonAccess({
  draft,
  isNew,
  accounts,
  onChange,
  onSave,
  onRemove,
}: {
  draft: CorporateUserDraft;
  isNew: boolean;
  accounts: EnrolledAccountSummary[];
  onChange: (draft: CorporateUserDraft) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const problem = accessProblem(draft);
  const acts = roleActs(draft.role);

  return (
    <div className="flex flex-col gap-6">
      <UserAccessFields
        draft={{ role: draft.role, limit: draft.limit, accountIds: draft.accountIds, onMandate: Boolean(draft.isFromMandate) }}
        roles={CORPORATE_ROLES}
        accounts={accounts}
        limitPlaceholder="For example, 10,000"
        onChange={(next) => {
          // The application offers CORPORATE_ROLES only, so the shared form's wider role type narrows back here.
          const role = next.role as CorporateAppRole | null;
          const startedActing = roleActs(role) && !acts;
          // Only the limit is filled in for them. What they can do stays theirs to tick.
          onChange({
            ...draft,
            role,
            limit: !roleActs(role) ? (role ? 0 : draft.limit) : startedActing ? draft.limit || DEFAULT_USER_LIMIT : next.limit,
            services: roleActs(role) ? draft.services : [],
            accountIds: next.accountIds,
          });
        }}
      >
        {acts && (
          <Field label="Services">
            <div className="flex flex-col gap-1">
              {CORPORATE_SERVICES.map((s) => (
                <label
                  key={s.id}
                  className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
                >
                  <Checkbox
                    checked={draft.services.includes(s.id)}
                    onCheckedChange={(next) =>
                      onChange({
                        ...draft,
                        services: next ? [...draft.services, s.id] : draft.services.filter((x) => x !== s.id),
                      })
                    }
                  />
                  <span className="text-body text-foreground">{s.label}</span>
                </label>
              ))}
            </div>
          </Field>
        )}
      </UserAccessFields>

      <div className="flex flex-col gap-2">
        {/* While something is missing, the button says what (designer, 2026-11-26), instead of a line under it. */}
        <Button size="md" disabled={Boolean(problem)} onClick={onSave} className="w-full">
          {problem || (isNew ? "Add Person" : "Save")}
        </Button>
        {!isNew && (
          <Button variant="outline" size="md" onClick={onRemove} className="w-full">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Many people from a file ────────────────────────────────────────────────── */

function PeopleFile({
  result,
  accounts,
  users,
  onAdd,
  onReplace,
  onCancel,
}: {
  result: PeopleListResult;
  accounts: EnrolledAccountSummary[];
  users: CorporateUserDraft[];
  /** Adds the people the file holds. Nothing is added until this is pressed. */
  onAdd: (people: CorporateUserDraft[]) => void;
  /** Another file, chosen to replace this one. */
  onReplace: (result: PeopleListResult) => void;
  onCancel: () => void;
}) {
  const count = result.people.length;
  return (
    <div className="flex flex-col gap-6">
      {result.problems.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-body font-medium text-warning-text">
            {result.problems.length === 1 ? "1 Row Won't Be Added" : `${result.problems.length} Rows Won't Be Added`}
          </h2>
          <ul className="flex flex-col gap-2">
            {result.problems.map((p) => (
              <li key={p.row} className="flex gap-3 text-body">
                <span className="tabular shrink-0 text-muted-foreground">{`Row ${p.row}`}</span>
                <span className="text-foreground">{p.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {count > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-body font-medium text-foreground">{count === 1 ? "1 Person to Add" : `${count} People to Add`}</h2>
          <ul className="flex flex-col">
            {result.people.map((u) => (
              <li key={u.id} className="py-1">
                <p className="truncate text-body text-foreground">{u.name}</p>
                <p className="tabular truncate text-caption text-muted-foreground">
                  {`${accessLine(u)} · ${accounts
                    .filter((a) => u.accountIds.includes(a.id))
                    .map((a) => `•••• ${a.number.slice(-4)}`)
                    .join(", ")}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PeopleDropZone accounts={accounts} users={users} onParsed={onReplace} replacing />

      <div className="flex flex-col gap-2">
        <Button size="md" className="w-full" disabled={count === 0} onClick={() => onAdd(result.people)}>
          {count === 1 ? "Add 1 Person" : `Add ${count} People`}
        </Button>
        <Button variant="ghost" size="md" className="w-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── A file of people ───────────────────────────────────────────────────────── */

/**
 * A file of people, as a row like the signed letter's: an icon, what it is, and Choose File, with the sample under it.
 * No drag and drop (designer, 2026-11-26). Choosing a file shows a short reading state, then the row becomes the file:
 * how many people are ready, how many rows need fixing, and Review. Nothing is added until the review says so. On the
 * review screen (`replacing`) a new file goes straight to review, replacing the one there.
 */
function PeopleDropZone({
  accounts,
  users,
  onParsed,
  replacing = false,
}: {
  accounts: EnrolledAccountSummary[];
  users: CorporateUserDraft[];
  onParsed: (result: PeopleListResult) => void;
  /** On the review screen, where a new file replaces the one being reviewed. */
  replacing?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const [chosen, setChosen] = useState<{ name: string; result: PeopleListResult } | null>(null);

  async function onFile(file: File) {
    setProblem("");
    setChosen(null);
    setReading(file.name);
    // A short beat so choosing and seeing the count read as two moments, even for a small file.
    const [text] = await Promise.all([file.text(), new Promise((r) => window.setTimeout(r, 600))]);
    const parsed = parsePeopleCsv(text, accounts, users);
    setReading(null);
    if ("problem" in parsed) {
      setProblem(parsed.problem);
      return;
    }
    if (replacing) onParsed(parsed);
    else setChosen({ name: file.name, result: parsed });
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([peopleTemplateCsv(accounts)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "internet-banking-people.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const icon = (
    <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">
      <FileSpreadsheet size={18} aria-hidden="true" />
    </span>
  );

  let title: string;
  let line: React.ReactNode;
  let actions: React.ReactNode;
  if (reading) {
    title = reading;
    line = (
      <span role="status" className="flex items-center gap-2 text-muted-foreground">
        <AppLoader size={12} />
        Reading…
      </span>
    );
    actions = null;
  } else if (chosen) {
    const ready = chosen.result.people.length;
    const toFix = chosen.result.problems.length;
    title = chosen.name;
    line = (
      <>
        <span className="text-muted-foreground">{ready === 1 ? "1 person ready" : `${ready} people ready`}</span>
        {toFix > 0 && (
          <>
            <span className="text-muted-foreground"> · </span>
            <span className="text-warning-text">{toFix === 1 ? "1 row needs fixing" : `${toFix} rows need fixing`}</span>
          </>
        )}
      </>
    );
    actions = (
      <>
        <Button variant="outline" size="md" className="shrink-0" onClick={() => onParsed(chosen.result)}>
          Review
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="Remove file" onClick={() => setChosen(null)}>
          <X size={15} />
        </Button>
      </>
    );
  } else {
    title = replacing ? "Upload a Corrected List" : "Upload a List";
    line = <span className="text-muted-foreground">CSV, one row per person</span>;
    actions = (
      <Button variant="outline" size="md" className="shrink-0" onClick={() => input.current?.click()}>
        <Paperclip size={15} aria-hidden="true" />
        Choose File
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-foreground">{title}</p>
            <p className="truncate text-caption">{line}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      {!chosen && !reading && (
        <button
          type="button"
          onClick={downloadTemplate}
          className="cursor-pointer self-start text-caption text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
        >
          Download the sample CSV
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        aria-label="Choose a file of people"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Cleared so the same file, corrected, can be chosen again.
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
      <InlineError message={problem} />
    </div>
  );
}
