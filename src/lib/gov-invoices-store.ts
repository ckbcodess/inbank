"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** An invoice the customer raised here and has not paid yet. It is offered again under Make Payment for that service. */
export interface GovInvoice {
  number: string;
  agency: string;
  serviceId: string;
  serviceName: string;
  payer: string;
  amount: number;
  createdAt: string;
}

interface GovInvoicesState {
  invoices: GovInvoice[];
  add: (invoice: GovInvoice) => void;
  /** Called once the invoice is paid, so it is never offered twice. */
  remove: (number: string) => void;
}

export const useGovInvoices = create<GovInvoicesState>()(
  persist(
    (set) => ({
      invoices: [],
      add: (invoice) => set((s) => ({ invoices: [invoice, ...s.invoices] })),
      remove: (number) => set((s) => ({ invoices: s.invoices.filter((i) => i.number !== number) })),
    }),
    { name: "nibs-gov-invoices" },
  ),
);
