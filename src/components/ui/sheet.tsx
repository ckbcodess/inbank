"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/35 dark:bg-black/65 backdrop-blur-[8px]",
        className
      )}
      {...props}
    />
  );
}

/**
 * Below `sm`, side sheets are bottom sheets: pinned to the bottom edge, as tall as their content up to 92% of the
 * screen, rounded on top, clear of the home indicator. A tall form can pass `h-[92dvh]` to keep one height across steps.
 * `sm` and up put these back to floating side panels (the `sm:` classes on each side).
 */
const SHEET_MOBILE_BOTTOM =
  "inset-x-0 bottom-0 top-auto h-auto max-h-[92dvh] w-full rounded-t-3xl border-t pb-[env(safe-area-inset-bottom)] sm:rounded-3xl sm:pb-0";

/** Dragged further than this (px), or flicked faster than DISMISS_VELOCITY (px/ms), and the sheet closes. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55;

/**
 * Swipe down to close: a grab handle at the top edge of a bottom sheet. The sheet follows the finger, then either
 * settles back or leaves. Left and right sheets only offer it below `sm`, where they are bottom sheets.
 */
function SheetHandle({
  popupRef,
  onDismiss,
  mobileOnly,
}: {
  popupRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  mobileOnly: boolean;
}) {
  const drag = React.useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);

  const active = () => !mobileOnly || window.matchMedia("(max-width: 639px)").matches;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active() || !popupRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 };
    popupRef.current.style.transition = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = popupRef.current;
    if (!d || !el) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    el.style.transform = `translate3d(0, ${dy}px, 0)`;
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = popupRef.current;
    drag.current = null;
    if (!d || !el) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const settle = "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)";
    if (dy > DISMISS_DISTANCE || d.velocity > DISMISS_VELOCITY) {
      // Hand the exit to the inline transform so the close animation doesn't restart from the top.
      el.setAttribute("data-dragged", "");
      el.style.transition = settle;
      el.style.transform = "translate3d(0, 100%, 0)";
      onDismiss();
    } else {
      el.style.transition = settle;
      el.style.transform = "translate3d(0, 0, 0)";
      window.setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, 270);
    }
  };

  return (
    <div
      data-slot="sheet-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      className={cn(
        "absolute left-1/2 top-0 z-30 flex h-8 w-28 -translate-x-1/2 cursor-grab touch-none items-start justify-center pt-2.5 select-none active:cursor-grabbing",
        mobileOnly && "sm:hidden"
      )}
    >
      <span className="h-1 w-9 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left" | "center";
  showCloseButton?: boolean;
}) {
  const popupRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const swipeable = side !== "top";

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        ref={popupRef}
        // Open with focus on the sheet itself, not its first button (a copy icon would light up with a ring for no
        // reason). Tab still moves inside the sheet, and a caller can pass its own `initialFocus`.
        initialFocus={popupRef}
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-modal text-foreground overflow-hidden outline-none",
          // Right side sheet: a bottom sheet below `sm`, floating on desktop with balanced surrounding gap (top, bottom, right)
          side === "right" && [
            SHEET_MOBILE_BOTTOM,
            "sm:inset-y-3 sm:h-[calc(100dvh-28px)] sm:right-3 sm:left-auto sm:max-h-[calc(100dvh-28px)] sm:w-[440px] sm:max-w-md",
            "sm:border sm:border-black/[0.08] dark:sm:border-white/[0.1] sm:rounded-3xl",
            "shadow-2xl sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),0_1px_3px_rgba(0,0,0,0.06)] dark:sm:shadow-[0_28px_72px_rgba(0,0,0,0.72)]",
          ],
          // Left side sheet: a bottom sheet below `sm`, floating on desktop with balanced surrounding gap (top, bottom, left)
          side === "left" && [
            SHEET_MOBILE_BOTTOM,
            "sm:inset-y-3 sm:h-[calc(100dvh-28px)] sm:left-3 sm:right-auto sm:max-h-[calc(100dvh-28px)] sm:w-[440px] sm:max-w-md",
            "sm:border sm:border-black/[0.08] dark:sm:border-white/[0.1] sm:rounded-3xl",
            "shadow-2xl sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),0_1px_3px_rgba(0,0,0,0.06)] dark:sm:shadow-[0_28px_72px_rgba(0,0,0,0.72)]",
          ],
          // Centre: a bottom sheet below `sm`, a dialog in the middle of the screen from `sm` up. Same parts as the side sheets.
          side === "center" && [
            SHEET_MOBILE_BOTTOM,
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[min(90dvh,860px)] sm:w-[480px] sm:max-w-[calc(100vw-32px)]",
            "sm:border sm:border-black/[0.08] dark:sm:border-white/[0.1] sm:rounded-3xl",
            "shadow-2xl sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),0_1px_3px_rgba(0,0,0,0.06)] dark:sm:shadow-[0_28px_72px_rgba(0,0,0,0.72)]",
          ],
          // Bottom sheet
          side === "bottom" && [
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl border-t sm:max-w-xl sm:mx-auto",
          ],
          // Top sheet
          side === "top" && [
            "inset-x-0 top-0 max-h-[92dvh] rounded-b-3xl border-b sm:max-w-xl sm:mx-auto",
          ],
          className
        )}
        {...props}
      >
        {children}
        {swipeable && (
          <>
            <SheetHandle
              popupRef={popupRef}
              mobileOnly={side !== "bottom"}
              onDismiss={() => closeRef.current?.click()}
            />
            <SheetPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden className="hidden" />
          </>
        )}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-4 right-4 z-20 flex size-7 items-center justify-center rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X size={15} />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 p-5 pb-2 sm:p-6 sm:pb-2 pr-12 shrink-0", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-[16px] font-medium text-foreground tracking-[var(--ls-tight)] leading-snug",
        className
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[13px] text-muted-foreground leading-normal", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        "scroll-fade flex-1 overflow-y-auto px-5 sm:px-6 py-2 flex flex-col gap-4 overscroll-contain no-scrollbar",
        className
      )}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-5 pt-2 sm:p-6 sm:pt-3 shrink-0", className)}
      {...props}
    />
  );
}

