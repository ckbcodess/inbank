/**
 * The "who and where" rows of a receipt, tailored to what kind of transaction it was.
 *
 * Each kind of payment needs different details: a bank transfer has a recipient, an account number and how it
 * was sent (and the bank, when we hold it); a mobile money transfer has a provider and a mobile number; airtime has a provider and the number
 * topped up; a bill has a biller and a reference. A receipt shows only what its kind requires, never a fixed
 * "Bank Name / Account Number" pair. A detail we don't hold is left out, not invented.
 */

import { detectTelcoNetwork } from "@/components/payments/flows/shared";
import { findAccount, type Transaction } from "@/lib/mock-data";

export interface ReceiptField {
  label: string;
  value: string;
}

const COUNTRY_BY_CODE: Record<string, string> = {
  NG: "Nigeria",
  KE: "Kenya",
  CI: "Côte d'Ivoire",
  ZA: "South Africa",
  EG: "Egypt",
  RW: "Rwanda",
  ZM: "Zambia",
  CN: "China",
};

const TRANSFER_RAIL: Record<string, string> = {
  gip: "GhIPSS Instant Pay",
  ach: "ACH Direct Credit",
  rtgs: "RTGS",
};

/** True when the text is something worth showing (the seed data has a few blank or garbled values). */
function usable(v: string | undefined): v is string {
  return Boolean(v && v.trim() && /[\p{L}\p{N}]/u.test(v) && !v.includes("�"));
}

const digits = (v: string) => v.replace(/\D/g, "");

/** A Ghana mobile number as typed or stored, or null when it isn't one. */
function mobileOf(account: string): string | null {
  const d = digits(account);
  return /^0\d{9}$/.test(d) ? d : null;
}

const formatMobile = (d: string) => `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;

export function receiptFields(t: Transaction): ReceiptField[] {
  const incoming = t.direction === "credit";
  const who = incoming ? "Sender" : "Recipient";
  const name = usable(t.counterparty) ? t.counterparty : "";
  const acct = usable(t.counterpartyAccount) ? t.counterpartyAccount : "";
  const mobile = mobileOf(acct);
  const fields: ReceiptField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value && value.trim()) fields.push({ label, value });
  };

  switch (t.paymentMethod) {
    case "momo":
    case "wallet-to-bank": {
      add(who, name);
      add("Provider", (mobile && detectTelcoNetwork(mobile)?.walletName) || "Mobile Money");
      add("Mobile Number", mobile ? formatMobile(mobile) : acct);
      break;
    }
    case "airtime":
    case "data": {
      const provider = mobile ? detectTelcoNetwork(mobile)?.telcoName : undefined;
      add("Provider", provider ?? name);
      add("Mobile Number", mobile ? formatMobile(mobile) : acct);
      break;
    }
    case "bill": {
      add("Biller", name);
      add("Reference", acct);
      break;
    }
    case "qr": {
      add("Merchant", name);
      add("Merchant ID", acct);
      add("Payment Method", "Scan & Pay (GhQR)");
      break;
    }
    case "cardless": {
      add("ATM", name);
      add("Reference", acct);
      add("Payment Method", "ATM cash-out code");
      break;
    }
    case "card": {
      add("Merchant", name);
      add("Merchant ID", acct);
      add("Payment Method", "Card");
      break;
    }
    case "papss": {
      add(who, name);
      add("Bank Name", t.counterpartyBank);
      add("Account Number", acct);
      add("Payment Method", "PAPSS");
      const code = acct.match(/^([A-Z]{2})-/)?.[1];
      add("Country", code ? COUNTRY_BY_CODE[code] : undefined);
      break;
    }
    case "own-account": {
      const other = findAccount(t.counterpartyAccount);
      add(incoming ? "From Account" : "To Account", other ? other.name : name);
      add("Account Number", other ? other.number : acct);
      break;
    }
    case "trade": {
      add("Beneficiary", name);
      add("Reference", acct);
      break;
    }
    case "bulk": {
      add("Batch", name);
      add("Account Number", acct);
      break;
    }
    case "term-deposit": {
      add("Deposit", name);
      break;
    }
    case "loan": {
      add("Loan", name);
      add("Reference", acct);
      break;
    }
    default: {
      // A bank transfer (GIP, ACH, RTGS) or anything without a more specific kind
      add(who, name);
      add("Bank Name", t.counterpartyBank);
      add("Account Number", acct);
      add("Payment Method", t.paymentMethod ? TRANSFER_RAIL[t.paymentMethod] : undefined);
    }
  }
  return fields;
}
