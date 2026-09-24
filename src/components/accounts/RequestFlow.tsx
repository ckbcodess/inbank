"use client";

/**
 * Place a request — Account Details → /accounts/[id]/requests.
 *
 * Same shape as Send & Pay: a "what do you need?" chooser, then one form that
 * reveals its next question only once the last one is answered. Every control
 * is the Send & Pay one: PageHeader back arrow, ActionTile, the payment-method
 * select, ProceedButton, the review cards and PaymentSuccessScreen.
 *
 *  - Statement: free, emailed to an address the customer enters (prefilled
 *    with their registered email). No fee, so no review or PIN — it's sent.
 *  - Cheque book: booklet size, how many booklets, and the same mode of
 *    delivery as Request a Card (branch pickup or doorstep) → review → PIN.
 *  - Letter: purpose, addressee, email or branch → review → PIN.
 *
 * The account is never re-selected — it was chosen by opening its details.
 * Anything the bank already knows (holder name, email) is filled in, not asked.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useContextualBack } from "@/lib/contextual-back";
import { BookOpen, FileText, Mail, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTile } from "@/components/ui/action-tile";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import PageHeader from "@/components/layout/PageHeader";
import { GCB_BRANCHES, formatMoney, type Account, type GcbBranch } from "@/lib/mock-data";
import { multiplyMoney } from "@/lib/money";
import {
  DeliveryModeFields,
  deliveryComplete,
  deliverySummary,
  type DeliveryDetails,
} from "@/components/ui/delivery-mode-fields";
import { accountHolderName } from "@/lib/account-holder";
import { BranchCombobox } from "@/components/ui/branch-combobox";
import { useSession } from "@/lib/session-store";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { ProceedButton } from "@/components/payments/flows/shared";

export type RequestKind = "statement" | "cheque-book" | "letter";

const PERIODS = [
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "custom", label: "Choose dates" },
] as const;

const LEAVES = [
  { id: "25", label: "25 leaves", fee: 35 },
  { id: "50", label: "50 leaves", fee: 60 },
  { id: "100", label: "100 leaves", fee: 110 },
] as const;

const LETTER_PURPOSES = [
  { id: "confirmation", label: "Account confirmation", hint: "Confirms the account is yours and active" },
  { id: "funds", label: "Proof of funds", hint: "Includes your available balance" },
  { id: "visa", label: "Visa or embassy", hint: "Includes your balance and account history" },
  { id: "other", label: "Something else", hint: "A general letter, to whom it may concern" },
] as const;

type Delivery = "email" | "branch";

/** Letter fees and turnaround. Placeholder values — confirm with product. */
const LETTER_DELIVERY: Record<Delivery, { fee: number; ready: string }> = {
  email: { fee: 50, ready: "Within 1 working day" },
  branch: { fee: 75, ready: "In 2 working days" },
};
const CHEQUE_READY: Record<"BRANCH_PICKUP" | "DELIVERY", string> = {
  BRANCH_PICKUP: "In 3 working days",
  DELIVERY: "In 3–5 working days",
};
const MAX_BOOKLETS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KIND_META: Record<RequestKind, { title: string; icon: typeof FileText }> = {
  statement: { title: "Bank Statement", icon: FileText },
  "cheque-book": { title: "Cheque Book", icon: BookOpen },
  letter: { title: "Bank Letter", icon: Mail },
};

function isKind(v: string | null): v is RequestKind {
  return v === "statement" || v === "cheque-book" || v === "letter";
}

function maskEmail(email: string) {
  return email.replace(/(.{2}).*(@.*)/, "$1•••$2");
}

