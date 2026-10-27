/**
 * The pictures for products that are not insurance plans (a plan carries its own as `image` in `lib/insurance-plans.ts`).
 * A path under `public/`, for example `/plans/bonds.webp`. Until one is set the page and the shelf card draw a
 * flat scene in the product's colour. One place, so the shelf card and the product page always show the same picture.
 */

export const PRODUCT_IMAGES: Partial<Record<"advance" | "term-deposits" | "treasury-bills" | "bonds", string>> = {
  advance: "/plans/advance.webp",
  "term-deposits": "/plans/term-deposits.webp",
  "treasury-bills": "/plans/treasury-bills.webp",
  bonds: "/plans/bonds.webp",
};
