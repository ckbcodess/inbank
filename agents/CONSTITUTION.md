# NIBS Constitution

Permanent rules for every screen, flow and line of code. These change rarely and only on purpose
(see the consolidation steps in [AGENTS.md](AGENTS.md)). This is not a changelog. How to build things is in
[PATTERNS.md](PATTERNS.md); what the product is lives in [PRODUCT.md](PRODUCT.md).

---

## 1. Product principles

### The three gates (from the fintech-ux lens)
Ask these for every surface. If any answer is "no", say it out loud in the reply. Don't bury it.
1. **In control?** Before committing, the person sees exactly what leaves their account, where it
   goes, what it costs and when it arrives. There is a way to cancel or undo, or at least "we'll tell
   you when it lands".
2. **Without judgment?** Empty, error, declined and insufficient-funds states inform rather than
   scold. Bad news always comes with a next step.
3. **Lighter?** Remove any step, field or confirmation that can go without losing safety. Regulation
   and fraud prevention earn their steps; "we might as well collect this" does not.

### Standing principles
- **Nothing sits between the person and their balance.** No interstitials and no promos above the
  fold on the dashboard. Hiding the balance is a privacy control the person owns, never a place for
  an upsell.
- **Value-adds never borrow a money screen.** Referrals and rewards live in Settings or in
  post-onboarding moments, never inside a payment or balance surface.
- **Honest status, honest data.** Ticks, "verified", "confirmed", badges and "updated daily" must
  reflect real state. Charts and totals are derived from the ledger, never hardcoded. If the data
  can't back a line, cut the line.
- **One source per fact.** A fee, a rate or an arrival promise comes from one table and reads the same
  everywhere it appears: picker, amount, review and receipt.
- **Trust prior choices.** Never re-ask on the next screen for something already chosen. Offer
  Back instead.
- **Resolve automatically, don't ask.** Never ask for what the system can look up (for example, the
  account name from the account number). Never show a manual field beside an auto-verified result.
- **Prevent errors rather than report them.** Filter invalid options out (the same currency in From
  and To, the source account in the destination list) so they can't be picked.
- **Two journeys, one store.** Every saved entity has a management hub, and can also be created
  inline in the middle of a flow. Both share one store; something created mid-flow is selected
  immediately and kept. Never show a dropdown of entities the person cannot create or manage
  (no phantom lists).
- **Recognition over recall.** Saved recipients and quick picks sit above manual entry. Picking one
  folds the manual steps into a verified summary.
- **"For myself" means all of mine.** Any self destination (wallet, number, account) lists every
  destination the customer owns, not only the registered default.
- **Warmth matches the moment.** A GHS 5 transfer gets a small tick, not confetti. Nothing
  celebratory appears on an unfunded account. Big, warm visuals are for real milestones only.
- **Stopping is never harder than starting.** Pausing or cancelling something must not need more
  friction than setting it up did.
- **Explain finance terms where they appear.** Tenor, coupon, rediscount, APR, premium, PAPSS and
  similar get a short in-place explanation. Never a link to a glossary.
- **Rules for the coming hubs** (Invest, Loans):
  - Breaking an investment early shows the penalty and the exact net payout *before* the confirm.
    State them as facts, not warnings, and make breaking it no harder than opening it was.
  - A loan decline names the reason and a way back.
  - Never surface a loan offer at the moment a balance hits zero.

## 2. Money movement

- **Every payment is authorised.** This covers immediate, scheduled and repeating payments, and
  standing orders. The transaction PIN is the default; a one-time SMS code is the alternative.
  The gate is shared (`useAuthorisation`), so a new rail can't skip it.
- **The payment is restated above the PIN or code boxes:** amount, payee, and the account it leaves
  from. A bare "enter your code" screen is what makes codes easy to phish.
- **A payment code never auto-submits.** Sign-in may verify on the last digit because sign-in is
  recoverable; a payment is not. Going back discards the entered code.
- **The recipient resolves before the amount is asked.** Proxy IDs, account numbers and wallets show
  the resolved name first. Paying the wrong person can't be undone.
- **Cross-border payments state what they cost:** the recipient's local amount, the rate applied
  and the total GHS debit. All three carry through to the receipt.
- **No silent default on a destination** (bank, recipient or account). When a parent choice changes
  (for example the country), clear whatever depended on it.
- **Every amount respects the hide-amounts setting** and carries `.tabular`.

## 3. Visual language: calm and minimal (the house default)

Reference points are Wealthsimple and Origin: quiet, spacious, numbers first. Every new screen starts
here. Never fall back to dense, boxed layouts.

- **Space is the main material.** Generous padding and gaps carry the hierarchy. Don't fill white space.
- **Separate with whitespace first, a hairline second, a box last.** Never put a card inside a card.
  Lists separate rows with whitespace and a rounded hover inset. Tables keep hairline dividers.
