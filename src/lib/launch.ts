import type { Actor } from "./roles";

/**
 * Launch switches. Local development (`npm run dev`) keeps everything open.
 * In a production build each door stays closed until its env var is "true"
 * on the host. Retail login is always open. Onboarding is never gated.
 */
const isDev = process.env.NODE_ENV !== "production";

/** Business login (the business door and any business credentials). Closed in production: a work-in-progress screen. */
export const BUSINESS_SIGN_IN_OPEN = isDev || process.env.NEXT_PUBLIC_BUSINESS_SIGN_IN_OPEN === "true";

/** Bank staff login (the admin portal). Closed in production. */
export const ADMIN_SIGN_IN_OPEN = isDev || process.env.NEXT_PUBLIC_ADMIN_SIGN_IN_OPEN === "true";

/** The bank's internal enrolment review portal (`/admin/enrolments`). Closed in production. */
export const ENROLMENT_PORTAL_OPEN = isDev || process.env.NEXT_PUBLIC_ENROLMENT_PORTAL_OPEN === "true";

/** Whether this person's kind of login is open. Retail is always open. */
export function signInOpenFor(actor: Actor): boolean {
  if (actor.shell === "admin") return ADMIN_SIGN_IN_OPEN;
  if (actor.role.startsWith("CORPORATE_") || actor.role === "SOLE_PROPRIETOR") return BUSINESS_SIGN_IN_OPEN;
  return true;
}
