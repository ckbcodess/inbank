"use client";

/**
 * What a person can do for a company: role, limit for one payment, and the accounts they can see. Shared by Add User
 * and Change Access in Administration and by the company's application (/business/signup/enrol), so all show the same
 * rules in the same place: roles a person can't hold aren't offered (reviewers and authorisers must be on the
 * mandate) and only the accounts enabled for the company are listed.
 *
 * Administration passes nothing and gets the bank's ceilings (`BANK_SETUP`). The application has no ceilings yet, so
 * it passes its own roles, accounts and placeholder, and adds what else the form asks through `children`.
 */

import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BANK_SETUP, roleHasLimit, roleNeedsMandate, type CompanyRole } from "@/lib/corporate/controls";
import { findAccount, formatMoney } from "@/lib/mock-data";

const ROLES: readonly CompanyRole[] = ["Inputter", "Reviewer", "Authoriser", "Viewer", "Administrator"];

export interface AccessDraft {
  /** Null only in the company's application, before a role is chosen. */
  role: CompanyRole | null;
  limit: number;
  accountIds: string[];
  onMandate: boolean;
}

export interface AccessAccount {
  id: string;
  name: string;
  number: string;
}

function bankEnabledAccounts(): AccessAccount[] {
  return BANK_SETUP.enabledAccountIds.flatMap((id) => findAccount(id) ?? []);
}

export default function UserAccessFields<T extends AccessDraft>({
  draft,
  onChange,
  limitError,
  accountsError,
  roles = ROLES,
  accounts = bankEnabledAccounts(),
  limitPlaceholder = `Up to ${formatMoney(BANK_SETUP.maxUserLimit, "GHS", true)}`,
  children,
}: {
  draft: T;
  onChange: (next: T) => void;
  /** Shown under the limit field (the ceiling, or a missing limit). */
  limitError?: string;
  /** Shown under the accounts (none chosen). */
  accountsError?: string;
  roles?: readonly CompanyRole[];
  accounts?: readonly AccessAccount[];
  limitPlaceholder?: string;
  /** Extra fields between the limit and the accounts. */
  children?: ReactNode;
}) {
  const allowed = roles.filter((r) => draft.onMandate || !roleNeedsMandate(r));

  return (
    <div className="flex flex-col gap-5">
      <Field label="Role" htmlFor="user-role">
        <Select value={draft.role} onValueChange={(v) => v && onChange({ ...draft, role: v as CompanyRole })}>
          <SelectTrigger id="user-role" className="w-full">
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {draft.role && roleHasLimit(draft.role) && (
        <Field label="Payment Limit (GHS)" htmlFor="user-limit" error={limitError}>
          <Input
            id="user-limit"
            inputMode="numeric"
            className="tabular"
            placeholder={limitPlaceholder}
            value={draft.limit ? draft.limit.toLocaleString("en-GB") : ""}
            aria-invalid={Boolean(limitError)}
            // Whole cedis: anything after a decimal point is dropped, so a pasted "10,000.00" stays ten thousand.
            onChange={(e) => onChange({ ...draft, limit: Number(e.target.value.split(".")[0].replace(/\D/g, "")) })}
          />
        </Field>
      )}

      {children}

      <Field label="Accounts" error={accountsError}>
        <div className="flex flex-col gap-1">
          {accounts.map((account) => {
            const checked = draft.accountIds.includes(account.id);
            return (
              <label
                key={account.id}
                className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      onChange({
                        ...draft,
                        accountIds: next
                          ? [...draft.accountIds, account.id]
                          : draft.accountIds.filter((a) => a !== account.id),
                      })
                    }
                  />
                  <span className="truncate text-body text-foreground">{account.name}</span>
                </span>
                <span className="tabular shrink-0 text-body text-muted-foreground">
                  •••• {account.number.replace(/\s/g, "").slice(-4)}
                </span>
              </label>
            );
          })}
        </div>
      </Field>
    </div>
  );
}
