"use client";

/**
 * Preview of a file the person attached (a signature, a letter, an ID). The file stays in the browser as an object
 * URL made when it was chosen, so the preview shows exactly what was uploaded. Images and PDFs only.
 */

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function isPdfName(name: string) {
  return /\.pdf$/i.test(name);
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  name,
  url,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  url: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{name}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isPdfName(name) ? (
            <iframe title={name} src={url} className="h-[70vh] w-full rounded-xl border border-border bg-card" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote image
            <img src={url} alt={name} className="max-h-[70vh] w-full rounded-xl object-contain" />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
