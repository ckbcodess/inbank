"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/60 dark:bg-black/75 duration-150 backdrop-blur-md supports-backdrop-filter:backdrop-blur-md data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

export type DialogSize = "sm" | "md" | "lg" | "xl" | "full"

const sizeClasses: Record<DialogSize, string> = {
  sm: "sm:max-w-[420px]",
  md: "sm:max-w-[480px]",
  lg: "sm:max-w-[540px]",
  xl: "sm:max-w-[640px]",
  full: "max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-h-none max-sm:rounded-none sm:max-w-none sm:w-full sm:h-full sm:rounded-none",
}

export interface DialogContentProps extends DialogPrimitive.Popup.Props {
  size?: DialogSize
  showCloseButton?: boolean
  showDragHandle?: boolean
}

function DialogContent({
  className,
  children,
  size = "md",
  showCloseButton = false,
  showDragHandle = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          size === "full"
            ? "fixed inset-0 z-50 flex flex-col w-full h-full bg-card dark:bg-[#181818] text-foreground overflow-y-auto"
            : "fixed top-1/2 left-1/2 z-50 flex flex-col w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 dark:border-white/[0.1] outline-none shadow-2xl duration-100 bg-card dark:bg-[#181818] text-foreground overflow-hidden max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-t max-sm:border-border/80 max-sm:max-h-[92vh]",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showDragHandle && size !== "full" && (
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 select-none shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <button
                type="button"
                className="absolute top-3.5 right-4 sm:right-6 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            }
          />
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

export interface DialogHeaderProps extends React.ComponentProps<"div"> {
  showCloseButton?: boolean
  onClose?: () => void
}

function DialogHeader({
  className,
  children,
  showCloseButton = true,
  onClose,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-border/60 shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {children}
      </div>

      {showCloseButton && (
        onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-3"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        ) : (
          <DialogClose
            render={
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-3"
                aria-label="Close"
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            }
          />
        )
      )}
    </div>
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "max-h-[calc(90vh-130px)] sm:max-h-[75vh] overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex items-center justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-border/60 bg-muted/20 shrink-0",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" size="sm" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[17px] text-foreground tracking-[-0.01em] font-normal truncate", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-[13px] text-muted-foreground leading-normal",
        className
      )}
      {...props}
    />
  )
}

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  size?: DialogSize
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  bodyClassName?: string
  showCloseButton?: boolean
}

export function Modal({
  open,
  onOpenChange,
  title,
  size = "md",
  children,
  footer,
  className,
  bodyClassName,
  showCloseButton = true,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size} className={className} showCloseButton={false}>
        {title && (
          <DialogHeader showCloseButton={showCloseButton}>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <DialogBody className={bodyClassName}>
          {children}
        </DialogBody>
        {footer && (
          <DialogFooter>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
