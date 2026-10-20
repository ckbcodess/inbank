import type { Account } from "@/lib/mock-data";
import { isBusinessProfile } from "@/lib/profile";
import type { Actor, Profile } from "@/lib/roles";

/**
 * The name an account is held in — what goes on shared account details and a
 * printed cheque. A retail profile's name is the relationship ("Personal
 * Banking"), not a person, so retail accounts use the signed-in customer's
 * name; business accounts use the business; joint accounts list every holder.
 */
export function accountHolderName(
  account: Account,
  profile: Profile | null | undefined,
  actor: Actor | null | undefined,
): string {
  if (account.isJoint && account.jointHolders?.length) return account.jointHolders.join(" & ");
  if (isBusinessProfile(profile)) return profile!.name;
  return actor?.name || profile?.name || "Account holder";
}
