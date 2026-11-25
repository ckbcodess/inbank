"use client";

/**
 * Who will use internet banking, and what each person can do. Part of the company's application
 * (/business/signup/enrol). Four views, one at a time: the list, a new person's details, one person's access, and
 * adding many people from a file. The page owns which view is open, because its title and Back follow it.
 *
 * Each person carries what the bank's form asks for (role, limit, what they can do, accounts), because the signed
 * letter is the contract and the bank sets up exactly what is on it.
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Download, Plus, Upload, UserPlus } from "@/components/ui/icons";
import UserAccessFields from "@/components/corporate/admin/UserAccessFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateOfBirthInput } from "@/components/ui/date-of-birth-input";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
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
  | { kind: "file" };

/** A person with nothing filled in: an Inputter at the bank's default limit, on every chosen account. */
export function newPerson(
  accounts: readonly EnrolledAccountSummary[],
  known: Partial<Pick<CorporateUserDraft, "name" | "email" | "mobile" | "designation">> = {},
): CorporateUserDraft {
  return {
    id: `u-added-${Date.now()}`,
    name: "",
    email: "",
    mobile: "",
    role: "Inputter",
    isFromMandate: false,
    limit: DEFAULT_USER_LIMIT,
    accountIds: accounts.map((a) => a.id),
    services: CORPORATE_SERVICES.map((s) => s.id),
    ...known,
  };
}

/** "Authoriser, up to GHS 10,000.00" */
export function accessLine(user: CorporateUserDraft): string {
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
        accounts={accounts}
        users={users}
        onAdd={(people) => onUsersChange([...users, ...people])}
        onDone={() => onViewChange({ kind: "list" })}
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
                className="-mx-2 flex w-[calc(100%+var(--spacing)*4)] cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-hover hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body text-foreground">{u.name}</span>
                  <span
                    className={`tabular block truncate text-caption ${problem ? "text-warning-text" : "text-muted-foreground"}`}
                  >
                    {problem || accessLine(u)}
                  </span>
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
        <Button variant="ghost" size="md" className="w-full" onClick={() => onViewChange({ kind: "file" })}>
          <Upload size={16} />
          Add Many From a File
        </Button>
      </div>

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
  const emailError = taken.includes(email.trim().toLowerCase()) ? "Someone in the list already uses this email." : "";
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
          const role = next.role as CorporateAppRole;
          const startedActing = roleActs(role) && !acts;
          onChange({
            ...draft,
            role,
            limit: !roleActs(role) ? 0 : startedActing ? DEFAULT_USER_LIMIT : next.limit,
            services: !roleActs(role) ? [] : startedActing ? CORPORATE_SERVICES.map((s) => s.id) : draft.services,
            accountIds: next.accountIds,
          });
        }}
      >
        {acts && (
          <Field label="What They Can Do">
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
        <Button size="md" disabled={Boolean(problem)} onClick={onSave} className="w-full">
          {isNew ? "Add Person" : "Save"}
        </Button>
        {problem && <p className="text-center text-caption text-muted-foreground">{problem}</p>}
        {!isNew && (
          <Button variant="ghost" size="md" onClick={onRemove} className="w-full">
            Remove From the List
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Many people from a file ────────────────────────────────────────────────── */

function PeopleFile({
  accounts,
  users,
  onAdd,
  onDone,
}: {
  accounts: EnrolledAccountSummary[];
  users: CorporateUserDraft[];
  onAdd: (people: CorporateUserDraft[]) => void;
  onDone: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState<PeopleListResult | null>(null);

  async function onFile(file: File) {
    const parsed = parsePeopleCsv(await file.text(), accounts, users);
    if ("problem" in parsed) {
      setResult(null);
      setProblem(parsed.problem);
      return;
    }
    setProblem("");
    if (parsed.people.length > 0) {
      onAdd(parsed.people);
      toast.success(parsed.people.length === 1 ? "1 person added" : `${parsed.people.length} people added`);
    }
    if (parsed.problems.length === 0) onDone();
    else setResult(parsed);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([peopleTemplateCsv(accounts)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "internet-banking-people.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {result && (
        <section className="flex flex-col gap-2">
          <h2 className="text-body font-medium text-foreground">Not Added Yet</h2>
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

      <div className="flex flex-col gap-3">
        <Button variant="outline" size="md" className="w-full" onClick={downloadTemplate}>
          <Download size={16} />
          Download Template
        </Button>
        <Button size="md" className="w-full" onClick={() => input.current?.click()}>
          <Upload size={16} />
          {result ? "Upload the Corrected Rows" : "Choose File"}
        </Button>
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
        {result && (
          <Button variant="ghost" size="md" className="w-full" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
