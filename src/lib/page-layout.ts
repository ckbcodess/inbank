/**
 * Layout classes a page and its loading skeleton must share. Both import from here, so changing a page's column or
 * picture height changes its skeleton with it (see `components/states/PageSkeletons.tsx`).
 */

/** The 560px centred column of a product page, a flow or a detail page. */
export const NARROW_COLUMN = "mx-auto flex w-full max-w-[560px] flex-col gap-6";

/** A product's picture: its height follows the viewport so the button stays above the fold. */
export const PRODUCT_PHOTO_HEIGHT = "h-[clamp(120px,22vh,315px)]";
