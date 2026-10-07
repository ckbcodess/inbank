import type { Transaction } from "@/lib/mock-data";

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
    case "card":
      return "Card Payment";
    case "bill":
      return "GCB Pay";
    case "bulk":
      return "Bulk Payment";
    case "trade":
      return "Trade Payment";
    default:
      return incoming ? "Received" : "Bank Transfer";
  }
}
