/**
 * Launch switches. Local development (`npm run dev`) keeps everything open.
 * A production build keeps sign-in and the enrolment portal closed until the
 * env var is set to "true" on the host. Onboarding is never gated.
 */
const isDev = process.env.NODE_ENV !== "production";

/** Sign-in is closed in production: the login form ends on a work-in-progress screen and no session starts. */
export const SIGN_IN_OPEN = isDev || process.env.NEXT_PUBLIC_SIGN_IN_OPEN === "true";

/** The bank's internal enrolment review portal (`/admin/enrolments`). */
export const ENROLMENT_PORTAL_OPEN = isDev || process.env.NEXT_PUBLIC_ENROLMENT_PORTAL_OPEN === "true";
