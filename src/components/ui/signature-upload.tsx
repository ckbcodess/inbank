"use client";

/**
 * The signature a customer gives with an application: one JPG, PNG or PDF up to 5 MB. Empty, it is a dashed drop
 * area; once chosen it shows the file's name and size with a remove button. Shared by every flow that keeps a
 * signature on file (the securities account, the insurance profile), so the rules and the look are the same.
 */

import { useRef, useState } from "react";
import { FileText, Upload, X } from "@/components/ui/icons";
import { Field } from "@/components/ui/field";
import { FilePreviewDialog } from "@/components/ui/file-preview";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function SignatureUpload({
  file,
  onChange,
  label = "Signature",
}: {
  /** `url` is the local preview of the chosen file; it is made when the file is picked. */
  file: { name: string; size: number; url?: string } | null;
  onChange: (next: { name: string; size: number; url?: string } | null) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!FILE_TYPES.includes(f.type)) return setError("That file type isn’t supported. Choose a JPG, PNG or PDF.");
    if (f.size > MAX_FILE_BYTES) return setError("That file is over 5 MB. Choose a smaller one.");
    setError("");
    if (file?.url) URL.revokeObjectURL(file.url);
    onChange({ name: f.name, size: f.size, url: URL.createObjectURL(f) });
  }

  function remove() {
    if (file?.url) URL.revokeObjectURL(file.url);
    onChange(null);
  }

  return (
    <Field label={label} error={error}>
      <input
        ref={input}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex min-h-[58px] items-center justify-between gap-2 field-surface rounded-2xl border border-transparent bg-field px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
              <FileText size={16} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] text-foreground">{file.name}</span>
              <span className="tabular text-[12px] text-muted-foreground">{fileSize(file.size)}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {file.url && (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="cursor-pointer px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Preview
              </button>
            )}
            <button
              type="button"
              onClick={remove}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {file.url && <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} name={file.name} url={file.url} />}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex min-h-[96px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-field-border bg-field px-3 py-4 text-center transition-colors hover:bg-field-hover"
        >
          <Upload size={18} className="text-muted-foreground" aria-hidden="true" />
          <span className="text-[13px] text-muted-foreground">Upload a JPG, PNG or PDF, up to 5 MB</span>
        </button>
      )}
    </Field>
  );
}
