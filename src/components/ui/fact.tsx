import { cn } from "@/lib/utils";

/**
 * One labelled fact in a details grid: a small grey label over its value. Put several inside a `dl`. Set `mono` for
 * numbers, dates and references so they line up (`tabular`).
 */
export function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-[13px] text-foreground", mono && "tabular")}>{value}</dd>
    </div>
  );
}
