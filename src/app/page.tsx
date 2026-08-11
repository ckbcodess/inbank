import { redirect } from "next/navigation";

export default function RootPage() {
  // Single front door — section 12.1. Routing to a shell happens after MFA.
  redirect("/login");
}
