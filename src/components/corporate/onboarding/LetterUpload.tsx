"use client";

import { FileText, Paperclip } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export interface AttachedFile {
  name: string;
  size: string;
}

export function toAttachedFile(file: File): AttachedFile {
  return { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` };
}

/**
 * Attach the signed request letter: a quiet row with the file once chosen, and one button to choose or replace
 * it. Used when applying (/business/signup/enrol) and on the status page when the letter is still to come or
 * was returned.
 */
export default function LetterUpload({
  id,
  label = "Signed Letter",
  file,
  onChange,
}: {
  id: string;
  label?: string;
  file: AttachedFile | null;
  onChange: (file: AttachedFile) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileText size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-foreground">{label}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {file ? (
              <>
                {file.name} · <span className="tabular">{file.size}</span>
              </>
            ) : (
              "PDF or photo, signed and stamped"
            )}
          </p>
        </div>
      </div>

      <label htmlFor={`letter-${id}`} className="shrink-0 cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-ring">
        <input
          type="file"
          id={`letter-${id}`}
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) onChange(toAttachedFile(chosen));
          }}
        />
        <Button type="button" variant="outline" size="lg" tabIndex={-1} className="pointer-events-none">
          <Paperclip size={15} aria-hidden="true" />
          {file ? "Replace" : "Choose File"}
        </Button>
      </label>
    </div>
  );
}
