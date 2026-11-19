import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/* The type scale's names are font sizes (globals.css). Without this, tailwind-merge reads `text-body` as a colour and
   drops it when a real colour such as `text-foreground` sits beside it. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["caption", "body", "body-lg", "h4", "h3", "h2", "h1", "display"] },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
