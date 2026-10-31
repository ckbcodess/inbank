"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { AppLoader } from "@/components/ui/loader"

/**
 * The hero's glass control, in one place: a translucent gradient over the panel with the backdrop blur, a faint top
 * highlight, and a hover wash. The wash is an inset shadow, not a background swap, because a gradient can't
 * transition to a flat colour. Every glass control uses this: the Button `glass` variant, the account pill and
 * the round-action chips (`HERO_GLASS`). Its colours are the `--hero-glass-*` tokens in globals.css.
 */
export const GLASS_CLASS =
  "backdrop-blur-md transition-[color,background-color,box-shadow,transform] duration-hover bg-[linear-gradient(to_bottom,var(--hero-glass-top),var(--hero-glass-bottom))] text-[var(--hero-button-foreground)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_0_999px_transparent] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_0_999px_var(--hero-glass-hover)] group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_0_999px_var(--hero-glass-hover)]";

const buttonVariants = cva(
  "group/button relative overflow-hidden inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-[13px] font-semibold whitespace-nowrap [transition:color_var(--dur-hover)_var(--ease-in-out),background-color_var(--dur-hover)_var(--ease-in-out),border-color_var(--dur-hover)_var(--ease-in-out),box-shadow_var(--dur-hover)_var(--ease-in-out),transform_var(--dur-press)_var(--ease-settle)] active:scale-[0.995] outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer",
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
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-1 focus-visible:ring-destructive dark:bg-destructive dark:text-white dark:hover:bg-destructive/90",
        link: "text-foreground underline-offset-4 hover:underline",
        // The same fill as a hub list tile (--tile), for a button that sits beside or above tiles.
        tile: "bg-[var(--tile)] text-foreground hover:bg-[var(--tile-hover)]",
        // Frosted control for the dark hero panel on the dashboard (white type, tinted by --hero-foreground).
        glass: GLASS_CLASS,
      },
      size: {
        default:
          "h-9 gap-2 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-5 gap-1 rounded-xl px-2 text-xs in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-7 gap-2 rounded-xl px-2 text-[12.5px] in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-9 gap-2 px-5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-5 rounded-xl in-data-[slot=button-group]:rounded-xl [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm":
          "size-7 rounded-xl in-data-[slot=button-group]:rounded-xl",
        "icon-lg": "size-9",
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
