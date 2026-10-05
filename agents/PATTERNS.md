# NIBS patterns

Reusable solutions, so the same problem is never solved two different ways. Before building, find the
pattern and open its reference code. If none fits, build the smallest new thing that does. Once it has
been used twice, propose it here through WORKING_LOG (`Candidate pattern`).

The rules these patterns sit on are in [CONSTITUTION.md](CONSTITUTION.md). Patterns show how those
rules are applied; they don't restate them.

Each pattern has the same fields: **When** · **Structure** · **Behavior** · **Do / Don't** · **Examples**.

---

## Screens

### 1. Page skeleton and route loading
- **When:** every customer and admin page.
- **Structure:**
  ```tsx
  <div className="flex flex-col gap-5">
    <PageHeader title="…" actions={…} backTo={/* detail pages only */} />
    <StateSwitcher … />          {/* prototype review affordance where the page has dev states */}
    {/* content: calm sections, or one rounded-2xl panel */}
  </div>
  ```
  Every route segment has a `loading.tsx` that renders one of the skeletons in
  `@/components/states/PageSkeletons`:
  - `ListPageSkeleton` (the default)
  - `HubPageSkeleton`
  - `DetailPageSkeleton`
  - `FormPageSkeleton`
  - `DashboardSkeleton`
- **Behavior:**
  - The shell stays put and only the content area swaps.
  - Skeletons copy the page's real structure, so nothing jumps when content arrives.
  - They pulse (stopped under reduced motion) and contain one sr-only "Loading".
- **Do:** give a new route that has its own layout its own `loading.tsx`.
- **Don't:**
  - leave a blank area while loading
  - use a spinner in place of a skeleton
  - add a description under a title that already explains itself
- **Examples:** `src/app/(customer)/**/loading.tsx`, `components/layout/PageHeader.tsx`.

### 2. List page
- **When:** a collection of objects (accounts, cards, transactions, beneficiaries, standing orders,
  approvals).
- **Structure:**
  - Sections: a 16px medium heading row, then `gap-4`, then the list.
  - The list sits in one `rounded-2xl` container with `p-2`.
  - Each row is the whole-row link: icon tile, then a flexible column (`min-w-0 truncate`) with the
    primary text at 14px over the meta at 12px muted, then a fixed column on the right (`shrink-0`,
    `.tabular`), then a chevron.
- **Behavior:**
  - Rows are separated by whitespace, with a rounded hover inset (`hover:bg-muted/50`). No dividers.
  - Every list handles **5 states** from `@/components/states/ListStates`:
    - `ListSkeleton`
    - `TrueEmptyState`: says what will appear here and offers a primary action
    - `FilteredEmptyState`: different copy and **always a reset action**
    - `ListErrorState`: retry, and reassurance that their money is unaffected
    - `PartialLoadFooter`
- **Do:**
  - Use `TileChip tone="onCard"` for icons on white lists.
  - Leave out search and filters when a list holds only a handful of items (for example 1–3 accounts).
- **Don't:**
  - show balances on the Accounts or Cards lists
  - reuse the true-empty copy for the filtered-empty state
  - nest a button inside a row link
  - fall back silently to empty on an error
- **Examples:** `accounts/page.tsx`, `transactions` (one list at every width, no table),
  `payments/standing`.

### 3. Data table
- **When:** the admin portal and genuinely tabular data. Customer lists use pattern 2.
- **Structure:** `overflow-x-auto` around `table.w-full.min-w-[720px].text-[13px]`; muted
  `th.font-normal`; `tbody.divide-y` with rows `hover:bg-muted/50`; cells `px-4 py-3.5`.
- **Don't:** use `font-medium` on a header (muted colour carries it), or let the page scroll sideways.
- **Examples:** `admin/fee-concessions/page.tsx`.

### 4. Search and filter toolbar
- **Structure:** `flex flex-wrap items-center gap-3 border-b border-border px-4 py-3`.
  - The search input has a 15px Lucide `Search` icon inside, `pl-9`, and an `aria-label`.
  - Filter chips are `<Button variant={active ? "secondary" : "ghost"} size="sm">`.
- **Behavior:** filters, tabs and periods live in the URL and update with `router.replace`, never
  `push`, so they don't become Back steps.

