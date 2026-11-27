"use client";

/**
 * The authorised users on the business's online request (/business/signup/enrol). The bank's form has three
 * tables (viewers, initiators, authorisers) cross-referenced to account codes A to H; here it is one list, one role
 * per person, so nobody can both prepare and approve (BRL-04). Adding or editing someone opens a dialog with what the
 * form asks: name, email, mobile, date of birth, then role, and for anyone who acts, their services, accounts and a
 * limit for one payment (designer, 2026-11-26, from prototype/corporate-form-prototype.html).
 *
 * Viewers see every account on the request, as on the form, so they choose none. Authorisers must sign for the
 * business (BRL-03); the applicant says so by choosing the role and staff check it against the mandate.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  Upload,
  UserPlus,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateOfBirthInput } from "@/components/ui/date-of-birth-input";
import { Modal } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CORPORATE_SERVICES,
  DEFAULT_USER_LIMIT,
  lastFour,
  roleActs,
  type BusinessKind,
  type CorporateAppRole,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
} from "@/lib/corporate-enrolment";
import {
  downloadPeopleTemplate,
  parsePeopleCsv,
  type PeopleListResult,
} from "@/lib/corporate/people-list";
import {
  displayDateOfBirth,
  isCompleteDateOfBirth,
  parseDateOfBirth,
} from "@/lib/date-of-birth";
import { formatMoney } from "@/lib/mock-data";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { cn } from "@/lib/utils";

/** The form's three roles, in the order a business thinks of them. Reviewer isn't on the form. */
const REQUEST_ROLES: { role: CorporateAppRole; line: string }[] = [
  {
    role: "Viewer",
    line: "May view balances, statements and transaction history on all listed accounts.",
  },
  {
    role: "Inputter",
    line: "May prepare payments for approval by an authoriser.",
  },
  {
    role: "Authoriser",
    line: "May approve payments prepared by others. Must be a signatory.",
  },
];

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

/** Which accounts, in a few words: "All accounts" or "•••• 7890". Services stay in the dialog, so the row doesn't
 *  clip (designer, 2026-11-26). */
function accessLine(
  user: CorporateUserDraft,
  accounts: readonly EnrolledAccountSummary[],
): string {
  const theirs = accounts.filter((a) => user.accountIds.includes(a.id));
  return !roleActs(user.role) || theirs.length === accounts.length
    ? "All accounts"
    : theirs.map((a) => lastFour(a.number)).join(", ");
}

type Open = { user: CorporateUserDraft; isNew: boolean } | null;

