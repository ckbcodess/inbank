import CustomerShell from "@/components/layout/CustomerShell";

/**
 * Every customer/corporate surface renders inside this shell. The Admin Portal
 * lives in its own route group with its own shell — the two never nest
 * (section 12.1).
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
