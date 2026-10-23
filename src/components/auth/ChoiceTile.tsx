/**
 * One option on a sign-up door ("GCB Account Holder", "Sole Proprietor"): an amber icon disc, a label, a line
 * and a chevron. The whole tile is the button. Same look as the personal door at /get-started.
 */

import { ChevronRight, type Icon as IconType } from "@/components/ui/icons";

export default function ChoiceTile({
  icon: Icon,
  label,
  line,
  onClick,
}: {
  icon: IconType;
  label: string;
  line: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card-item p-4 text-left transition duration-hover hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-[15.5px] font-medium tracking-[var(--ls-tight)] text-foreground sm:text-[16.5px]">
            {label}
          </span>
          <span className="mt-0.5 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px]">{line}</span>
        </div>
      </div>
      <ChevronRight
        size={20}
        className="shrink-0 text-foreground/70 transition duration-hover group-hover:text-foreground"
      />
    </button>
  );
}
