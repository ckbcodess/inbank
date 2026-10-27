import { redirect } from "next/navigation";

/** Treasury Bills & Bonds became two products, Treasury Bills and Bonds; this keeps an old link working. */
export default function TreasuryRedirect() {
  redirect("/invest/products/treasury-bills");
}