export default function RequestFlow({ account }: { account: Account }) {
  const searchParams = useSearchParams();
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);

  const chequesAllowed = account.type === "Current";
  const initialKind = searchParams.get("type");
  const [kind, setKind] = useState<RequestKind | null>(
    isKind(initialKind) && (initialKind !== "cheque-book" || chequesAllowed) ? initialKind : null,
  );
  const [phase, setPhase] = useState<"details" | "review" | "done">("details");

  // Statement
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statementEmail, setStatementEmail] = useState(actor?.email ?? "");
  // Cheque book
  const [leaves, setLeaves] = useState<(typeof LEAVES)[number]["id"] | null>(null);
  const [booklets, setBooklets] = useState(1);
  const holderName = accountHolderName(account, activeProfile, actor);
  const blankDelivery: DeliveryDetails = {
    method: null,
    branch: null,
    recipientName: holderName,
    address: "",
    city: "",
    phone: "",
  };
  const [chequeDelivery, setChequeDelivery] = useState<DeliveryDetails>(blankDelivery);
  // Letter
  const [purpose, setPurpose] = useState<(typeof LETTER_PURPOSES)[number]["id"] | null>(null);
  const [addressee, setAddressee] = useState("");
  // Shared
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [branch, setBranch] = useState<GcbBranch | null>(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [reference, setReference] = useState("");

  const email = actor?.email ? maskEmail(actor.email) : "your registered email";
  const holder = holderName.toUpperCase();
  const last4 = account.number.replace(/\s+/g, "").slice(-4);
  const today = new Date().toISOString().slice(0, 10);

  function reset(next: RequestKind | null) {
    setKind(next);
    setPhase("details");
    setPeriod(null);
    setFrom("");
    setTo("");
    setStatementEmail(actor?.email ?? "");
    setLeaves(null);
    setBooklets(1);
    setChequeDelivery(blankDelivery);
    setPurpose(null);
    setAddressee("");
    setDelivery(null);
    setBranch(null);
  }

  // ── What the request resolves to — drives review, fee and receipt ──
  const periodDone = period !== null && (period !== "custom" || (Boolean(from) && Boolean(to) && from <= to));
  const emailValid = EMAIL_RE.test(statementEmail.trim());
  const complete =
    kind === "statement"
      ? periodDone && emailValid
      : kind === "cheque-book"
        ? leaves !== null && deliveryComplete(chequeDelivery)
        : kind === "letter"
          ? purpose !== null && delivery !== null && (delivery !== "branch" || branch !== null)
          : false;

  const summary = useMemo(() => {
    if (!kind) return null;
    const rows: [string, string][] = [["Account", `${account.name} •• ${last4}`]];
    let fee = 0;
    let ready = "";

    if (kind === "statement") {
      const p = PERIODS.find((x) => x.id === period);
      rows.push(
        ["Period", period === "custom" ? `${from} to ${to}` : (p?.label ?? "")],
        ["Sent to", statementEmail.trim()],
      );
    } else if (kind === "cheque-book") {
      const l = LEAVES.find((x) => x.id === leaves);
      fee = multiplyMoney(l?.fee ?? 0, booklets);
      ready = chequeDelivery.method ? CHEQUE_READY[chequeDelivery.method] : "";
      rows.push(
        ["Booklet", l?.label ?? ""],
        ["Number of booklets", String(booklets)],
        ["Name printed", holder],
        ["Delivery", deliverySummary(chequeDelivery)],
        ["Ready", ready],
      );
    } else {
      const p = LETTER_PURPOSES.find((x) => x.id === purpose);
      if (delivery) ({ fee, ready } = LETTER_DELIVERY[delivery]);
      rows.push(
        ["Letter", p?.label ?? ""],
        ["Addressed to", addressee.trim() || "To Whom It May Concern"],
        ["Delivery", delivery === "branch" ? `Collect at ${branch?.name ?? "a branch"}` : `Email to ${email}`],
        ["Ready", ready],
      );
    }
    return { rows, fee, ready };
  }, [
    kind,
    account.name,
    last4,
    period,
    from,
    to,
    statementEmail,
    delivery,
    leaves,
    booklets,
    chequeDelivery,
    holder,
    purpose,
    addressee,
    branch,
    email,
  ]);

  function submit() {
    setPinOpen(false);
    setReference(`REQ-2026-${Math.floor(10000 + Math.random() * 90000)}`);
    setPhase("done");
  }

  // A free statement has nothing to charge or review — it's sent straight away.
  function sendStatement() {
    setReference(`REQ-2026-${Math.floor(10000 + Math.random() * 90000)}`);
    setPhase("done");
  }

  const backToAccount = `/accounts/${account.id}`;
  // Leaving the flow pops back to Account Details (or replaces to it on a cold
  // open) — never pushes it, which would make the two pages' Backs ping-pong.
  const { handleBack: leaveFlow } = useContextualBack(backToAccount);

  function handleBack() {
    if (phase === "review") setPhase("details");
    else if (kind && !isKind(initialKind)) reset(null);
    else leaveFlow();
  }

  /* ── Receipt — the same success screen Send & Pay uses ─────────────────── */
  if (phase === "done" && kind && summary) {
    const message =
      kind === "statement"
        ? `We're emailing your statement to ${statementEmail.trim()}. It usually arrives within a few minutes.`
        : kind === "cheque-book"
          ? chequeDelivery.method === "DELIVERY"
            ? booklets === 1
              ? `We'll text you when your cheque book is on the way to ${chequeDelivery.address.trim()}.`
              : `We'll text you when your cheque books are on the way to ${chequeDelivery.address.trim()}.`
            : booklets === 1
              ? `We'll text you when your cheque book is ready at ${chequeDelivery.branch?.name}.`
              : `We'll text you when your cheque books are ready at ${chequeDelivery.branch?.name}.`
          : delivery === "email"
            ? `We'll email your letter to ${email}.`
            : `We'll text you when it's ready to collect at ${branch?.name}.`;

    return (
      <PaymentSuccessScreen
        title={kind === "statement" ? "Statement Sent" : "Request Received"}
        message={`${message} Your reference is ${reference}.`}
        transactionId={reference}
        receiptRows={[
          ["Request", KIND_META[kind].title],
          ...summary.rows,
          ...(summary.fee > 0 ? [["Fee charged", formatMoney(summary.fee, "GHS", true)] as [string, string]] : []),
        ]}
        customActionCards={[]}
        showSaveBeneficiary={false}
        onPrimaryAction={leaveFlow}
        primaryActionLabel="Back to account"
        onSecondaryAction={() => reset(null)}
        secondaryActionLabel="Make another request"
      />
    );
  }

  const title = !kind ? "What would you like to request?" : phase === "review" ? "Review your request" : KIND_META[kind].title;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 animate-in fade-in duration-200 ease-out">
      <PageHeader title={title} backTo={{ href: backToAccount, label: account.name, onClick: handleBack }} />

      {/* ── Chooser ── */}
      {!kind && (
        <div className="flex flex-col gap-3.5">
          {(Object.keys(KIND_META) as RequestKind[]).map((k) => {
            const disabled = k === "cheque-book" && !chequesAllowed;
            return (
              <ActionTile
                key={k}
                icon={KIND_META[k].icon}
                title={KIND_META[k].title}
                description={disabled ? "Only available on current accounts" : undefined}
                disabled={disabled}
                onClick={() => reset(k)}
              />
            );
          })}
        </div>
      )}

      {/* ── Details: each field appears once the one before it is answered ── */}
      {kind && phase === "details" && (
        <div className="flex flex-col gap-6">
          {kind === "statement" && (
            <>
              <Field label="Period">
                <FlowSelect
                  value={period}
                  onChange={(v) => setPeriod(v as typeof period)}
                  placeholder="Select period"
                  options={PERIODS.map((p) => ({ id: p.id, name: p.label }))}
                />
              </Field>
              {period === "custom" && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                  <Field label="From">
                    <input
                      type="date"
                      value={from}
                      max={to || today}
                      onChange={(e) => setFrom(e.target.value)}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="To">
                    <input
                      type="date"
                      value={to}
                      min={from || undefined}
                      max={today}
                      onChange={(e) => setTo(e.target.value)}
                      className={INPUT}
                    />
                  </Field>
                </div>
              )}
              {periodDone && (
                <Field label="Send to" htmlFor="statement-email">
                  <input
                    id="statement-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={statementEmail}
                    onChange={(e) => setStatementEmail(e.target.value)}
                    placeholder="Email address"
                    className={INPUT}
                  />
                </Field>
              )}
            </>
          )}

          {kind === "cheque-book" && (
            <>
            <Field label="Booklet size">
              <FlowSelect
                value={leaves}
                onChange={(v) => setLeaves(v as typeof leaves)}
                placeholder="Select booklet size"
                options={LEAVES.map((l) => ({
                  id: l.id,
                  name: l.label,
                  description: `Printed with ${holder}`,
                  fee: `${formatMoney(l.fee, "GHS", true)} each`,
                }))}
              />
            </Field>
            {leaves && (
              <Field label="Number of booklets">
                <Stepper value={booklets} min={1} max={MAX_BOOKLETS} onChange={setBooklets} label="booklets" />
              </Field>
            )}
            {leaves && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                <DeliveryModeFields
                  value={chequeDelivery}
                  onChange={(patch) => setChequeDelivery((d) => ({ ...d, ...patch }))}
                />
              </div>
            )}
            </>
          )}

          {kind === "letter" && (
            <>
              <Field label="Purpose">
                <FlowSelect
                  value={purpose}
                  onChange={(v) => setPurpose(v as typeof purpose)}
                  placeholder="Select purpose"
                  options={LETTER_PURPOSES.map((p) => ({ id: p.id, name: p.label, description: p.hint }))}
                />
              </Field>
              {purpose && (
                <Field label="Addressed to (optional)" htmlFor="addressee">
                  <input
                    id="addressee"
                    value={addressee}
                    onChange={(e) => setAddressee(e.target.value)}
                    placeholder={purpose === "visa" ? "e.g. British High Commission, Accra" : "To Whom It May Concern"}
                    className={INPUT}
                  />
                </Field>
              )}
              {purpose && <DeliveryField email={email} value={delivery} onChange={setDelivery} />}
            </>
          )}

          {kind === "letter" && delivery === "branch" && (
            <Field label="Branch">
              <BranchCombobox value={branch} onChange={setBranch} branches={GCB_BRANCHES} />
            </Field>
          )}

          <ProceedButton
            disabled={!complete}
            onClick={kind === "statement" ? sendStatement : () => setPhase("review")}
            label={kind === "statement" ? "Send Statement" : "Continue"}
          />

        </div>
      )}

      {/* ── Review — same cards as the Send & Pay review ── */}
      {kind && phase === "review" && summary && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-col divide-y divide-border/60 overflow-hidden rounded-[15.75px] border border-border bg-card shadow-xs">
              {[["Request", KIND_META[kind].title] as [string, string], ...summary.rows].map(([label, value]) => (
                <div key={label} className="flex w-full items-center justify-between gap-4 px-4 py-3">
                  <span className="shrink-0 text-[13.5px] text-muted-foreground">{label}</span>
                  <span className="min-w-0 truncate text-right text-[13.5px] text-foreground tabular">{value}</span>
                </div>
              ))}
            </div>

            <div className="my-1 w-full border-t border-border/70" />

            <div className="flex w-full items-center justify-between overflow-hidden rounded-[15.75px] border border-border bg-muted/40 px-4 py-3.5 shadow-xs dark:bg-muted/20">
              <span className="text-[13.5px] text-foreground">Fee</span>
              <span className="text-[26px] tracking-[-0.03em] text-foreground tabular sm:text-[28px]">
                {formatMoney(summary.fee, "GHS", true)}
              </span>
            </div>
          </div>

          <p className="-mt-1 px-4 text-center text-[12px] text-muted-foreground">
            Clicking “Submit request” authorises GCB Bank PLC to charge the fee to {account.name} •• {last4}.
          </p>

          <div className="flex w-full items-center gap-4 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhase("details")}
              className="h-11 flex-1 rounded-lg border-border text-[14px] font-medium"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setPinOpen(true)}
              className="h-11 flex-1 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground drop-shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Submit request
            </Button>
          </div>
        </div>
      )}

      <TransactionPinModal open={pinOpen} onOpenChange={setPinOpen} onSuccess={submit} title="Authorise request" />
    </div>
  );
}

