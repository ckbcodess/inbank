# NIBS Codebase Learnings & Architectural Rules

> Actionable repository gotchas, framework version quirks, build constraints, and architectural invariants.

---

## 1. Framework & Tooling Quirks

- **Next.js 15.5 + Turbopack Execution**:
  - Always run development server with `npm run dev` (`next dev --turbopack`).
  - Next.js 15 uses asynchronous route params/searchParams in server components (`await params`).
  - `devIndicators: false` is deliberately configured in [`next.config.ts`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/next.config.ts) to prevent dev badges from polluting prototype UI captures and screen recordings.
- **Tailwind CSS v4 `@theme inline` System**:
  - This repo uses pure Tailwind CSS v4 via `@tailwindcss/postcss` and `@import "tailwindcss";`.
  - There is no `tailwind.config.js`. Theme tokens, surface scales, and OKLCH color mappings are defined directly in [`src/app/globals.css`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/src/app/globals.css).
- **HugeIcons Import Optimization**:
  - `@hugeicons/core-free-icons` is 73MB/16k files behind a 6MB barrel.
  - Configured in `experimental.optimizePackageImports` within [`next.config.ts`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/next.config.ts). Do not put hugeicons into `transpilePackages`.
- **Base UI Primitive Composition**:
  - Base UI (`@base-ui/react`) is used for primitives (e.g., `ButtonPrimitive`).
  - For link buttons, use `<Button nativeButton={false} render={<Link href="..." />}>` — do not wrap a `<Button>` inside Next.js `<Link>`.

---

## 2. State, Session & Hydration Gotchas

- **Zustand Session Hydration Race (`useSessionHydrated`)**:
  - Persisted Zustand state (`nibs-session` in localStorage) rehydrates asynchronously on the client.
  - **Gotcha**: A naive `useEffect(() => setMounted(true))` will fire while `actor` is still `null`, causing route guards to prematurely redirect logged-in users back to `/login`.
  - **Fix**: Always use `useSessionHydrated()` from [`src/lib/session-store.ts`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/src/lib/session-store.ts) to guard protected routes.
- **Single vs Multi-Relationship Login Flow (Section 12.4)**:
  - After MFA (S02), identities with exactly 1 banking relationship resolve immediately to that profile.
  - Identities with 2+ relationships are redirected to Profile Selection (`/profile-selection`).
  - Internal administrative staff have 0 customer profiles and never see the profile switcher.
- **Layout Shift Prevention (`scrollbar-gutter: stable`)**:
  - Toggling balances, expanding cards, or filtering lists changes document height. `html { scrollbar-gutter: stable; }` is active in `globals.css` to prevent layout jumps when vertical scrollbars appear.

---

## 3. Financial & Precision Invariants

- **Zero Floating-Point Drift in Currency**:
  - Standard JavaScript floating-point arithmetic (e.g., `0.1 + 0.2 = 0.30000000000000004`) is strictly forbidden.
  - **Rule**: Every monetary calculation must pass through [`src/lib/money.ts`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/src/lib/money.ts) using `roundMoney()`, `sumMoney()`, or `multiplyMoney()`.
  - `roundMoney()` adds `Number.EPSILON` before rounding to eliminate banker's-rounding-down artifacts.
- **Tabular Figures on Numeric Strings**:
  - Every monetary figure, rate, fee percentage, and reference identifier in JSX must have the `.tabular` class to ensure columnar alignment.

---

## 4. Architectural Boundaries & Shell Separation

- **Customer vs. Admin Shell Firewall (Section 12.1)**:
  - `customer` (`(customer)/...`) and `admin` (`admin/...`) are two strictly separated shells.
  - They share ONLY `/login` and `/mfa`.
  - **Do NOT** cross-import components between Customer and Admin directories.
  - `shell` is an immutable attribute of the `Actor` credential (`"customer" | "admin"`), never a runtime user toggle.
- **Dynamic Role-Based Navigation Matrix**:
  - Sidebar links must **never be hardcoded** in layout components.
  - All navigation is derived dynamically through [`src/lib/navigation.ts`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/src/lib/navigation.ts) (`NAV_ITEMS` and `ICON_MAP`).
- **Object Detail Routing (`backTo` Pattern)**:
  - Detail screens (e.g., `/cards/[id]`, `/accounts/[id]`) are nested under their list parent.
  - Detail screens must include `backTo={{ href: "...", label: "..." }}` in `<PageHeader>` and never appear as top-level sidebar items.

- **Mobile-Aligned Action Hubs (Send & Pay Pattern)**:
  - Hub navigation and action selection screens align directly with the native mobile app layout.
  - Action cards sit on top of the base container with dedicated `surface/on-card` fills (`#f6f6f5` light, `#1e1e1e` dark) and amber/gold badge highlights (`#fdc307`).
- **Strict Minimalism by Default (Anti-Fluff Invariant)**:
  - The product direction strictly demands the most minimal, straightforward design thinking.
  - Avoid redundant multi-line helper text, repetitive subtitles under self-explanatory card titles, and decorative borders. Let clear typography, whitespace, and clean surfaces carry the hierarchy.

---

## 5. Prototype Review & State Simulation Requirements

- **StateSwitcher on Every Screen**:
  - Every prototype screen must render `<StateSwitcher>` referencing its specification section (e.g. `section="13.1"`).
  - Screens must implement distinct mock views for `loaded`, `empty`, `filtered-empty`, `error`, and `loading`.
- **Pre-Commit Quality Gate**:
  - Before considering any screen or feature complete, verify that all three commands pass cleanly:
    1. `npx tsc --noEmit`
    2. `npx eslint . --max-warnings=0`
    3. `npx next build`
  - Verify that the screen renders seamlessly in both **Light** and **Dark** themes without any inline hex colors or raw tailwind color overrides.

---

## 6. Product Design & Holistic System Invariants

- **Dual-Journey Architecture (No Dead-End Selectors)**:
  - A banking application serves two concurrent user states: deliberate administrative preparation (visiting `/beneficiaries` to curate contacts and groups) and high-intent execution (sending money right now).
  - Never force an in-the-moment user out of a payment or transaction flow to perform setup. Always provide contextual creation (`+ Create new group`, `[x] Save as beneficiary`) that shares the underlying store with the primary management screen.
- **Holistic Feature Tracing**:
  - When introducing or refining any payment capability (e.g. Group disbursements, Airtime beneficiaries, Meter lookups), audit the entire application for parity. If one rail supports one-tap saved payees or in-flow creation, all applicable rails must offer equivalent affordances.
- **Zero Phantom Collections**:
  - Any multi-entity collection (e.g. Susu groups, split lists, batch payees) referenced in selection components must have full CRUD parity within the user's primary domain management space. Mock data must reflect real user entities rather than disconnected dummy options.
