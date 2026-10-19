import type { Transaction } from "@/lib/mock-data";

/** The rail a transaction was paid on, for filtering: the same groupings the Send & Pay hub uses. */
export function transactionRail(t: Transaction): string {
  switch (t.paymentMethod) {
    case "own-account":
    case "term-deposit":
      return "own-account";
    case "papss":
      return "outside-ghana";
    case "momo":
    case "wallet-to-bank":
      return "wallet";
    case "airtime":
    case "data":
      return "airtime-data";
    case "bill":
    case "qr":
    case "card":
    case "cardless":
    case "bulk":
    case "trade":
      return t.paymentMethod;
    default:
      // GIP, ACH, RTGS and any other bank transfer
      return "other-banks";
  }
}

/** What kind of transaction it was, in the customer's words: "To Bank", "To Wallet", "Airtime"... */
export function getTransactionType(t: Transaction): string {
  const incoming = t.direction === "credit";
  switch (t.paymentMethod) {
    case "gip":
    case "ach":
    case "rtgs":
      return incoming ? "From Bank" : "To Bank";
    case "momo":
      return incoming ? "From Wallet" : "To Wallet";
    case "wallet-to-bank":
      return "Wallet to Bank";
    case "papss":
      return "PAPSS Payment";
    case "airtime":
      return "Airtime";
    case "data":
      return "Internet";
    case "own-account":
      return "Between My Accounts";
    case "term-deposit":
      return "Term Deposit";
    case "card":
      return "Card Payment";
    case "bill":
      return "GCB Pay";
    case "qr":
      return "Scan & Pay";
    case "cardless":
      return "ATM Cash-out Code";
    case "bulk":
      return "Bulk Payment";
    case "trade":
      return "Trade Payment";
    default:
      return incoming ? "Received" : "Bank Transfer";
  }
}