/* ── Fields — the Send & Pay form controls ─────────────────────────────── */

const INPUT =
  "h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
      <label htmlFor={htmlFor} className="text-[14px] font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

interface FlowOption {
  id: string;
  name: string;
  description?: string;
  fee?: string;
  speed?: string;
}

/** The Payment Method select from Send & Pay: name + description left, fee + speed right. */
function FlowSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string | null;
  onChange: (id: string) => void;
  placeholder: string;
  options: FlowOption[];
}) {
  const selected = options.find((o) => o.id === value);
  return (
    <Select value={value ?? ""} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
        {selected ? (
          <span className="truncate text-[15px] font-normal text-foreground">{selected.name}</span>
        ) : (
          <span className="truncate text-[15px] font-normal text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} label={o.name}>
            <div className="flex w-full items-center justify-between gap-4 py-0.5">
              <div className="flex flex-col text-left">
                <span className="font-medium text-foreground">{o.name}</span>
                {o.description && (
                  <span className="text-[12px] font-normal text-muted-foreground">{o.description}</span>
                )}
              </div>
              {(o.fee || o.speed) && (
                <div className="shrink-0 text-right">
                  {o.fee && <span className="block text-[13px] font-medium text-foreground tabular">{o.fee}</span>}
                  {o.speed && <span className="text-[11.5px] font-normal text-muted-foreground">{o.speed}</span>}
                </div>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeliveryField({
  email,
  value,
  onChange,
}: {
  email: string;
  value: Delivery | null;
  onChange: (v: Delivery) => void;
}) {
  const fees = LETTER_DELIVERY;
  return (
    <Field label="Delivery">
      <FlowSelect
        value={value}
        onChange={(v) => onChange(v as Delivery)}
        placeholder="Select delivery"
        options={[
          {
            id: "email",
            name: "Email",
            description: `Signed PDF to ${email}`,
            fee: formatMoney(fees.email.fee, "GHS", true),
            speed: fees.email.ready,
          },
          {
            id: "branch",
            name: "Collect at a branch",
            description: "Stamped paper copy",
            fee: formatMoney(fees.branch.fee, "GHS", true),
            speed: fees.branch.ready,
          },
        ]}
      />
    </Field>
  );
}

/** Quantity picker in the Send & Pay input style. */
function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const btn =
    "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex h-13 w-full items-center justify-between rounded-2xl border border-border/80 bg-card px-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label}`}
        className={btn}
      >
        <Minus size={17} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <span className="text-[15px] text-foreground tabular" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label}`}
        className={btn}
      >
        <Plus size={17} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
