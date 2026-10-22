/**
 * The company's accounts, for the business screens. One place for "which accounts are the business's", so a
 * screen never asks the personal side (`use-customer-accounts` carries wallets, linked sources and Dev Mode
 * customer configurations that a company has none of).
 */

import { accountsForProfile, type Account, type Transaction, transactionsForProfile } from "../mock-data";
import { useSession } from "../session-store";
import { canSeeAccount } from "./controls";
import { CORPORATE_PROFILE } from "./ledger";

function activeProfileName(): string {
  const session = useSession.getState();
  return session.activeProfile?.name ?? session.actor?.profiles[0]?.name ?? CORPORATE_PROFILE.name;
}

/**
 * The company's accounts that the signed-in person may see (UAR-05). Every business screen reads accounts, and
 * so balances, totals and transactions, through here, so a person never sees an account they weren't given.
 */
export function businessAccounts(): Account[] {
  const company = activeProfileName();
  const actor = useSession.getState().actor;
  return accountsForProfile("CORPORATE").filter(
    (a) => (a.companyName ?? CORPORATE_PROFILE.name) === company && canSeeAccount(actor, a.id),
  );
}

/** An account by id, only if it is the company's (a personal account id resolves to nothing here). */
export function findBusinessAccount(id: string): Account | undefined {
  return businessAccounts().find((a) => a.id === id);
}

/** Transactions for the signed-in business's accounts. */
export function businessTransactions(): Transaction[] {
  const accountIds = new Set(businessAccounts().map((a) => a.id));
  return transactionsForProfile("CORPORATE").filter((t) => t.accountId && accountIds.has(t.accountId));
}

/** What a mandate means, in place, wherever it is named. */
export function explainMandate(mandate: string | undefined): string {
  switch (mandate) {
    case "Sole signatory":
      return "You are the only person who can authorise payments from this account.";
    case "Either to sign":
      return "Any one of the signatories can authorise a payment.";
    case "Both to sign":
      return "Both signatories must authorise a payment.";
    case "Any two to sign":
      return "Any two of the signatories must authorise a payment.";
    default:
      return mandate ? "How many signatories must authorise a payment." : "";
  }
}
