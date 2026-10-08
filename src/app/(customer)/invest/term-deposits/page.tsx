import { redirect } from "next/navigation";

/** Term deposits no longer have a home of their own: everything is on the Invest page. */
export default function TermDepositsIndexPage() {
  redirect("/invest");
}
