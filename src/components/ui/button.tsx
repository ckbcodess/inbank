"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { AppLoader } from "@/components/ui/loader"

const buttonVariants = cva(
  "group/button relative overflow-hidden inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors duration-100 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:brightness-95",
        outline:
          "border-border bg-background hover-surface hover:text-foreground aria-expanded:text-foreground dark:border-border dark:bg-border/30",
        secondary:
          "bg-muted text-accent-foreground hover:[background-color:color-mix(in_oklch,var(--muted)_var(--hover-fill),var(--hover-mix-color))] aria-expanded:bg-muted aria-expanded:text-accent-foreground",
        ghost:
          "hover-surface hover:text-foreground aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/50 focus-visible:ring-destructive/30 dark:bg-destructive dark:text-white dark:hover:bg-destructive/90",
        link: "text-foreground underline-offset-4 hover:underline",
        // Frosted control for the dark hero panel on the dashboard (white type, tinted by --hero-foreground).
        glass:
          "backdrop-blur-md border-[color-mix(in_oklch,var(--hero-foreground)_16%,transparent)] bg-[color-mix(in_oklch,var(--hero-foreground)_8%,transparent)] text-[var(--hero-foreground)] hover:bg-[color-mix(in_oklch,var(--hero-foreground)_14%,transparent)]",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-2 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * `loading` turns the button itself into the progress indicator: the label is
 * replaced by a centred spinner, the button keeps its hue but dims (opacity-70,
 * unlike the grey of `disabled`) and its width (the label stays in the layout,
 * hidden), and it ignores clicks until it's done.
 * Prefer this to a separate spinner or "Saving…" text beside the button.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  children,
  onClick,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-ripple="true"
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }), loading && "pointer-events-none opacity-70")}
      onClick={loading ? (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault() : onClick}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center justify-center gap-[inherit]" aria-hidden="true">
            {children}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <AppLoader size={18} />
          </span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
