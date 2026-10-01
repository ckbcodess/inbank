import { formatDate, type InstructionFrequency, type StandingInstruction } from "@/lib/mock-data";

/** The frequencies a standing order can have, in the order they are offered. */
export const FREQUENCY_OPTIONS: Array<{ id: InstructionFrequency; label: string }> = [
  { id: "Once", label: "Once" },
  { id: "Daily", label: "Daily" },
  { id: "Weekly", label: "Weekly" },
  { id: "Custom", label: "After Every X number of days" },
  { id: "Monthly", label: "Monthly" },
  { id: "Quarterly", label: "Quarterly" },
  { id: "Half Yearly", label: "Half Yearly" },
  { id: "Yearly", label: "Yearly" },
];

/** How many times an order runs in an average month (a one-off runs zero: it is not a recurring outflow). */
export function runsPerMonth(si: Pick<StandingInstruction, "frequency" | "intervalDays">): number {
  switch (si.frequency) {
    case "Once":
      return 0;
    case "Daily":
      return 30;
    case "Weekly":
      return 52 / 12;
    case "Custom":
      return 30 / Math.max(1, si.intervalDays ?? 1);
    case "Monthly":
      return 1;
    case "Quarterly":
      return 1 / 3;
    case "Half Yearly":
      return 1 / 6;
    case "Yearly":
      return 1 / 12;
  }
}

/** "Every 10 days" / "Monthly": how the frequency reads on a row. */
export function frequencyLabel(si: Pick<StandingInstruction, "frequency" | "intervalDays">): string {
  return si.frequency === "Custom" ? `Every ${si.intervalDays ?? 1} day${(si.intervalDays ?? 1) === 1 ? "" : "s"}` : si.frequency;
}

/** "Every month" / "Once": the sentence form used under the amount. */
export function cadencePhrase(si: Pick<StandingInstruction, "frequency" | "intervalDays">): string {
  switch (si.frequency) {
    case "Once":
      return "One time";
    case "Daily":
      return "Every day";
    case "Weekly":
      return "Every week";
    case "Custom":
      return frequencyLabel(si).replace(/^Every/, "Every");
    case "Monthly":
      return "Every month";
    case "Quarterly":
      return "Every 3 months";
    case "Half Yearly":
      return "Every 6 months";
    case "Yearly":
      return "Every year";
  }
}

/** "Kofi Osei — Rent contribution" → who, and what for (older saved orders only carry this). */
export function splitBeneficiary(label: string): { name: string; memo: string | null } {
  const [name, ...rest] = label.split(" — ");
  return { name, memo: rest.length ? rest.join(" — ") : null };
}

/** The order's short name is its title. Older orders fall back to their purpose, then their payee. */
export function orderTitle(si: Pick<StandingInstruction, "shortName" | "beneficiary">): string {
  const { name, memo } = splitBeneficiary(si.beneficiary);
  return si.shortName || memo || name;
}

/** Who gets paid. */
export function orderPayee(si: Pick<StandingInstruction, "beneficiary">): string {
  return splitBeneficiary(si.beneficiary).name;
}

/** "To Bank", "Airtime"...: what kind of payment this is. */
export function orderType(si: Pick<StandingInstruction, "transactionType">): string {
  return si.transactionType || "To Bank";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "Today", "Tomorrow", or the date. */
export function dayLabel(iso: string): string {
  if (iso === todayIso()) return "Today";
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return iso === tomorrow ? "Tomorrow" : formatDate(iso);
}
