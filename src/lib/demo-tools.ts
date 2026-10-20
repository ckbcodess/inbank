/**
 * Prototype scaffolding that must not ship to customers: the colour tuner and the
 * "Post-Onboarding Cards" pill. On in `npm run dev`, off in any production build.
 */
export const SHOW_DEMO_TOOLS = process.env.NODE_ENV !== "production";

/** The Demo hub (persona and flow switcher). On in dev. Off in production: it signs people in directly, which would bypass the sign-in gate (lib/launch.ts). */
export const SHOW_DEMO_HUB = process.env.NODE_ENV !== "production";
