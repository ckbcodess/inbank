"use client";

import { useState } from "react";
import { FileText, Paperclip } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { FilePreviewDialog } from "@/components/ui/file-preview";

export interface AttachedFile {
  name: string;
  size: string;
  /** A local preview of the chosen file, made when it is picked. */
  url?: string;
}

export function toAttachedFile(file: File): AttachedFile {
  return { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, url: URL.createObjectURL(file) };
}

/**
 * Attach the signed request letter: a quiet row with the file once chosen, and one button to choose or replace
 * it. Used when applying (/business/signup/enrol). Kept as a row rather than a drop zone (designer, 2026-11-26).
 */
export default function LetterUpload({
  id,
  file,
  onChange,
}: {
  id: string;
  file: AttachedFile | null;
  onChange: (file: AttachedFile) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">
          <FileText size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-body font-medium text-foreground">Signed Letter</p>
          <p className="truncate text-caption text-muted-foreground">
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

      <div className="flex shrink-0 items-center gap-1">
        {file?.url && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="cursor-pointer px-2 text-body text-muted-foreground transition-colors hover:text-foreground"
          >
            Preview
          </button>
        )}
        <label htmlFor={`letter-${id}`} className="shrink-0 cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-ring">
          <input
            type="file"
            id={`letter-${id}`}
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (!chosen) return;
              if (file?.url) URL.revokeObjectURL(file.url);
              onChange(toAttachedFile(chosen));
            }}
          />
          <Button type="button" variant="outline" size="md" tabIndex={-1} className="pointer-events-none">
            <Paperclip size={15} aria-hidden="true" />
            {file ? "Replace" : "Choose File"}
          </Button>
        </label>
      </div>
      {file?.url && <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} name={file.name} url={file.url} />}
    </div>
  );
}