/**
 * Grouped card surface used inside the Sheet (e.g. key-value transaction metadata or hero tile).
 */
function SheetCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-card"
      className={cn(
        "rounded-3xl bg-tile dark:bg-card-item border border-border/70 p-4 sm:p-4 flex flex-col divide-y divide-border/60",
        className
      )}
      {...props}
    />
  );
}

/**
 * A key-value row within a SheetCard with label on the left and value on the right.
 */
function SheetRow({
  label,
  value,
  sublabel,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label?: React.ReactNode;
  value?: React.ReactNode;
  sublabel?: React.ReactNode;
}) {
  return (
    <div
      data-slot="sheet-row"
      className={cn(
        "flex items-start sm:items-center justify-between gap-2 py-2 first:pt-0 last:pb-0 text-[13px]",
        className
      )}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          <div className="flex flex-col">
            <span className="text-muted-foreground font-normal">{label}</span>
            {sublabel && (
              <span className="text-[12px] text-muted-foreground/75 mt-0.5">
                {sublabel}
              </span>
            )}
          </div>
          {value && (
            <span className="text-foreground font-medium tabular text-right shrink-0">
              {value}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Centered hero amount display shown at the top of transaction details.
 */
function SheetHeroAmount({
  amount,
  label,
  currency = "$",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  amount: number | string;
  label?: string;
  currency?: string;
}) {
  const formatted =
    typeof amount === "number"
      ? new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount)
      : amount;

  return (
    <div
      data-slot="sheet-amount"
      className={cn("flex flex-col items-center justify-center py-3", className)}
      {...props}
    >
      <div className="text-[36px] sm:text-[40px] font-semibold text-foreground tracking-tight leading-none tabular">
        {currency ? `${currency}${formatted}` : formatted}
      </div>
      {label && (
        <p className="mt-2 text-[13px] text-muted-foreground">{label}</p>
      )}
    </div>
  );
}

/**
 * Pill-shaped action buttons matching the Sheet design:
 * - "primary" / "lime": GCB brand golden primary button
 * - "secondary": soft neutral pill button
 * - "ghost": minimal flat action button
 */
function SheetButton({
  variant = "secondary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "lime";
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full font-medium transition-all cursor-pointer flex items-center justify-center select-none active:scale-[0.98]",
        (variant === "primary" || variant === "lime") && [
          "bg-primary text-primary-foreground hover:bg-primary-hover h-10 text-[14px] shadow-xs",
        ],
        variant === "secondary" && [
          "bg-muted hover:bg-muted/80 text-foreground h-10 text-[14px]",
        ],
        variant === "ghost" && [
          "text-muted-foreground hover:text-foreground hover:bg-muted/50 h-9 text-[14px]",
        ],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetCard,
  SheetRow,
  SheetHeroAmount,
  SheetButton,
};
