/**
 * Prototype scaffolding that must not ship to customers: the colour tuner and the
 * "Post-Onboarding Cards" pill. On in `npm run dev`, off in any production build.
 */
export const SHOW_DEMO_TOOLS = process.env.NODE_ENV !== "production";

/** The Demo hub (persona and flow switcher). On in the live build so the doors can be walked through. Set to `false` to take it out. */
export const SHOW_DEMO_HUB = true;
