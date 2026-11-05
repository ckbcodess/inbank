"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { AppLoader } from "@/components/ui/loader"

/**
 * The hero's glass control, in one place: a translucent gradient over the panel with the backdrop blur, a single hairline border, and a hover wash. The wash is an inset shadow, not a background swap, because a gradient can't
 * transition to a flat colour. Every glass control uses this: the Button `glass` variant, the account pill and
 * the round-action chips (`HERO_GLASS`). Its colours are the `--hero-glass-*` tokens in globals.css.
 */
export const GLASS_CLASS =
  "overflow-visible border-[color-mix(in_srgb,var(--white)_16%,transparent)] bg-clip-padding backdrop-blur-md transition-[color,background-color,box-shadow,transform] duration-hover bg-[linear-gradient(to_bottom,var(--hero-glass-top),var(--hero-glass-bottom))] text-[var(--hero-button-foreground)] shadow-[inset_0_0_0_999px_transparent] hover:shadow-[inset_0_0_0_999px_var(--hero-glass-hover)] group-hover:shadow-[inset_0_0_0_999px_var(--hero-glass-hover)]";

const buttonVariants = cva(
  "group/button relative overflow-hidden inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent text-[13px] font-medium whitespace-nowrap [transition:color_var(--dur-hover)_var(--ease-in-out),background-color_var(--dur-hover)_var(--ease-in-out),border-color_var(--dur-hover)_var(--ease-in-out),box-shadow_var(--dur-hover)_var(--ease-in-out),scale_var(--dur-hover)_var(--ease-snappy)] select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent disabled:shadow-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "primary-sheen rounded-[var(--primary-radius)] border-[length:var(--primary-border-width)] text-primary-foreground hover:brightness-105",
        outline:
          "border-border bg-background shadow-[0_1px_1px_0_color-mix(in_srgb,var(--black)_4%,transparent)] hover:bg-muted/50 hover:text-foreground aria-expanded:bg-muted/50 aria-expanded:text-foreground dark:bg-border/30 dark:hover:bg-border/45 dark:aria-expanded:bg-border/45",
        secondary:
          "bg-muted text-accent-foreground hover:[background-color:color-mix(in_oklch,var(--muted)_var(--hover-fill),var(--hover-mix-color))] aria-expanded:bg-muted aria-expanded:text-accent-foreground",
        ghost:
          "hover-surface hover:text-foreground aria-expanded:text-foreground active:[background-color:color-mix(in_oklch,var(--foreground)_var(--hover-overlay),transparent)]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_0_color-mix(in_srgb,var(--black)_20%,transparent)] hover:bg-destructive/90 focus-visible:outline-destructive dark:bg-destructive dark:text-white dark:hover:bg-destructive/90",
        link: "text-foreground underline-offset-4 hover:underline",
        // The same fill as a hub list tile (--tile), for a button that sits beside or above tiles.
        tile: "bg-[var(--tile)] text-foreground hover:bg-[var(--tile-hover)]",
        // Frosted control for the dark hero panel on the dashboard (white type, tinted by --hero-foreground).
        glass: GLASS_CLASS,
      },
      /*
       * One scale, heights from the `--control-*` tokens in globals.css (the same ones fields use), so a button
       * beside a field lines up. Pick by role, not by taste:
       *   xs       a count or tag pressed inline (rare)
       *   sm       a compact action inside a row, chip strip or table
       *   default  a toolbar or header action
       *   md       an action inside a panel, dialog or auth screen
       *   xl       a flow or form step's action and the one big call to action: the same height as a field
       * A full-width button in a flow is `xl`. Never override height or text size with className.
       */
      size: {
        xs: "active:scale-[0.96] h-(--control-xs) gap-1 rounded-xl px-2 text-xs in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "active:scale-[0.97] h-(--control-sm) gap-2 rounded-xl px-2 text-[12.5px] in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        default:
          "active:scale-[0.98] h-(--control-default) gap-2 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        md: "active:scale-[0.98] h-(--control-md) gap-2 px-3 text-[14px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xl: "active:scale-[0.98] h-(--control-xl) gap-2 px-4 text-[16px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        // Icon-only buttons are square on the same steps.
        "icon-xs":
          "active:scale-[0.96] size-(--control-xs) rounded-xl in-data-[slot=button-group]:rounded-xl [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm":
          "active:scale-[0.97] size-(--control-sm) rounded-xl in-data-[slot=button-group]:rounded-xl",
        icon: "active:scale-[0.97] size-8",
        "icon-lg": "active:scale-[0.98] size-(--control-default)",
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
      aria-disabled={loading || undefined}
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
