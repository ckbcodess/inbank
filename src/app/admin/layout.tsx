import AdminShell from "@/components/layout/AdminShell";

/**
 * Admin Portal route group — section 12.5. Internal staff only.
 * Shares no layout, nav or chrome with the customer shell (12.1).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
