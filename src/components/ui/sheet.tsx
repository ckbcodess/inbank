"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
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

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-modal text-foreground overflow-hidden",
          // Right side sheet: floating on desktop with balanced surrounding gap (top, bottom, right)
          side === "right" && [
            "inset-y-0 right-0 h-full w-full border-l",
            "sm:inset-y-3.5 sm:right-3.5 sm:left-auto sm:h-[calc(100dvh-28px)] sm:max-h-[calc(100dvh-28px)] sm:w-[440px] sm:max-w-md",
            "sm:border sm:border-black/[0.08] dark:sm:border-white/[0.1] sm:rounded-[26px]",
            "shadow-2xl sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),0_1px_3px_rgba(0,0,0,0.06)] dark:sm:shadow-[0_28px_72px_rgba(0,0,0,0.72)]",
          ],
          // Left side sheet: floating on desktop with balanced surrounding gap (top, bottom, left)
          side === "left" && [
            "inset-y-0 left-0 h-full w-full border-r",
            "sm:inset-y-3.5 sm:left-3.5 sm:right-auto sm:h-[calc(100dvh-28px)] sm:max-h-[calc(100dvh-28px)] sm:w-[440px] sm:max-w-md",
            "sm:border sm:border-black/[0.08] dark:sm:border-white/[0.1] sm:rounded-[26px]",
            "shadow-2xl sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),0_1px_3px_rgba(0,0,0,0.06)] dark:sm:shadow-[0_28px_72px_rgba(0,0,0,0.72)]",
          ],
          // Bottom sheet
          side === "bottom" && [
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[28px] border-t sm:max-w-xl sm:mx-auto",
          ],
          // Top sheet
          side === "top" && [
            "inset-x-0 top-0 max-h-[92dvh] rounded-b-[28px] border-b sm:max-w-xl sm:mx-auto",
          ],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-5 right-5 z-20 flex size-8 items-center justify-center rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
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
      className={cn("flex flex-col gap-1 p-6 pb-2 sm:p-7 sm:pb-3 pr-14 shrink-0", className)}
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
        "flex-1 overflow-y-auto px-6 sm:px-7 py-3 flex flex-col gap-5 overscroll-contain no-scrollbar",
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
      className={cn("mt-auto flex flex-col gap-2.5 p-6 pt-2 sm:p-7 sm:pt-4 shrink-0", className)}
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
        "rounded-[22px] bg-tile dark:bg-card-item border border-border/70 p-4.5 sm:p-5 flex flex-col divide-y divide-border/60",
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
        "flex items-start sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-[13.5px]",
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
      className={cn("flex flex-col items-center justify-center py-4", className)}
      {...props}
    >
      <div className="text-[36px] sm:text-[40px] font-semibold text-foreground tracking-tight leading-none tabular">
        {currency ? `${currency}${formatted}` : formatted}
      </div>
      {label && (
        <p className="mt-1.5 text-[13px] text-muted-foreground">{label}</p>
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
          "bg-primary text-primary-foreground hover:bg-primary-hover h-12 text-[14.5px] shadow-xs",
        ],
        variant === "secondary" && [
          "bg-muted hover:bg-muted/80 text-foreground h-12 text-[14.5px]",
        ],
        variant === "ghost" && [
          "text-muted-foreground hover:text-foreground hover:bg-muted/50 h-10 text-[14px]",
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
