import { Check, Paperclip, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Row({
  label,
  value,
  tabular = false,
}: {
  label: string;
  value: React.ReactNode;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-foreground ${tabular ? "tabular" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

export function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
          >
            <Pencil size={13} strokeWidth={1.9} aria-hidden="true" />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function DocumentAttachRow({
  id,
  label,
  description,
  attachedFileName,
  onAttach,
  accept = ".pdf,.jpg,.jpeg,.png",
  required = true,
}: {
  id: string;
  label: string;
  description?: string;
  attachedFileName?: string;
  onAttach: (file: File) => void;
  accept?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-foreground">
          {label} {!required && <span className="text-[12px] text-muted-foreground font-normal">(Optional)</span>}
        </p>
        {description && !attachedFileName && (
          <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
        {attachedFileName && (
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check size={11} strokeWidth={2.5} />
            </span>
            <span className="truncate">{attachedFileName}</span>
          </p>
        )}
      </div>

      <label className="shrink-0 cursor-pointer">
        <input
          type="file"
          id={`attach-${id}`}
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAttach(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-none h-8 text-[12.5px]"
        >
          <Paperclip size={14} strokeWidth={1.8} className="mr-1.5" aria-hidden="true" />
          {attachedFileName ? "Replace" : "Attach"}
        </Button>
      </label>
    </div>
  );
}
