import { redirect } from "next/navigation";

/** The market is a view of the Invest page now. */
export default function MarketIndexPage() {
  redirect("/invest?view=products");
}
