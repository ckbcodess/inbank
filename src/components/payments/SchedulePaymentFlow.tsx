"use client";

/**
 * Schedule Payment, from the success page of a completed payment.
 *
 * The payment's details arrive already filled in (`lib/schedule-handoff.ts`) and are shown as they were paid, so
 * nothing is typed twice. The customer chooses only the schedule: how often, the first (or only) date and when it
 * stops, then confirms with a one-time code. It works for every kind of payment, because it carries what the
 * receipt showed rather than the fields of one particular form.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatDate, formatMoney, saveStandingInstruction, type InstructionFrequency } from "@/lib/mock-data";
import { FREQUENCY_OPTIONS, frequencyLabel } from "@/lib/standing-display";
import { useScheduleHandoff } from "@/lib/schedule-handoff";
import { useContextualBack } from "@/lib/contextual-back";
import { cn } from "@/lib/utils";
import { PaymentSuccessScreen } from "./PaymentSuccessScreen";
import TransactionOtpModal from "./TransactionOtpModal";
import { useAuthorisation } from "./useAuthorisation";
import { ProceedButton } from "./flows/shared";
import { ReviewSummary } from "@/components/ui/review-summary";

type Screen = "form" | "review" | "success";

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export function SchedulePaymentFlow() {
  const router = useRouter();
  const { handleBack } = useContextualBack("/payments");
  const auth = useAuthorisation();
  // The details are read once, then cleared from memory: a refresh starts over rather than reviving a payment.
  const [draft] = useState(() => useScheduleHandoff.getState().draft);
  useEffect(() => {
    useScheduleHandoff.getState().setDraft(null);
  }, []);
  // Opened without a payment to carry (a refresh, a bookmark): start a scheduled payment the usual way.
  useEffect(() => {
    if (!draft) router.replace("/payments/standing/new");
  }, [draft, router]);

  const [screen, setScreen] = useState<Screen>("form");
  const [otpOpen, setOtpOpen] = useState(false);
  const [createdId, setCreatedId] = useState("");
  const [frequency, setFrequency] = useState<InstructionFrequency | "">("");
  const [intervalDays, setIntervalDays] = useState("");
  const [firstRun, setFirstRun] = useState(tomorrow);
  const [endCondition, setEndCondition] = useState<"indefinite" | "date">("indefinite");
  const [endDate, setEndDate] = useState("");

  if (!draft) return null;

  const days = Math.max(1, Number(intervalDays) || 1);
  const recurring = frequency !== "" && frequency !== "Once";
  const frequencyText = frequency ? frequencyLabel({ frequency, intervalDays: days }) : "";
  const total = draft.amount + draft.fee;
  const money = (v: number) => formatMoney(v, draft.currency, true);
  const valid =
    Boolean(frequency) &&
    (frequency !== "Custom" || Number(intervalDays) >= 1) &&
    Boolean(firstRun) &&
    (!recurring || endCondition === "indefinite" || Boolean(endDate));

  const paymentRows: Array<[string, string]> = [
    ["To", draft.recipient],
    ...draft.details,
    ["From", draft.fromLabel],
    ["Amount", money(draft.amount)],
    ...(draft.fee > 0 ? ([["Fee", money(draft.fee)]] as Array<[string, string]>) : []),
    ...(draft.narration ? ([["Narration", draft.narration]] as Array<[string, string]>) : []),
  ];
  const scheduleRows: Array<[string, string]> = [
    ["Frequency", frequencyText],
    [frequency === "Once" ? "Payment Date" : "First Payment", formatDate(firstRun)],
    ...(recurring
      ? ([["Ends", endCondition === "date" && endDate ? formatDate(endDate) : "Until cancelled"]] as Array<[string, string]>)
      : []),
  ];
  const name = `${draft.kind} · ${draft.recipient}`.slice(0, 48);

  function authorise(code?: string) {
    if (!auth.verify(code)) return;
    const id = `SO-${Date.now().toString().slice(-6)}`;
    saveStandingInstruction({
      id,
      beneficiary: draft!.recipient,
      shortName: name,
      transactionType: draft!.kind,
      narration: draft!.narration || undefined,
      accountId: draft!.fromId,
      amount: draft!.amount,
      currency: draft!.currency,
      frequency: frequency || "Once",
      intervalDays: frequency === "Custom" ? days : undefined,
      nextRun: firstRun,
      startDate: firstRun,
      endDate: recurring && endCondition === "date" && endDate ? endDate : undefined,
      status: "Active",
    });
    setCreatedId(id);
    setScreen("success");
  }

  if (screen === "success") {
    return (
      <PaymentSuccessScreen
        title="Payment scheduled"
        message={`We’ll send ${money(draft.amount)} to ${draft.recipient} ${
          frequency === "Once" ? `on ${formatDate(firstRun)}` : `${frequencyText.toLowerCase()}, starting ${formatDate(firstRun)}`
        }.`}
        transactionId={createdId}
        receiptRows={[["Reference ID", createdId], ...paymentRows, ...scheduleRows]}
        onPrimaryAction={() => router.push("/payments/standing")}
        primaryActionLabel="View scheduled payments"
        showSaveBeneficiary={false}
        hideSchedule
      />
    );
  }

  const header = (title: string, onBack: () => void, label: string) => (
    <div data-page-header className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="relative -ml-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-0 sm:size-8"
        aria-label={label}
      >
        <ChevronLeft size={20} />
      </button>
      <h1 className="truncate text-[18px] font-medium leading-[24px] tracking-[var(--ls-heading)] text-foreground sm:text-[20px] sm:leading-[28px] lg:text-[22px]">
        {title}
      </h1>
    </div>
  );

  const rowsCard = (rows: Array<[string, string]>) => (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-2 text-[14px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-5 rounded-xl px-2 py-3">
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <span className="tabular min-w-0 truncate text-right text-foreground">{value}</span>
        </div>
      ))}
    </div>
  );

  if (screen === "review") {
    return (
      <div className="mx-auto flex w-full max-w-2xl animate-in flex-col gap-6 duration-200 ease-out fade-in">
        {header("Schedule Summary", () => setScreen("form"), "Back to the schedule")}
        <div className="flex flex-col gap-4">
          <ReviewSummary
            details={[
              ["To", draft.recipient],
              ...draft.details,
              ["From", draft.fromLabel],
              ...(draft.narration ? ([["Narration", draft.narration]] as Array<[string, string]>) : []),
              ...scheduleRows,
            ].map(([label, value]) => ({ label, value }))}
            breakdown={[
              { label: "Amount", value: money(draft.amount), tabular: true },
              ...(draft.fee > 0 ? [{ label: "Fee", value: money(draft.fee), tabular: true }] : []),
            ]}
            total={money(total)}
            totalLabel="Total per payment"
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="h-11 flex-1 text-[15px]" onClick={() => setScreen("form")}>
              Back to Edit
            </Button>
            <Button type="button" className="h-11 flex-1 text-[16px]" onClick={() => setOtpOpen(true)}>
              Authorize &amp; Schedule
            </Button>
          </div>
        </div>
        <TransactionOtpModal
          open={otpOpen}
          onOpenChange={setOtpOpen}
          onSuccess={(code) => {
            setOtpOpen(false);
            authorise(code);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl animate-in flex-col gap-6 duration-200 ease-out fade-in">
      {header("Schedule Payment", handleBack, "Back")}

      {/* The payment as it was paid: filled in, nothing to type again. */}
      {rowsCard(paymentRows)}

      <Field label="Frequency">
        <Select value={frequency} onValueChange={(val) => val && setFrequency(val as InstructionFrequency)}>
          <SelectTrigger>
            <span className={cn("truncate", !frequency && "text-muted-foreground")}>
              {FREQUENCY_OPTIONS.find((o) => o.id === frequency)?.label ?? "Select frequency"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} label={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {frequency === "Custom" && (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-[13px] text-muted-foreground">Repeat after</span>
            <Input
              type="text"
              inputMode="numeric"
              aria-label="Number of days"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              className="tabular w-17 text-center"
            />
            <span className="text-[13px] text-muted-foreground">days</span>
          </div>
        )}
      </Field>

      {/* Dates wait for a frequency (and the days, when it is every X days) */}
      {frequency && (frequency !== "Custom" || Number(intervalDays) >= 1) && (
        <div className="flex animate-in flex-col gap-5 duration-200 fade-in slide-in-from-bottom-1">
          <div className={cn("grid grid-cols-1 gap-3", recurring && "sm:grid-cols-2")}>
            <Field label={frequency === "Once" ? "Payment Date" : "First Payment"} htmlFor="sp-first-run">
              <Input
                id="sp-first-run"
                type="date"
                value={firstRun}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFirstRun(e.target.value)}
                className="tabular"
              />
            </Field>
            {recurring && (
              <Field label="Ends">
                <Select value={endCondition} onValueChange={(val) => val && setEndCondition(val as "indefinite" | "date")}>
                  <SelectTrigger>
                    <span className="truncate">{endCondition === "date" ? "On a Date" : "Until I Cancel"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinite" label="Until I Cancel">
                      Until I cancel
                    </SelectItem>
                    <SelectItem value="date" label="On a Date">
                      On a date
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          {recurring && endCondition === "date" && (
            <Field label="Last Payment" htmlFor="sp-end-date">
              <Input
                id="sp-end-date"
                type="date"
                value={endDate}
                min={firstRun}
                onChange={(e) => setEndDate(e.target.value)}
                className="tabular"
              />
            </Field>
          )}

          <ProceedButton disabled={!valid} onClick={() => setScreen("review")} label="Continue to Summary" />
        </div>
      )}
    </div>
  );
}
