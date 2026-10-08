import { redirect } from "next/navigation";

/** Treasury bills and bonds no longer have a home of their own: everything is on the Invest page. */
export default function TreasuryIndexPage() {
  redirect("/invest");
}