- **One loud thing per screen:** the number. The primary figure is large, thin and `.tabular`.
  Everything else stays quiet.
- **Let the data speak.** If a value's format already says what it is (`1 USD = 11.42 GHS`), drop the
  label. If plain typography works, drop the container.
- **Show the summary first, details on request.** Put above the fold the one question the screen
  answers, plus anything that needs action. Secondary detail sits in collapsed sections. Each module
  appears once per screen.
- **No AI decoration:** no glow blobs, radial blurs or backdrop gradients for "interest". No preset
  amount chips unless asked for. No grids of secondary-stat tiles. No badges that state the obvious
  ("Live", "Active", "Today's fixing"). No tile whose only job is to fill a grid cell. No subtitle
  under a title that already explains itself.
- **Fill the container.** Functional components stretch to `w-full` and line up with their siblings.
  Narrow `max-w-*` is only for deliberate single-column pages (detail pages, flows, auth, modals).
- **Comfortable hit targets.** Icon-only controls are at least 40px (`size-10`). Connected inputs get
  clear vertical separation.

## 4. Colour

- **Semantic tokens only.** No hex values and no Tailwind palette colours (`text-blue-500`,
  `bg-gray-100`) in components. Use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`,
  `text-destructive`, `var(--active-bg)` / `var(--active-border)`, `var(--surface)`, and the
  surface tokens `--tile`, `--tile-hover`, `--tile-border`, `--tile-accent`, `--hero-*` and
  `--account-card` (as `bg-[var(--tile)]`), and for the rest: `bg-tile`, `bg-field` / `border-field-border` for inputs,
  `bg-menu` for dropdowns, and `text-success-text` / `-warning-text` / `-destructive-text` / `-info-text` for status text
  (`success`, `warning`, `destructive`, `info` for fills). If a colour is missing, add a token to `globals.css` for
  **both** themes. Never hardcode it, and never use Tailwind palette colours (`text-emerald-600`).
- **Light and dark come from the tokens.** No `dark:` workarounds where a token would do.
- **Primary is GCB amber** (`#F9C632`, hover `#E5B62E`) with dark text on top.
- **Amber is never text on a light surface,** because it fails contrast. Use amber for filled
  buttons and badges (with dark text), icon accents (`--tile-accent`, duotone fills) and dark-mode
  accents. Text links use `text-foreground` with an underline, or `text-muted-foreground` turning to
  `hover:text-foreground`.
- **Status colour:** success uses `--success`. A decline or downward trend uses
  `text-muted-foreground`, never `destructive`. Destructive is only for real errors and destructive
  actions. Items that need attention (such as failed payments) use amber, not red.
- **Categorical data** uses `--cat-1` to `--cat-5` plus `--cat-other`. Never reorder them or go past
  five (the sixth and later fold into Other). Colour is never the only carrier of meaning.
- **Category colours stay put when the period changes.** Assign each category's colour and position
  from the longest window, so switching periods never reshuffles them.
- **Comparisons with a previous period are neutral.** Write "GHS X less than the previous 30 days",
  never in red or green.
- **Selected options and cards** use `border-[var(--active-border)] bg-[var(--active-bg)]`.
  Unselected ones use `border-border bg-card hover:bg-muted/50`.

## 5. Typography

- **Open Sans everywhere** (`--font-sans`; `--font-mono` is an alias for it). There are no monospace
  faces.
- **Two weights.** Regular (400) for body text and numbers. Medium (`font-medium`, 500) for headings,
  section titles, form labels and buttons. **Semibold and bold are banned.** `globals.css` resets
  text elements to `font-weight: inherit`; `font-medium` overrides that on purpose.
- **The root font size is 14px,** so rem-based utilities are smaller than their nominal px
  (`p-6` is 21px).
- **All numbers carry `.tabular`:** money, dates, account numbers, references, percentages and rates.
- **Casing:**
  - Never all caps or letter-spaced labels. Older `uppercase` uses get converted when a file is touched.
  - Questions, descriptions, helper text and micro-labels are sentence case.
  - Option labels, tile labels and non-question headers are Title Case.

| Use | Classes |
|---|---|
| Page title (via `PageHeader`) | `text-[18px] sm:text-[20px] lg:text-[22px] font-medium tracking-[-0.02em]` |
| Hero figure | `text-[40px]`–`[76px]`, `tracking-[-0.02em]`, regular, `.tabular` |
| Section / panel heading | `text-[16px] font-medium` (14px under `sm` where space is tight) |
| Row primary text | `text-[14px] text-foreground` |
| Body, table cells, inputs | `text-[13px] text-foreground` |
| Meta, captions, micro-labels | `text-[12px] text-muted-foreground`, sentence case |
| Form labels | `text-foreground` (never muted) |
| Long-form paragraphs | add `leading-relaxed` |

## 6. Shape and spacing

