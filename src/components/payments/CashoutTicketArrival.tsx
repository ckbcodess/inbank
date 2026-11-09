"use client";

/** The cash-out ticket arriving: it hangs from its top edge and drops into place (see `HangingArrival`). */

import { CashoutTicket } from "./CashoutTicket";
import { HangingArrival } from "@/components/ui/hanging-arrival";

export function CashoutTicketArrival(props: { code: string; amount: string; recipientPhone: string; expires?: string }) {
  return (
    <HangingArrival className="h-[396px] w-[278px] max-w-full">
      <CashoutTicket {...props} />
    </HangingArrival>
  );
}
