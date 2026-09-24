"use client";

/**
 * The signed-in customer's accounts and which one is the default — one source
 * for the Accounts list and Account Details, so "Default" never disagrees
 * between the two. Retail follows the Dev Mode customer configuration;
 * business profiles list their accounts as-is.
 *
 * Wallet customers: once they add a GCB account the wallet balance moves
 * there and the wallet leaves the list (it's hidden plumbing from then on), so
 * they're treated as a GCB customer.
 */

import { useMemo } from "react";
import { accountsForProfile, findAccount, type Account } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { resolveDefaultAccountId, useAccountPrefs } from "@/lib/accounts-store";
import { findScenario, useAccountsScenario } from "@/lib/accounts-scenarios";
import { sumMoney } from "@/lib/money";

export function useCustomerAccounts() {
  const activeProfile = useSession((s) => s.activeProfile);
  const isRetail = activeProfile?.kind !== "CORPORATE";
  const scenario = findScenario(useAccountsScenario((s) => s.scenarioId));
  const storedDefaultId = useAccountPrefs((s) => s.defaultAccountId);
  const addedAccountIds = useAccountPrefs((s) => s.addedAccountIds);
  const storedMigration = useAccountPrefs((s) => s.walletMigration);

  const walletMigration = isRetail && scenario.customer === "wallet" ? storedMigration : null;

  const accounts = useMemo<Account[]>(() => {
    if (!isRetail) return accountsForProfile("CORPORATE");
    const base = walletMigration ? [] : scenario.accountIds;
    const ids = [...new Set([...base, ...addedAccountIds])];
    return ids
      .map((id) => findAccount(id))
      .filter((a): a is Account => Boolean(a))
      .map((a) =>
        walletMigration && a.id === walletMigration.toAccountId
          ? {
              ...a,
              balance: sumMoney([a.balance, walletMigration.amount]),
              available: sumMoney([a.available, walletMigration.amount]),
            }
          : a,
      );
  }, [isRetail, scenario, addedAccountIds, walletMigration]);

  const defaultId = resolveDefaultAccountId(accounts, storedDefaultId);

  return {
    accounts,
    defaultId,
    defaultAccount: accounts.find((a) => a.id === defaultId) ?? null,
    isRetail,
    isWalletCustomer: isRetail && scenario.customer === "wallet" && !walletMigration,
    /** Accounts under the customer's Ghana Card — what "Add Account" can offer. */
    ghanaCardAccountIds: scenario.ghanaCardAccountIds,
    walletMigration,
    scenario,
  };
}