- **Radius:** panels `rounded-2xl`, insets `rounded-xl`, controls and icon tiles `rounded-lg`, badges
  and pills `rounded-full`. Never `rounded-md` on a panel. For concentric corners, derive the outer
  radius from the variables: `rounded-[calc(var(--radius)*2.2+var(--spacing)*N)]`.
- **Page rhythm:** the page root is `flex flex-col gap-5`. Between sections on a calm page use
  `gap-10`. Each section has a 16px medium heading row (`min-h-8`) and `gap-4` down to its content.
- **Phone (below `sm`):** a 16px gutter, panels `p-4 gap-3` (going to `sm:p-6 sm:gap-6`) and page
  top padding `pt-6`. See *Phone scale* in PATTERNS.md.

## 7. Icons

- **Lucide only,** at `size={15}` to `{18}` with `strokeWidth={1.7}` to `{1.9}`. Never use the
  default stroke weight. Navigation chevrons may go up to 20–22px.
- **Deliberate exceptions:** the Send & Pay hub's duotone icons (`components/ui/duotone-icons.tsx`),
  network and bank logos, and country flags (`public/flags/`). Don't add new exceptions without the
  designer.

## 8. Motion

- **Animate the data, not decoration.** Live thousands-formatting while typing, morphing digits,
  tabular numbers. No ornamental loops.
- **Use the tokens, never raw numbers.** Pick by purpose:
  - `press` (100ms): feedback while a finger or cursor is down
  - `hover` (150ms): hover and small state changes
  - `reveal` (250ms): something appearing or disappearing in place
  - `move` (500ms): a larger thing travelling or turning
  - `entrance` (900ms): a value settling in after the page loads

  In CSS these are `duration-*` with `ease-settle`. In JS use `DURATION`, `EASE` and `SPRING` from
  `@/lib/motion`. No `duration-[…]`, no handwritten `cubic-bezier`, no inline spring settings. If a
  purpose is missing, add the token in `globals.css` and `motion.ts` together.
- **Reduced motion is handled once,** globally (`globals.css` plus `MotionProvider`). Never add
  per-component reduced-motion code.

## 9. Interaction

- **Permissions hide, they don't disable.** If a role can't use something, it isn't in the DOM.
- **A control disabled because of state says why,** directly below it in
  `text-[12px] text-muted-foreground`. Never grey something out without a reason.
- **Validation is inline,** under the field, with `aria-invalid`. Never in a modal.
- **Alerts and confirmations are toasts** (Sonner, or `AlertToast`). Never draw an inline banner.
  The exception is errors about what the person just typed (a field, a code, a PIN): those sit inline
  under the input (`InlineError`), with a shake on a wrong PIN.
- **Busy state lives on the button** (`<Button loading>`). Keep `disabled` for validity only.
  **Loading is a skeleton,** never a bare spinner.
- **Destructive and recoverable actions look different.** "Reject" and "Return for clarification"
  never share a style.
- **A confirmation states its consequence** (including the audit trail) before the commit button.
- **Back returns to where the person came from** (`useContextualBack`), never a hardcoded parent.
- **Forms reveal themselves step by step** (see PATTERNS.md). Never render every field at once.
- **Never put two controls that do the same thing on one screen.**

## 10. Engineering invariants

- **Two firewalled shells.** `(customer)` and `admin` share only `/login` and `/mfa`. Never
  cross-import between them. `shell` is fixed on the actor credential, never a runtime toggle.
- **Personal and Business are separate views, chosen before sign-in.** No business control ever
  appears on a personal screen.
- **Navigation is data.** Add items in `getNavigation()` in `src/lib/navigation.ts`, and add the icon to
  `ICON_MAP` in `components/layout/Sidebar.tsx`. Never hardcode links in a layout. Object-detail routes sit under their list parent, carry
  `PageHeader backTo` and never appear in the nav.
- **Money math is float-safe.** Never use raw `+` or `*` on money. Use `roundMoney`, `sumMoney` and
  `multiplyMoney` from `@/lib/money`.
- **Wait for session hydration.** Call `useSessionHydrated()` before treating `actor === null` as
  signed out.
- **Navigating buttons** use `<Button nativeButton={false} render={<Link href="…" />}>`. Never wrap a
  `Button` in a `Link`.
- **Every route segment has a `loading.tsx`** that renders a content-shaped skeleton.
- **Every new customer-facing string gets FR, ES and ZH catalog rows** (run the coverage script).
  Customer data (names, merchants, banks, references, amounts) is never translated.
- **Prototype scaffolding** (the Demo hub, studios, tuners) sits behind `SHOW_DEMO_TOOLS` and never
  reaches a production build.
- **Theme changes** go through `toggleTheme` / `switchTheme` from `@/lib/theme-transition`.
- **Quality bar:** `tsc` clean and eslint at zero warnings. A screen is correct in light and dark
  with no theme-specific code.
