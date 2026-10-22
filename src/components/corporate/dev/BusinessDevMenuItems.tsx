"use client";

/**
 * Dev Mode for business banking: who you are, and a jump into each role's flows. It replaces the personal demo
 * customers (Clean, Single, Everyday) whenever a business is signed in, so switching never drops you into the
 * personal app. Each user's line reads the control table (`lib/corporate/controls.ts`), so it shows the same role,
 * limit and accounts the screens enforce. A flow signs in as the role it needs first, then opens the screen.
 */

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { COMPANY_USERS, roleHasLimit } from "@/lib/corporate/controls";
import { ACTORS, formatMoney } from "@/lib/mock-data";
import { homePathForActor } from "@/lib/navigation";
import { useSession } from "@/lib/session-store";

/** The business demo users, in the order a payment travels. */
const USERS = ["u-dual", "u-reviewer", "u-approver", "u-corpadmin", "u-sole"] as const;

const FLOWS: { label: string; hint: string; actorId: string; href: string }[] = [
  { label: "Pay a supplier", hint: "Inputter · within their limit", actorId: "u-dual", href: "/business/payments/supplier" },
  { label: "A payment waiting for review", hint: "Inputter · the approval path on the receipt", actorId: "u-dual", href: "/business/transactions/txn-apr-001" },
  { label: "A payment sent back", hint: "Inputter · the comment, Edit and Resubmit", actorId: "u-dual", href: "/business/transactions/txn-ret-001" },
  { label: "Review a payment", hint: "Reviewer · pass on or send back", actorId: "u-reviewer", href: "/business/approvals/payment/apr-001" },
  { label: "Authorise a payment", hint: "Authoriser · with a one-time code", actorId: "u-approver", href: "/business/approvals/payment/apr-002" },
  { label: "Above the authoriser's limit", hint: "Authoriser · can't authorise, says why", actorId: "u-approver", href: "/business/approvals/payment/apr-005" },
  { label: "Approve a user change", hint: "Authoriser · the second person", actorId: "u-approver", href: "/business/approvals/user-change/uc-001" },
  { label: "Users and changes waiting", hint: "Admin", actorId: "u-corpadmin", href: "/business/administration" },
  { label: "Add a user", hint: "Admin · signatory or someone else", actorId: "u-corpadmin", href: "/business/administration/new" },
  { label: "Change someone's access", hint: "Admin · narrowing applies now, widening waits", actorId: "u-corpadmin", href: "/business/administration/cu-ransford" },
];

function userLine(actorId: string): { title: string; subtitle: string } {
  const actor = ACTORS.find((a) => a.id === actorId);
  const user = COMPANY_USERS.find((u) => u.actorId === actorId);
  if (!actor) return { title: actorId, subtitle: "" };
  if (!user) return { title: `${actor.name} · Sole Proprietor`, subtitle: "Pays directly after the code, no approvals" };
  const limit = roleHasLimit(user.role) ? `up to ${formatMoney(user.limit, "GHS", true)}` : "no payment limit";
  const accounts = user.accountIds.length === 1 ? "1 account" : `${user.accountIds.length} accounts`;
  return { title: `${actor.name} · ${user.role}`, subtitle: `${limit} · ${accounts}` };
}

export function BusinessDevMenuItems() {
  const router = useRouter();
  const current = useSession((s) => s.actor?.id);

  function signInAs(actorId: string, href?: string) {
    const actor = ACTORS.find((a) => a.id === actorId);
    if (!actor) return;
    const session = useSession.getState();
    session.signIn(actor);
    if (actor.profiles.length > 0) session.selectProfile(actor.profiles[0]);
    session.verifyMfa();
    router.push(href ?? homePathForActor(actor));
  }

  return (
    <>
      <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Business user</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {USERS.map((id) => {
        const { title, subtitle } = userLine(id);
        const selected = current === id;
        return (
          <DropdownMenuItem
            key={id}
            onClick={() => signInAs(id)}
            className="flex cursor-pointer items-start justify-between gap-2 rounded-lg px-2 py-2 text-[13px]"
          >
            <span className="flex min-w-0 flex-col">
              <span className={selected ? "text-foreground font-medium" : "text-foreground"}>{title}</span>
              <span className="tabular mt-0.5 text-[11px] text-muted-foreground">{subtitle}</span>
            </span>
            {selected && <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />}
          </DropdownMenuItem>
        );
      })}

      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Role flows</DropdownMenuLabel>
      {FLOWS.map((f) => (
        <DropdownMenuItem
          key={f.label}
          onClick={() => signInAs(f.actorId, f.href)}
          className="flex cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-[13px]"
        >
          <span className="text-foreground">{f.label}</span>
          <span className="text-[11px] text-muted-foreground">{f.hint}</span>
        </DropdownMenuItem>
      ))}
    </>
  );
}

/** The Dev Mode badge for a business user: their role, so the header says who you are testing as. */
export function businessDevBadge(actorId: string | undefined): string {
  if (!actorId) return "Business";
  const user = COMPANY_USERS.find((u) => u.actorId === actorId);
  return user?.role ?? (actorId === "u-sole" ? "Sole Proprietor" : "Business");
}
