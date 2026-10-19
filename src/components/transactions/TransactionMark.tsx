import {
  ArrowDownLeft,
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
 * Each kind of payment has its own tint (`--tx-<colour>`), with the icon in a deeper shade of the same hue
 * (`--tx-<colour>-ink`), so a list can be read by colour as well as by shape. Colour is never the only signal: the icon and the "kind · date" line say the same thing.
 */
function tintFor(t: Pick<Transaction, "paymentMethod">): "yellow" | "teal" | "sand" | "lilac" | "green" | "pink" | "lemon" | "blue" {
  switch (t.paymentMethod) {
    case "momo":
    case "wallet-to-bank":
      return "yellow";
    case "airtime":
    case "data":
      return "teal";
    case "bill":
      return "sand";
    case "card":
      return "lilac";
    case "qr":
      return "green";
    case "papss":
      return "pink";
    case "own-account":
    case "cardless":
    case "term-deposit":
      return "lemon";
    default:
      // Bank transfers (GIP, ACH, RTGS), bulk and trade
      return "blue";
  }
}

/**
 * The leading mark of a transaction row: a duotone tile showing the kind of payment. Money that came in gets a small
 * green arrow badge on its corner; money out has none (the minus sign on the amount already says it).
 */
export function TransactionMark({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "paymentMethod" | "direction"> & Partial<Pick<Transaction, "counterparty">>;
  className?: string;
}) {
  const Icon = iconFor(transaction);
  const tint = tintFor(transaction);
  const incoming = transaction.direction === "credit";
  // A company we have a logo for is shown by its logo filling the circle; between my own accounts it is GCB. Everything else is the kind icon.
  const logo = transaction.paymentMethod === "own-account" ? brandLogo("GCB") : brandLogo(transaction.counterparty);
  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full",
        logo && (!logo.round || logo.disc) && "bg-[var(--logo-disc)]",
        className,
      )}
      style={logo ? undefined : { backgroundColor: `var(--tx-${tint})`, color: `var(--tx-${tint}-ink)` }}
    >
      {logo ? (
        <Image
          src={logo.src}
          alt=""
          width={40}
          height={40}
          className={logo.round ? "size-full rounded-full object-cover" : "size-6 object-contain"}
        />
      ) : <Icon size={18} strokeWidth={1.7} />}
      {/* Only money in is marked: most rows are money out, so the exception is what gets the badge */}
      {incoming && (
        // The pill colour is see-through by design, so an opaque card-coloured disc sits under it: the logo or tint behind never shows through
        <span
          className="absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-card ring-2 ring-card"
          aria-label="Money in"
        >
          <span className="flex size-full items-center justify-center rounded-full bg-pill-success text-pill-success-text">
            <ArrowDownLeft size={11} strokeWidth={2} aria-hidden="true" />
          </span>
        </span>
      )}
    </div>
  );
}
