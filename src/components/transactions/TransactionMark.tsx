import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Globe,
  Landmark,
  Layers,
  PiggyBank,
  QrCode,
  Signal,
  Smartphone,
  Wallet,
  Wifi,
  FileText,
} from "lucide-react";
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { brandLogo } from "@/lib/brands";
import type { Transaction } from "@/lib/mock-data";

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

/** What kind of payment it was, as a picture: the same kinds the Send & Pay hub offers. */
function iconFor(t: Pick<Transaction, "paymentMethod">): IconType {
  switch (t.paymentMethod) {
    case "momo":
      return Smartphone;
    case "wallet-to-bank":
      return Wallet;
    case "airtime":
      return Signal;
    case "data":
      return Wifi;
    case "bill":
      return CediReceiptIcon as IconType;
    case "card":
      return CreditCard;
    case "qr":
      return QrCode;
    case "papss":
      return Globe;
    case "own-account":
      return ArrowLeftRight;
    case "cardless":
      return Banknote;
    case "bulk":
      return Layers;
    case "trade":
      return FileText;
    case "term-deposit":
      return PiggyBank;
    default:
      // GIP, ACH, RTGS and any plain bank transfer
      return Landmark;
  }
}

/**
 * The leading mark of a transaction row: one quiet circle, a hairline outline with a grey line icon for the kind of
 * payment (what it was). A company we have a logo for shows its logo instead, because that is recognition rather than
 * decoration. Which way the money went is the sign on the amount, so the mark carries no colour and no direction badge.
 */
export function TransactionMark({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "paymentMethod" | "direction"> & Partial<Pick<Transaction, "counterparty">>;
  className?: string;
}) {
  const Icon = iconFor(transaction);
  // A company we have a logo for is shown by its logo filling the circle; between my own accounts it is GCB. Everything else is the kind icon.
  const logo = transaction.paymentMethod === "own-account" ? brandLogo("GCB") : brandLogo(transaction.counterparty);
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        logo ? (!logo.round || logo.disc) && "bg-[var(--logo-disc)]" : "border border-border bg-card text-muted-foreground",
        className,
      )}
    >
      {logo ? (
        <Image
          src={logo.src}
          alt=""
          width={40}
          height={40}
          className={logo.round ? "size-full rounded-full object-cover" : "size-5 object-contain"}
        />
      ) : <Icon size={17} strokeWidth={1.6} />}
    </div>
  );
}
