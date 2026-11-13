"use client";

/**
 * The signature a customer gives with an application. Empty, it offers two ways in: upload one JPG, PNG or PDF up
 * to 5 MB, or draw it on a pad with a finger, stylus or mouse. Once there is one, it shows the file's name and size
 * with a preview and a remove button. Shared by every flow that keeps a signature on file (the securities account,
 * the insurance profile), so the rules and the look are the same.
 */

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FileText, Pencil, Upload, X } from "@/components/ui/icons";
import { Field } from "@/components/ui/field";
import { FilePreviewDialog } from "@/components/ui/file-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A colour from the design tokens. Canvas drawing can't read CSS variables, so the value is read once per use. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The pad a customer signs on. It exports a PNG on white, so the ink reads the same in light and dark mode. */
function DrawSignatureDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (png: Blob) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(false);

  // The canvas mounts with the dialog, so each opening starts on a blank pad sized to its layout.
  const attach = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (!node) return;
    const dpr = window.devicePixelRatio || 1;
    node.width = node.clientWidth * dpr;
    node.height = node.clientHeight * dpr;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const ink = token("--black");
    if (ink) {
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
    }
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) setInked(false);
    onOpenChange(next);
  }

  function pointAt(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pointAt(e);
    last.current = p;
    // A tap leaves a dot, so a single touch still counts as a mark.
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.25, 0, Math.PI * 2);
    ctx.fill();
    setInked(true);
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!drawing.current || !last.current || !ctx) return;
    const p = pointAt(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const node = canvasRef.current;
    const ctx = node?.getContext("2d");
    if (!node || !ctx) return;
    ctx.clearRect(0, 0, node.clientWidth, node.clientHeight);
    setInked(false);
  }

  function done() {
    const node = canvasRef.current;
    if (!node) return;
    const out = document.createElement("canvas");
    out.width = node.width;
    out.height = node.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const paper = token("--white");
    if (paper) {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(node, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      onDone(blob);
      handleOpenChange(false);
    }, "image/png");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Draw your signature</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-[13px] text-muted-foreground">Sign inside the box with your finger, a stylus or a mouse.</p>
          <canvas
            ref={attach}
            role="img"
            aria-label="Signature pad"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="h-48 w-full touch-none cursor-crosshair rounded-2xl border border-field-border bg-[var(--white)]"
          />
          {!inked && <p className="text-[12px] text-muted-foreground">Draw your signature to continue.</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="md" onClick={clear} disabled={!inked}>
            Clear
          </Button>
          <Button variant="outline" size="md" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button size="md" onClick={done} disabled={!inked}>
            Use signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SignatureUpload({
  file,
  onChange,
  label = "Signature",
}: {
  /** `url` is the local preview of the chosen file; it is made when the file is picked or drawn. */
  file: { name: string; size: number; url?: string } | null;
  onChange: (next: { name: string; size: number; url?: string } | null) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!FILE_TYPES.includes(f.type)) return setError("That file type isn’t supported. Choose a JPG, PNG or PDF.");
    if (f.size > MAX_FILE_BYTES) return setError("That file is over 5 MB. Choose a smaller one.");
    setError("");
    if (file?.url) URL.revokeObjectURL(file.url);
    onChange({ name: f.name, size: f.size, url: URL.createObjectURL(f) });
  }

  function acceptDrawn(png: Blob) {
    setError("");
    if (file?.url) URL.revokeObjectURL(file.url);
    onChange({ name: "Drawn signature.png", size: png.size, url: URL.createObjectURL(png) });
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-field-border bg-field px-3 py-4 text-center transition-colors hover:border-field-border-hover"
          >
            <Upload size={18} className="text-muted-foreground" aria-hidden="true" />
            <span className="text-[14px] text-foreground">Upload a file</span>
            <span className="text-[12px] text-muted-foreground">JPG, PNG or PDF, up to 5 MB</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawOpen(true)}
            className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-field-border bg-field px-3 py-4 text-center transition-colors hover:border-field-border-hover"
          >
            <Pencil size={18} className="text-muted-foreground" aria-hidden="true" />
            <span className="text-[14px] text-foreground">Draw signature</span>
            <span className="text-[12px] text-muted-foreground">With your finger or a mouse</span>
          </button>
        </div>
      )}
      <DrawSignatureDialog open={drawOpen} onOpenChange={setDrawOpen} onDone={acceptDrawn} />
    </Field>
  );
}
