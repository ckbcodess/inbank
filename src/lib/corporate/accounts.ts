/**
 * The company's accounts, for the business screens. One place for "which accounts are the business's", so a
 * screen never asks the personal side (`use-customer-accounts` carries wallets, linked sources and Dev Mode
 * customer configurations that a company has none of).
 */

import { accountsForProfile, findAccount, type Account } from "../mock-data";
import { rowKind } from "../profile";

/** Every account the company can see and pay from. */
export function businessAccounts(): Account[] {
  return accountsForProfile("CORPORATE");
}

/** An account by id, only if it is the company's (a personal account id resolves to nothing here). */
export function findBusinessAccount(id: string): Account | undefined {
  const account = findAccount(id);
  return account && rowKind(account) === "CORPORATE" ? account : undefined;
}

/** What a mandate means, in place, wherever it is named. */
export function explainMandate(mandate: string | undefined): string {
  switch (mandate) {
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