### 5. Detail page
- **When:** one object (a standing order, card, account, transaction).
- **Structure, top to bottom:**
  1. the name, or short name, as the title
  2. a small purpose line
  3. the amount, with its cadence underneath
  4. a short facts panel of label/value rows separated by whitespace
  5. the actions
- **Behavior:**
  - Each fact appears once.
  - A special state replaces the cadence line (for example "Paused. Nothing will be paid until you
    resume.").
  - A destructive action (Cancel) is filled red; a recoverable one (Pause) is outline.
  - The single-column width is set per page: 440px for cards, 560px for accounts.
- **Don't:** write a sentence that repeats a panel row, or add tabs that hide the money actions.
- **Examples:** `payments/standing/[id]`, `accounts/[id]/page.tsx`, `cards/VirtualCardDetailsView.tsx`.

### 6. Dashboard: glance first, detail on demand
- **Structure:**
  - Above the fold sit the balance (the one loud number) and the **Needs attention** band.
  - Secondary breakdowns go in collapsed disclosures with a hairline teaser, such as an allocation bar.
- **Behavior:**
  - Needs attention only renders when real items exist (failed payments, expiring or blocked cards,
    dormant accounts, bills due). It holds about 4, and each row links to the fix.
  - Everything follows the selected account (`?account=`).
- **Do:**
  - Reuse `components/dashboard/v2/MinimalKit.tsx` (`BalanceHeadline`, `TrendChart`, `SectionHeader`,
    `Panel`, `AccountsDisclosure`, `AttentionBand`, `AllocationBar`) and `v2/parts.tsx`.
  - Derive the data from the ledger (`src/lib/dashboard-insights.ts`, `src/lib/insights.ts`).
- **Don't:** add count tiles ("5 accounts"), show a module twice, or use a hardcoded chart.
- **Examples:** the default layout is **Hero split** (`DEFAULT_DASHBOARD_LAYOUT`); see also
  `/overview`. The FX modal is the reference for calm: a muted label over one big number, a
  plain table, and the source as one footer line.

### 7. Phone scale (below `sm`, roughly 360–430px)
- The balance is the loudest thing on the screen.
  - The currency code sits at `0.6em`.
  - A seven-figure balance must fit on one line at 360px.
  - The greeting drops to 20px.
- Actions sit **under** the balance as an equal-column row (`MoneyActions variant="row"`), never as
  pills wrapping beside the greeting.
- Small stats group into one panel of rows rather than separate boxed tiles.
- Hub tiles stay two per row (`ActionTile compactOnMobile`): the label may wrap to two lines and the
  chevron is hidden.
- Hide anything that only works on a desktop (for example the app-download QR code).
- Header links get a taller hit area (`-my-2 py-2`).

## Flows and forms

### 8. Action hub and tiles
- **When:** choosing between destinations or actions (the Send & Pay hub, Account Details rows,
  request choosers).
- **Structure:**
  - `ActionTile` (`components/ui/action-tile.tsx`): the tile surface (`--tile`), a white chip, a 16px
    label, an optional second line, and a chevron. It renders a link when given `href`, otherwise a
    button.
  - Grids are `grid-cols-2 gap-4` (`gap-3` on phones).
  - `ToggleTile` has the same layout with a switch.
- **Behavior:**
  - Add a second line only where the name doesn't explain itself (Proxy, Group, PAPSS, GCB Pay,
    Cardless).
  - Recognition marks (network logos, the GCB eagle) sit before the chevron.
  - The Send & Pay hub uses duotone icons (`bareIcon`) as its one documented exception.
- **Don't:** hand-copy tile markup (17 copies were removed), or use an amber hover (tried, then
  reverted).
- **Examples:** `/payments`, `accounts/[id]`, `RequestFlow` chooser.

