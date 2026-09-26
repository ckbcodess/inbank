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

---

## 7. Internationalisation (EN / FR / ES / ZH)

- **Two layers, one toggle**:
  - `t(key, "English default")` from `useTranslation()` (keyed dictionary in `src/lib/i18n/translations.ts`) — used by the shell/dashboard from the first i18n pass.
  - **DOM translator** (`src/lib/i18n/dom-translator.ts`) — every other screen keeps its English copy inline; when FR/ES/ZH is active it swaps rendered text + `placeholder`/`aria-label`/`title`/`alt` using the phrase catalog (`src/lib/i18n/catalog/*.ts`, keyed by the exact English string, `{0}` placeholders may be reordered). Catalog is lazy-loaded only for non-English users.
- **Adding or changing copy**: write English as normal, then run `npx tsx scripts/i18n-coverage.mts` and add a `[en, fr, es, zh]` row to the matching catalog file for anything new. If you change an English string, its catalog key must change too or the screen silently falls back to English.
- **Keep sentences in one text run**: `<p>Sent {amount} to {name}.</p>` translates as one template (adjacent text nodes are joined). Splitting a sentence around an element (`<p>Sent <b>{amount}</b> to …</p>`) forces fragment-by-fragment translation, which reads badly in Mandarin — prefer a single run or a `t()` call with params.
- **Don’t `join(", ")` translatable labels**: a comma-joined list is one text node the catalog can never match. Render each label in its own `<span>` (commas between) so every name translates on its own.
- **Parameterised copy needs whole-sentence variants**: `` `We’ll email your ${kind} to ${email}` `` leaves the lowercase `kind` word untranslated. Write one English template per variant instead.
- **Customer data stays English**: names, merchants, bank names, addresses, references and amounts are deliberately not in the catalog. Wrap anything that must never be touched in `translate="no"` (also stops browser auto-translate).
- **Hydration gate**: the translator only rewrites elements React already owns (`__reactFiber$…` expando). Unhydrated streamed/Suspense markup is parked and retried — rewriting it earlier trips React's hydration text check.
- **No English flash**: an inline boot script in `app/layout.tsx` adds `html.i18n-pending` (body hidden) for saved non-English users until the first pass; 1.5s failsafe.
- **Money and dates**: amounts keep the Ghana format (`GHS 1,234.56`) in every language. Rendered dates like `23 Sep 2026` / `Sep 17, 2026` are re-formatted per locale by the translator.

## Back navigation (no loops)
- Every in-app back arrow goes through `useContextualBack` (or `PageHeader backTo` / `BackLink`, which use it). It calls `router.back()` when the previous history entry is a NIBS page (`canGoBackInApp()` from `@/lib/nav-history`), otherwise `router.replace(returnUrl ?? parent)`.
- Never implement Back as a pushed `<Link href="/parent">`: it leaves the child under the parent, and the parent's own Back bounces straight back — the ping-pong loop.
- Filters, tabs and periods that live in the URL must use `router.replace`, never `push`, so they are not Back steps.
- `window.history.length` is not a reliable "can go back" signal (it counts pre-app tab history); `nav-history.ts` stamps an in-app index on each entry instead.

### RevealingAmount / rolling-number clips digits under tight line-height (2026-09-24)
`@kitlangton/rolling-number` puts each digit in an `.rn-slot` that is exactly one line-height tall, with `overflow-y: clip` and a mask that fades the top and bottom `0.12em` (`--rn-edge-fade`). If the amount's `line-height` is smaller than its font size (`leading-none`, or `leading-8` on 36px text), the digits get clipped and faded, and it looks like a grey gradient on the number. Give any `RevealingAmount` a line-height of at least ~1.2 (`leading-[1.25]`). Motion blur is not the cause.

- **`mix-blend-mode` inside a `z-index` layer only blends within that layer.** Any element with a z-index (e.g. a `-z-10` decoration layer) is its own stacking context and an isolated blend group, so `multiply` / `color-burn` / `plus-lighter` children blend with transparent, not with the panel behind. Put the fill they should blend with *inside* the same layer (see `HeroArt` in `components/dashboard/v2/hero-parts.tsx`).
- **Banding in dark CSS gradients:** a low-alpha colour fading to transparent over near-black has only ~30 output levels, so it bands. What helps: opaque mid-grey noise with `mix-blend-mode: overlay` at ~15–30% opacity, which dithers without changing the average (`soft-light` noise is nearly invisible on dark), no `filter: blur()` on the gradient, and translate-only animation (no `scale`). The full fix is a WebGL shader that dithers per pixel.
- **Root font size is 14px, so rem-based Tailwind sizes aren't their nominal px.** `p-6` is 21px, `rounded-3xl` (`--radius × 2.2`) is 19.25px. For concentric corners, derive the outer radius from the same variables (`rounded-[calc(var(--radius)*2.2+var(--spacing)*6)]`), never a hard px guess. Note that `--radius-3xl` etc. live in `@theme inline` and aren't emitted as CSS variables; use `--radius` / `--spacing`.
- **Gradient / rim-lit borders: use a transparent CSS border and layered backgrounds, not a masked overlay ring.** For example, `background: linear-gradient(fill,fill) padding-box, <gradient> border-box` with `border: 1px solid transparent`. A `mask-composite: exclude` ring on top of a rounded element anti-aliases its curve separately from the element's own edge, which leaves a hard fringe at the corners.
- **View Transition theme fades: freeze element transitions for the duration.** `::view-transition-new(root)` is a *live* rendering, so any element with its own `transition-colors` keeps animating inside it at its own pace and flickers against the page fade (seen on the analytics card). `switchTheme()` adds `theme-switching` (`transition: none !important` on everything) until the transition finishes.
