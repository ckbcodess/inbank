"use client";

import { useMemo } from "react";
import type { BeneficiaryRecord } from "@/lib/beneficiaries-store";
import { findPlan } from "@/lib/insurance-plans";
import { useMyInsurance } from "@/lib/insurance";

/**
 * The people the customer has named on their policies (beneficiaries and trustees), as rows for the Beneficiaries hub.
 * They are kept by the insurance store, where they are named and their shares are set, so this only reads them: one
 * source, no copy to fall out of step. Whoever is on a policy shows once, with every policy they are named on.
 */
export function usePolicyBeneficiaries(): BeneficiaryRecord[] {
  const { policies, people } = useMyInsurance();
  return useMemo(() => {
    const rows: BeneficiaryRecord[] = [];
    for (const person of people) {
      const named = policies.filter((p) => p.beneficiaries.some((b) => b.personId === person.id) || p.trusteeId === person.id);
      if (named.length === 0) continue;
      const trustee = named.some((p) => p.trusteeId === person.id);
      const planNames = named.map((p) => findPlan(p.planId)?.name ?? "Policy").join(", ");
      rows.push({
        id: `policy-person-${person.id}`,
        name: person.fullName,
        transactionType: "insurance",
        category: "person",
        phoneNumber: person.phone,
        billerName: planNames,
        // Where "Update" takes the customer: the first policy they are named on
        billerReference: named[0].id,
        detail: `${trustee ? `${person.relationship} · Trustee` : person.relationship} · ${planNames}`,
        verified: true,
        createdAt: named[0].createdOn,
      });
    }
    return rows;
  }, [policies, people]);
}
