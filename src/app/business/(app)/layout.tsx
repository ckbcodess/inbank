import CustomerShell from "@/components/layout/CustomerShell";

/**
 * Business banking: its own route group under `/business`, apart from personal banking's `(customer)`.
 * It renders the same chrome (`CustomerShell` picks the business navigation from the active relationship),
 * and the two surfaces import nothing from each other (see the shell firewall in eslint.config.mjs).
 */
export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