export default function RequestPeople({
  users,
  onUsersChange,
  accounts,
  kind,
  self,
}: {
  users: CorporateUserDraft[];
  onUsersChange: (users: CorporateUserDraft[]) => void;
  /** The accounts typed on the previous screen. */
  accounts: EnrolledAccountSummary[];
  kind: BusinessKind;
  /** The requester, offered as "Add Myself" until they're on the list. */
  self: Pick<CorporateUserDraft, "name" | "email" | "mobile">;
}) {
  const [open, setOpen] = useState<Open>(null);
  /** What a chosen CSV holds, shown for review before anyone is added. */
  const [review, setReview] = useState<PeopleListResult | null>(null);
  const [uploading, setUploading] = useState(false);

  async function readList(file: File) {
    const result = parsePeopleCsv(await file.text(), accounts, users);
    if ("problem" in result) toast.error(result.problem);
    else setReview(result);
  }

  const blank = (
    known: Partial<CorporateUserDraft> = {},
  ): CorporateUserDraft => ({
    id: `u-added-${Date.now()}`,
    name: "",
    email: "",
    mobile: "",
    role: null,
    limit: 0,
    // With one account there is nothing to choose, so it's ticked.
    accountIds: accounts.length === 1 ? [accounts[0].id] : [],
    services: [],
    ...known,
  });

  const add = (known: Partial<CorporateUserDraft> = {}) =>
    setOpen({ user: blank(known), isNew: true });

  const selfListed = users.some(
    (u) => u.email.trim().toLowerCase() === self.email.trim().toLowerCase(),
  );
  const hasInputter = users.some((u) => u.role === "Inputter");
  const hasAuthoriser = users.some((u) => u.role === "Authoriser");
  // What needs them is a row, first, with its action (CONSTITUTION §3).
  // One line, no lecture (designer, 2026-11-26).
  const needs =
    hasInputter && !hasAuthoriser
      ? "An authoriser is required to approve payments."
      : hasAuthoriser && !hasInputter && kind !== "sole"
        ? "An inputter is required to prepare payments."
        : null;

  return (
    <div className="flex flex-col gap-4">
      {needs && (
        <div className="flex items-center gap-3 rounded-xl bg-warning/10 px-3 py-2 text-warning-text">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-body">{needs}</p>
          <button
            type="button"
            onClick={() => add()}
            className="shrink-0 cursor-pointer text-body text-foreground underline underline-offset-4"
          >
            Add
          </button>
        </div>
      )}

      {users.length > 0 && (
        <ul className="flex flex-col">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setOpen({ user: u, isNew: false })}
                className="-mx-2 flex w-[calc(100%+var(--spacing)*4)] cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-hover hover:bg-muted/50"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-medium text-foreground"
                >
                  {initials(u.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-foreground">
                    {u.name}
                  </span>
                  <span className="tabular block truncate text-caption text-muted-foreground">
                    {accessLine(u, accounts)}
                  </span>
                </span>
                <span className="shrink-0 text-right text-caption">
                  <span className="block text-body text-foreground">
                    {u.role}
                  </span>
                  {roleActs(u.role) && (
                    <span className="tabular block text-muted-foreground">
                      {formatMoney(u.limit, "GHS", true)}
                    </span>
                  )}
                </span>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add a User opens the form; Upload a List is its own button and dialog for many users from a CSV
          (designer, 2026-11-26). */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => add()}>
          <Plus size={15} aria-hidden="true" />
          Add a User
        </Button>
        <Button variant="outline" size="sm" onClick={() => setUploading(true)}>
          <Upload size={15} aria-hidden="true" />
          Upload a List
        </Button>
        {!selfListed && self.name.trim() && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              add({
                name: self.name.trim(),
                email: self.email.trim(),
                mobile: self.mobile,
              })
            }
          >
            <UserPlus size={15} aria-hidden="true" />
            Add Myself
          </Button>
        )}
      </div>

      {review && (
        <Modal
          open
          onOpenChange={(o) => !o && setReview(null)}
          title="Review the List"
          bodyClassName="gap-5"
          footer={
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => setReview(null)}
              >
                Cancel
              </Button>
              <Button
                size="md"
                disabled={review.people.length === 0}
                onClick={() => {
                  onUsersChange([...users, ...review.people]);
                  toast.success(
                    review.people.length === 1
                      ? "1 user has been added"
                      : `${review.people.length} users have been added`,
                  );
                  setReview(null);
                }}
              >
                {review.people.length === 0
                  ? "No Users to Add"
                  : review.people.length === 1
                    ? "Add 1 User"
                    : `Add ${review.people.length} Users`}
              </Button>
            </>
          }
        >
          <p className="text-body text-muted-foreground">
            Nobody is added until you confirm.
          </p>
          {review.people.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-body font-medium text-foreground">
                {review.people.length === 1
                  ? "1 User to Add"
                  : `${review.people.length} Users to Add`}
              </h3>
              <ul className="flex flex-col">
                {review.people.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body text-foreground">
                        {u.name}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {u.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-caption">
                      <span className="block text-body text-foreground">
                        {u.role}
                      </span>
                      {roleActs(u.role) && (
                        <span className="tabular block text-muted-foreground">
                          {formatMoney(u.limit, "GHS", true)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {review.problems.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-body font-medium text-foreground">
                {review.problems.length === 1
                  ? "1 Row Won't Be Added"
                  : `${review.problems.length} Rows Won't Be Added`}
              </h3>
              <ul className="flex flex-col gap-1">
                {review.problems.map((p) => (
                  <li key={p.row} className="text-body text-warning-text">
                    {`Row ${p.row}: ${p.reason}`}
                  </li>
                ))}
              </ul>
              <p className="text-caption text-muted-foreground">
                Correct these rows in the file and upload it again, or add them
                one at a time.
              </p>
            </section>
          )}
        </Modal>
      )}

      {uploading && (
        <UploadListDialog
          accounts={accounts}
          onClose={() => setUploading(false)}
          onFile={(file) => {
            setUploading(false);
            void readList(file);
          }}
        />
      )}

      {open && (
        <PersonDialog
          key={open.user.id}
          initial={open.user}
          isNew={open.isNew}
          accounts={accounts}
          taken={users
            .filter((u) => u.id !== open.user.id)
            .map((u) => u.email.trim().toLowerCase())}
          onClose={() => setOpen(null)}
          onSave={(user) => {
            onUsersChange(
              open.isNew
                ? [...users, user]
                : users.map((u) => (u.id === user.id ? user : u)),
            );
            setOpen(null);
          }}
          onRemove={() => {
            const before = users;
            onUsersChange(users.filter((u) => u.id !== open.user.id));
            setOpen(null);
            toast.success(`${open.user.name} has been removed`, {
              action: { label: "Undo", onClick: () => onUsersChange(before) },
            });
          }}
        />
      )}
    </div>
  );
}

/* ── One person ─────────────────────────────────────────────────────────────── */

function PersonDialog({
  initial,
  isNew,
  accounts,
  taken,
  onClose,
  onSave,
  onRemove,
}: {
  initial: CorporateUserDraft;
  isNew: boolean;
  accounts: EnrolledAccountSummary[];
  /** Other people's emails. Email is a login, so two people can't share one. */
  taken: string[];
  onClose: () => void;
  onSave: (user: CorporateUserDraft) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [mobile, setMobile] = useState(initial.mobile);
  const [birth, setBirth] = useState(
    initial.dateOfBirth ? displayDateOfBirth(initial.dateOfBirth) : "",
  );
  const [role, setRole] = useState<CorporateAppRole | null>(initial.role);
  const [services, setServices] = useState(initial.services);
  const [accountIds, setAccountIds] = useState(initial.accountIds);
  // Empty means the bank's default, which the placeholder says.
  const [limit, setLimit] = useState(
    roleActs(initial.role) && initial.limit
      ? initial.limit.toLocaleString("en-GB")
      : "",
  );

  const dateOfBirth = parseDateOfBirth(birth);
  const birthError =
    isCompleteDateOfBirth(birth) && !dateOfBirth
      ? "Please enter a valid date, day first."
      : "";
  const mobileError =
    mobile && !isCompleteGhanaMobile(mobile)
      ? "Please enter a complete Ghana mobile number."
      : "";
  const emailError = taken.includes(email.trim().toLowerCase())
    ? "This email address is already used by another user."
    : "";
  const acts = roleActs(role);

  const problem = !name.trim()
    ? "Enter the Full Name"
    : !email.includes("@") || emailError
      ? "Enter the Email Address"
      : !isCompleteGhanaMobile(mobile)
        ? "Enter the Mobile Number"
        : !dateOfBirth
          ? "Enter the Date of Birth"
          : !role
            ? "Select a Role"
            : acts && services.length === 0
              ? "Select a Service"
              : acts && accountIds.length === 0
                ? "Select an Account"
                : "";

  function save() {
    if (problem || !role) return;
    const limitValue = Number(limit.split(".")[0].replace(/\D/g, ""));
    onSave({
      ...initial,
      name: name.trim(),
      email: email.trim(),
      mobile,
      dateOfBirth,
      role,
      isFromMandate: role === "Authoriser",
      // Viewers see every account on the request and act on none.
      services: acts ? services : [],
      accountIds: acts ? accountIds : accounts.map((a) => a.id),
      limit: acts ? limitValue || DEFAULT_USER_LIMIT : 0,
    });
  }

  const toggle = <T,>(list: T[], item: T, on: boolean) =>
    on ? [...list, item] : list.filter((x) => x !== item);

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "Add a User" : `Edit ${initial.name}`}
      bodyClassName="gap-6"
      footer={
        <>
          {!isNew && (
            <Button
              variant="ghost"
              size="md"
              onClick={onRemove}
              className="sm:mr-auto"
            >
              Remove
            </Button>
          )}
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          {/* While something is missing, the button says what. */}
          <Button size="md" disabled={Boolean(problem)} onClick={save}>
            {problem || (isNew ? "Add User" : "Save Changes")}
          </Button>
        </>
      }
    >
      <>
        <div className="flex flex-col gap-4">
          <Field label="Full Name" htmlFor="personName">
            <Input
              id="personName"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={isNew}
            />
          </Field>
          <Field label="Email Address" htmlFor="personEmail" error={emailError}>
            <Input
              id="personEmail"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={email}
              aria-invalid={Boolean(emailError)}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label="Mobile Number"
            htmlFor="personMobile"
            error={mobileError}
          >
            <PhoneInput
              id="personMobile"
              value={mobile}
              onValueChange={setMobile}
            />
          </Field>
          <Field label="Date of Birth" htmlFor="personBirth" error={birthError}>
            <DateOfBirthInput
              id="personBirth"
              value={birth}
              onValueChange={setBirth}
              aria-invalid={Boolean(birthError)}
            />
          </Field>
        </div>

        {/* A dropdown, as in Administration (designer, 2026-11-26). Each option keeps its one line, so the roles are
          explained where they're chosen. */}
        <Field label="Role" htmlFor="personRole">
          <Select
            value={role}
            onValueChange={(v) => v && setRole(v as CorporateAppRole)}
          >
            <SelectTrigger id="personRole" className="w-full">
              <SelectValue placeholder="Select a role">
                {role ?? undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REQUEST_ROLES.map((r) => (
                <SelectItem key={r.role} value={r.role}>
                  <span className="flex min-w-0 flex-col whitespace-normal">
                    <span className="text-body text-foreground">{r.role}</span>
                    <span className="text-caption text-muted-foreground">
                      {r.line}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {acts && (
          <>
            <Field label="Services">
              <div className="flex flex-col gap-1">
                {CORPORATE_SERVICES.map((s) => (
                  <label
                    key={s.id}
                    className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={services.includes(s.id)}
                      onCheckedChange={(on) =>
                        setServices(toggle(services, s.id, Boolean(on)))
                      }
                    />
                    <span className="text-body text-foreground">{s.label}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Accounts">
              <div className="flex flex-col gap-1">
                {accounts.map((a) => (
                  <label
                    key={a.id}
                    className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={accountIds.includes(a.id)}
                      onCheckedChange={(on) =>
                        setAccountIds(toggle(accountIds, a.id, Boolean(on)))
                      }
                    />
                    <span className="tabular text-body text-foreground">
                      {a.number}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Limit for One Payment (GHS)" htmlFor="personLimit">
              <Input
                id="personLimit"
                inputMode="numeric"
                className="tabular"
                placeholder={`${formatMoney(DEFAULT_USER_LIMIT, "GHS", true)} if left empty`}
                value={limit}
                // Whole cedis, shown with thousands separators as they type.
                onChange={(e) => {
                  const whole = Number(
                    e.target.value.split(".")[0].replace(/\D/g, ""),
                  );
                  setLimit(whole ? whole.toLocaleString("en-GB") : "");
                }}
              />
            </Field>
          </>
        )}
      </>
    </Modal>
  );
}

/* ── Many users from a CSV ──────────────────────────────────────────────────── */

/** Upload a List: a drop zone and the template. The file is read and reviewed before anyone is added. */
function UploadListDialog({
  accounts,
  onClose,
  onFile,
}: {
  accounts: EnrolledAccountSummary[];
  onClose: () => void;
  onFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const onList = onFile;
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Upload a List"
      bodyClassName="gap-4"
      footer={
        <Button variant="outline" size="md" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) onList(dropped);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-hover",
          dragging
            ? "border-primary bg-primary/10"
            : "border-border hover:bg-muted/50",
        )}
      >
        <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
          <FileSpreadsheet size={18} aria-hidden="true" />
        </span>
        <span className="text-body font-medium text-foreground">
          Drop your CSV file here
        </span>
        <span className="text-caption text-muted-foreground">
          or{" "}
          <span className="text-foreground underline underline-offset-4">
            choose a file
          </span>
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="Choose a list of users"
          className="sr-only"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            e.target.value = "";
            if (chosen) onList(chosen);
          }}
        />
      </label>
      <p className="text-caption">
        <button
          type="button"
          onClick={() => downloadPeopleTemplate(accounts)}
          className="cursor-pointer text-foreground underline underline-offset-4"
        >
          Download the CSV template
        </button>
      </p>
    </Modal>
  );
}
