"use client";

/**
 * The three things an administrator sets for a user: role, limit for one payment, and the accounts they can see.
 * Shared by Add User and Change Access, so both show the same rules in the same place: roles a person can't hold
 * aren't offered (reviewers and authorisers must be on the mandate), the limit field names the bank's ceiling, and
 * only the accounts the bank enabled are listed.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BANK_SETUP,
  roleHasLimit,
  roleNeedsMandate,
  type CompanyRole,
  type UserDraft,
} from "@/lib/corporate/controls";
import { findAccount, formatMoney } from "@/lib/mock-data";

const ROLES: CompanyRole[] = ["Inputter", "Reviewer", "Authoriser", "Viewer", "Administrator"];

export default function UserAccessFields({
  draft,
  onChange,
  limitError,
  accountsError,
}: {
  draft: UserDraft;
  onChange: (next: UserDraft) => void;
  /** Shown under the limit field (the ceiling, or a missing limit). */
  limitError?: string;
  /** Shown under the accounts (none chosen). */
  accountsError?: string;
}) {
  const roles = ROLES.filter((r) => draft.onMandate || !roleNeedsMandate(r));

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Role"
        htmlFor="user-role"
      >
        <Select value={draft.role} onValueChange={(v) => v && onChange({ ...draft, role: v as CompanyRole })}>
          <SelectTrigger id="user-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {roleHasLimit(draft.role) && (
        <Field
          label="Limit for One Payment"
          htmlFor="user-limit"
          error={limitError}
        >
          <Input
            id="user-limit"
            inputMode="decimal"
            className="tabular"
            placeholder={`Up to ${formatMoney(BANK_SETUP.maxUserLimit, "GHS", true)}`}
            value={draft.limit ? String(draft.limit) : ""}
            aria-invalid={Boolean(limitError)}
            onChange={(e) => onChange({ ...draft, limit: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })}
          />
        </Field>
      )}

      <Field label="Accounts" error={accountsError}>
        <div className="flex flex-col gap-1">
          {BANK_SETUP.enabledAccountIds.map((id) => {
            const account = findAccount(id);
            if (!account) return null;
            const checked = draft.accountIds.includes(id);
            return (
              <label
                key={id}
                className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      onChange({
                        ...draft,
                        accountIds: next ? [...draft.accountIds, id] : draft.accountIds.filter((a) => a !== id),
                      })
                    }
                  />
                  <span className="truncate text-[14px] text-foreground">{account.name}</span>
                </span>
                <span className="tabular shrink-0 text-[13px] text-muted-foreground">
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
