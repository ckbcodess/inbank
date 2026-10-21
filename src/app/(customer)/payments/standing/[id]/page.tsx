import { redirect } from "next/navigation";

/** A scheduled payment opens as a sheet over the list now; this keeps an old link to its page working. */
export default function ScheduledPaymentRedirect() {
  redirect("/payments/standing");
}