### 9. Chooser step
- **When:** a flow branches before any data is entered (which bank, which wallet, who it's for).
- **Structure:**
  - The header is a single question ("Which wallet do you want to send to?"), not a title plus a
    question.
  - The options are Title Case tiles. Self/other pairs read *Send to Myself / Send to Others*.
- **Behavior:**
  - A saved recipient picked from the quick-pick strip skips the chooser.
  - Back returns to the chooser.
  - The dashboard `MoneyActionPicker` drills into the choice and then deep-links (`?rail=`,
    `?category=`, `?from=`), so the flow never asks again. It shows at most 4 options, most used
    first, plus one "more" link.
- **Examples:** the Proxy, Group, Airtime and Internet choosers in `PaymentFlow`;
  `src/lib/payment-options.ts`.

### 10. Progressive-disclosure form (the Send & Pay pattern; every new form uses it)
- **When:** any form at all: transfers, beneficiaries, onboarding, settings, requests.
- **Behavior:**
  1. **One block at a time.** The next block fades in (`animate-in fade-in slide-in-from-top-2`) once
     the previous one is valid. A field that depends on a choice appears after that choice.
  2. **Finished blocks collapse** into `CollapsedDetailsBadge` with **Change** when the person moves
     on (for example, on focusing the amount).
  3. **Optional fields sit behind one text link** ("Add email or contact number"). If a value already
     exists, they stay open.
  4. **The amount comes after a valid recipient.** Charges, narration, category and schedule come
     after the amount. **Proceed** is always last and stays disabled until the form is valid.
  5. A choice that changes which fields apply hides the fields that no longer do.
  6. There is no silent default on a destination. A change of parent clears whatever depended on it.
- **Do:** use the shared pieces in `components/payments/flows/shared.tsx`:
  - `CollapsedDetailsBadge`
  - `ProceedButton`
  - `AmountInput`
  - `NarrationInput`
  - `FromAccountSelector`
  - `NetworkSelect`
  - `BankSelect`
  - `PaymentMethodSelect`

  Outside payments, use these shared controls:
  - `PhoneInput` (`ui/phone-input.tsx`) for every Ghana mobile field. The exception is a field that
    accepts either a phone or an account number.
  - `BranchCombobox`
  - `DeliveryModeFields` (branch pickup or doorstep delivery)
  - `CountryPicker`
  - `NewPasswordFields` (with `PASSWORD_RULES`)
  - `OtpInput`
  - `SelfieCapture`
- **Don't:** render every field at once (the Outside Ghana form showed 12 and had to be reworked).
- **Examples:** `InternationalWireFlow`, `WalletToBankFlow`, `OtherBankFlow`, standing-order creation.

### 11. Money-movement flow chassis
- **When:** anything that moves money or commits future money.
- **Structure:**
  - entry (chooser and progressive form)
  - **review**: a label/value panel with one line per row
  - **authorise** (pattern 12)
  - **outcome**: success, pending or failure
- **Behavior:**
  - Fees and arrival times come from `RAIL_FACTS`.
  - Foreign rails (`papss`, `swift`) share the foreign-currency handling.
  - Insufficient funds shows as a toast (`InsufficientFundsAlert`).
  - "Proceed to Pay" spins while the payment settles; there is no full-screen processing view.
- **Examples:** `components/payments/PaymentFlow.tsx`, `StandingOrderFlow.tsx`, `RequestFlow.tsx`.

### 12. Authorisation gate
- **Structure:**
  - The PIN is the default. "Request OTP via SMS instead" switches to a 6-digit code.
  - Under the code boxes, `OtpHelp` shows "Resend in 23s · Use a shortcode" (USSD `OTP_SHORTCODE`).
  - A summary of the payment always sits above the boxes (`AuthorisePanel`'s `summary` prop is
    required).
- **Behavior:**
  - A payment code doesn't auto-submit.
  - A wrong code or PIN clears the boxes, refocuses the first box and shows an `InlineError`
    underneath.
  - `000000` and `0000` trigger the demo errors.
- **Examples:** `useAuthorisation.ts`, `AuthorisePanel.tsx`, `TransactionPinModal.tsx`.

### 13. Quick pick and in-flow creation
- **Structure:**
  - Saved recipients or groups sit in a top strip (`RailBeneficiaryStrip`, with a CSS-mask fade
    on whichever side can still scroll).
  - Below it, a muted "Or enter new details" leads into manual entry.
  - Selectors offer `+ Create new …` inline, and the receipt offers "Save as beneficiary".
- **Behavior:**
  - Picking an item fills everything known, collapses the step into a verified badge, and moves focus
    to the amount.
  - Anything created inline goes into **the same store the management hub uses**
    (`groups-store`, `proxy-store`, `accounts-store`) and is selected immediately.
- **Don't:** squeeze avatars into the middle of a form, or keep a second list local to the page.
- **Examples:** the Group rail with `/beneficiaries?tab=groups`, `CreateGroupFlow`, `ProxyIdModal`.

### 14. "For myself" destinations
- **Behavior:**
  - Self options list the registered wallet or number **plus** every linked source
    (`useOwnDestination`, `OwnWalletPicker`).
  - "Link another…" opens the shared `LinkSourceAccountModal` (`mode="link"`) and selects what gets
    linked.
  - If a source is unlinked mid-flow, the flow falls back to the registered one and says so.
- **Deliberate exception:** a cardless "for self" code goes only to the registered number, because
  that is the security control.
- **Examples:** the wallet, airtime and internet "for myself" options; standing-order quick picks.

### 15. Linking a source of funds
- **MoMo:** a number → "Approve on your phone" pending screen → *I've approved it* → saved. Resend
  works once.
- **Card:** number, expiry and CVV, each formatted as typed (no cardholder name) → a 3-D Secure stand-in
  at `/card-verification` → the result comes back through `useCardLinkReturn()`.
- After funding or linking, `SaveSourcePrompt` asks "Save this wallet?" with *Not now / Save*.
- **Examples:** `LinkSourceAccountModal`, `src/lib/card-link.ts`, `QuickFundFlow`.

## Feedback and dialogs

### 16. Feedback
| Situation | Pattern |
|---|---|
| A system alert, success, or confirmation | Sonner `toast.*`, or `<AlertToast when message />`. A fixed id means repeats replace each other instead of stacking |
| An action that can be undone (Block, Remove) | A toast with **Undo** |
| A wrong value just typed in a field, code or PIN | `InlineError` or a field error underneath; a shake for a wrong PIN or password |
| A busy button | `<Button loading={busy}>Label</Button>`. Keep the label as a child (it holds the width) |
| Something disabled because of its state | One muted line of reason underneath |

### 17. Confirmation and compliance dialogs
- **Ordinary confirmation:**
  - The title names the thing ("Remove MTN MoMo?").
  - The body says what stops working.
  - The buttons are Cancel and a destructive confirm.
- **Compliance action** (suspend, deactivate, role change, trade cancellation): confirmation → a
  required reason → step-up MFA if needed → the change takes effect immediately → an immutable audit
  entry. Build it **once** and share it (`ComplianceActionDialog`).
- **Never gate stopping.** Pausing or cancelling a standing order needs no code.

### 18. Success and receipt
- **Structure:** `PaymentSuccessScreen` shows a proportionate tick, the amount, the receipt rows
  (including "Authorised"), and optional action cards (Save as beneficiary, Schedule, View receipt,
  Share feedback). Use `hideSchedule` straight after creating a schedule.
- **Tone:**
  - Relief, in proportion to the amount.
  - An empty state is an invitation, never a scolding.
  - An error reassures that nothing happened to their money.
- **Candidate:** a shared `SuccessState` pulled out of `PaymentSuccessScreen` (see WORKING_LOG).

### 19. Illustrated states
- Customer shell only, full-page or panel-sized states only. The admin portal and small in-card
  empties keep a plain icon. Toasts are never illustrated.
- **One illustration per situation, not per screen.** `no-results` and `load-error` are shared
  everywhere.
- Register each one as `<StateIllustration id="…" />` through `src/lib/state-illustrations.ts`. A
  screen keeps its icon until that id is set to `drawn: true`.
- The art spec (canvas sizes, safe area, light and dark, tone, the shared object kit) and the full
  inventory are in `docs/STATES.md`.

### 20. Back navigation
- Every in-app back arrow goes through `useContextualBack(parent)`, or through `PageHeader backTo` or
  `BackLink`, which use it.
  - It calls `router.back()` when the previous history entry is a NIBS page (`canGoBackInApp()`).
  - Otherwise it calls `router.replace(returnUrl ?? parent)`.
- **Don't:**
  - implement Back as a pushed `<Link href="/parent">`: it causes a ping-pong loop
  - leave a flow with `router.push(parent)`
  - trust `window.history.length`

## Prototype and copy

### 21. Dev Mode, demo tools and design explorations
- Page states (loaded, empty, filtered-empty, error, loading) and customer scenarios are switched
  from Dev Mode (`DevStateData`, with grouped options through `DevStateMenuItems`). Every new list or
  page wires its states there.
- When there are several design directions, ship them side by side behind a Dev Mode switch, persisted
  per browser (`nibs-*` keys). Once one is picked, **delete the others**; track the cleanup in
  WORKING_LOG.
- All scaffolding (the Demo hub, studios, tuners, state switchers) sits behind `SHOW_DEMO_TOOLS`.
- Tuner tools write settings to localStorage. Bake the chosen values into the code defaults
  (`HERO_WAVE_DEFAULTS`, `DEFAULT_EAGLE`) when they're final.

### 22. Copy and i18n
- Write English inline. Then run `npx tsx scripts/i18n-coverage.mts` and add a `[en, fr, es, zh]`
  row to the matching file in `src/lib/i18n/catalog/`. Changing an English string changes its key.
- **Keep a sentence in one text run.** `<p>Sent {amount} to {name}.</p>` works; splitting it around
  `<b>` doesn't.
- Never use `join(", ")` on translatable labels; give each label its own span.
- Write one full sentence per variant rather than splicing a word into a template.
- Wrap anything that must never be translated in `translate="no"`.
- `t(key, default)` calls are not checked by the coverage script, so check them yourself.
- Use real copy and realistic Ghanaian data: GHS amounts, local names, MoMo networks, real biller
  names. Never lorem ipsum or `[placeholder]`.
- Writing style:
  - Plain and short.
  - Questions as chooser headers.
  - Name the mechanism and the next step on bad news.
  - "Block", never "Freeze"; "Internet", not "Data Bundle"; "Proceed" on onboarding steps.

## Engineering notes (each one has already caused a bug)

- **Next.js 15:** route `params` and `searchParams` are async (`await params`). `devIndicators: false`
  is deliberate, to keep screen captures clean.
- **Tailwind v4:** there is no `tailwind.config`; tokens live in `globals.css` under `@theme inline`.
  `--radius-3xl` and similar aren't emitted as CSS variables, so derive values from `--radius` and
  `--spacing`.
- **HugeIcons** goes in `experimental.optimizePackageImports`, never in `transpilePackages`. The barrel
  is 73MB.
- **StrictMode runs effects twice.** Don't read-and-clear storage in a mount effect. Peek on mount and
  clear on dismiss (see `FirstRunWelcome`).
- **Hydration:**
  - Read localStorage-backed state after mount, so the server and client markup match.
  - `useSyncExternalStore` stores use their defaults on the server.
- **Persisted mock data** is per browser (`nibs-standing-orders` and others). Seed changes don't reach
  a browser that already holds a saved copy until it is reset.
- **`RevealingAmount` / rolling numbers:**
  - Use them for first-render reveals only. A changing value can freeze on a garbage frame; use
    `formatMoney` for amounts that change.
  - Give them a line-height of at least ~1.2, or the digits get clipped.
- **`next/image`** lazy-loads even when the file is cached. Anything above the fold that a splash
  waits on needs `priority`.
- **`mix-blend-mode`** only blends inside its own stacking context. Put the layer it blends with
  inside the same z-index layer.
- **Dark gradients band.** Use opaque noise with an `overlay` blend at 15–30%, no `filter: blur()`, and
  animations that only translate.
- **Gradient borders:** a transparent border plus layered `padding-box` / `border-box` backgrounds.
  Never a masked overlay ring, which leaves a fringe at the corners.
- **Theme switching:**
  - The class on `<html>` is the truth.
  - Never decide the next theme from `resolvedTheme` or local state.
  - During a view transition, `theme-switching` freezes element transitions.
- **Base UI `Checkbox` inside a `<label>`** gets no accessible name. Pass `aria-label`.
- **A retail profile's `name` is the relationship** ("Personal Banking"), not a person. Use
  `accountHolderName()` (`src/lib/account-holder.ts`): it gives every holder for a joint account, the
  business name for a business, and the signed-in customer for retail.
- **`scrollbar-gutter: stable`** on `html` stops layout jumps when content height changes.
- **CSS variables don't work in SVG `fill` attributes.** Use a class, such as `.duo-fill`.
- **`npx tsc` can report stale `.next/types` routes** after a route is deleted. Ignore them.
