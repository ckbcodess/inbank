# Illustrated States — Inventory & Plan

> Source of truth for which empty / success / error states get an illustration, in what order, and what is still plain. Generated from a scan of the code on **2026-09-29**; re-run the counts (bottom of file) before trusting them after big changes. Update the **Status** column as pieces ship.

## The number

| Scanned in code | Count |
|---|---|
| `TrueEmptyState` usages | 20 (16 customer shell, 4 admin) |
| `FilteredEmptyState` usages | 15 (11 customer, 4 admin) |
| `ListErrorState` usages | 14 (12 customer, 2 admin) |
| Dedicated success screens | ~14 files (payments, cards, accounts, signup, resets, approvals) |
| Dialog / sheet files | 34, of which ~10 are real moments (the rest are forms and confirmations) |
| `toast.success` calls | ~40 (never illustrated) |
| **Distinct illustrations needed** | **27** (0 drawn; the Cards empty state is CSS placeholder art) |

The screens collapse because many share one situation: e.g. `TransactionList` is one component behind the dashboard, transactions page and account detail, so one "activity" illustration covers all of them.

## Rules for what gets a picture

1. **Customer shell, full-page or panel-sized states only.** The admin shell (`src/app/admin/*`) and small in-card empties keep the plain icon. That is 10 states removed from scope.
2. **Toasts are never illustrated.** Only full success screens.
3. **One illustration per *situation*, not per screen.** Filtered/no-results is one picture everywhere.
4. **Build from the kit.** Shared objects (card, coin/wallet, document, person, check-badge, calendar, chart bars), one style, recombined into scenes. The Cards empty state (`CardsEmptyIllustration.tsx`) is the reference for style: flat colour blocks, one dark accent badge.
5. **Register every one** as `<StateIllustration name="…" />` (not built yet) so coverage is countable.

## A. First-time empty — one illustration per domain object (9)

| ID | Situation | Where it appears | Tier | Status |
|---|---|---|---|---|
| `empty-cards` | No cards yet | `cards/page.tsx` | 2 | **Done** (CSS, `CardsEmptyIllustration`) |
| `empty-activity` | No transactions / activity | `components/TransactionList.tsx` (dashboard, transactions, account detail), `accounts/[id]/page.tsx`, `cards/[id]/page.tsx` | 2 | Plain icon |
| `empty-people` | No people / billers saved | `beneficiaries/page.tsx` (people + billers tabs) | 2 | Plain icon |
| `empty-groups` | No payment groups | `beneficiaries/page.tsx` (groups tab) | 3 | Plain icon |
| `empty-standing` | No standing orders | `payments/standing/page.tsx` | 3 | Plain icon |
| `empty-sources` | No cards or wallets linked | `accounts/page.tsx` | 2 | Plain icon |
| `empty-statements` | No statements available | `accounts/[id]/statement/page.tsx` | 3 | Plain icon |
| `empty-rates` | No FX rates published today | `fx-rates/page.tsx` | 3 | Plain icon |
| `empty-chart` | No spend in this period / no activity in period | `components/accounts/AccountExpenses.tsx`, `reports/page.tsx` | 3 | Plain icon |

## B. Shared situations (3)

| ID | Situation | Where it appears | Tier | Status |
|---|---|---|---|---|
| `caught-up` | Nothing waiting on you / nothing to catch up on | `approvals/page.tsx`, `notifications/page.tsx` | 1 | Plain icon |
| `no-results` | Filter or search matched nothing | all 11 customer `FilteredEmptyState` usages, incl. `locate-us` search | 1 | Plain icon (no illustration slot yet) |
| `load-error` | Couldn't load, retry | all 12 customer `ListErrorState` usages | 1 | Plain icon |

## C. Success screens (7)

| ID | Situation | Where it appears (verify variants) | Tier | Status |
|---|---|---|---|---|
| `success-sent` | Money sent / paid | `components/payments/PaymentSuccessScreen.tsx` (immediate rails), `flows/ScanAndPayFlow.tsx` | 1 | Check icon |
| `success-scheduled` | Scheduled or repeating payment set up | `PaymentSuccessScreen` scheduled variants, `StandingOrderFlow.tsx` | 1 | Check icon |
| `success-pending-approval` | Sent for approval (maker-checker) | `payments/bulk`, `trade/new`, approvals flows | 3 | Check icon |
| `success-created` | Something created (card requested, group created, account requested) | `RequestCardFlow.tsx`, `payments/groups/success/page.tsx`, `accounts/RequestFlow.tsx`, `AddAccountDialog.tsx` | 1 | Check icon |
| `success-funded` | Source linked / wallet funded | `LinkSourceAccountModal.tsx`, `QuickFundModal.tsx`, `FirstRunWelcome.tsx` | 2 | Check icon |
| `success-welcome` | Account opened / onboarding complete | `signup/page.tsx`, `signup/business/page.tsx` | 2 | Check icon |
| `success-secured` | Password reset / card verified | `forgot-password/page.tsx`, `card-verification/page.tsx` | 3 | Check icon |

`pending-approval` and `secured` are the likeliest to fold into another picture, which would bring the total to about 17.

## D. Moments — one-time milestones, modals and interstitials (8)

These are emotional peaks, not empties. The biggest placement (320×200).

| ID | Moment | Where it appears | Tier | Status |
|---|---|---|---|---|
| `moment-welcome` | Welcome, {name} — first run | `dashboard/v2/FirstRunWelcome.tsx` (dialog) | 1 | Not drawn |
| `moment-account-ready` | Your virtual account / GCB account is ready | `signup/page.tsx` step 6, `accounts/page.tsx`, `dashboard/v2/UnfundedNudge.tsx` | 1 | Not drawn |
| `moment-migration-welcome` | Welcome for migrating customers | `migrate/page.tsx` (welcome step) | 2 | Not drawn |
| `delivery-preparing` | Card being prepared / in production | `cards/CardDeliveryTracker.tsx`, details delivery hero | 2 | Not drawn (faded-card PNG in use) |
| `delivery-in-transit` | Card on the way | same | 2 | Not drawn |
| `delivery-out-for-delivery` | Rider has it, arriving today | same | 2 | Not drawn |
| `delivery-ready-for-pickup` | Ready at the branch | same | 2 | Not drawn |
| `delivery-arrived` | Arrived, needs activating | same | 2 | Not drawn |

Already covered by a success picture, so not new: source linked / wallet funded (`success-funded`), card requested (`success-created`), transfer completed (`success-sent`).

**Never illustrate:** rejection, return-for-clarification, compliance, transaction PIN, blocked-card confirmation. Nothing celebratory on an unfunded account: the "ready, add funds" nudge stays calm. Warmth scales with the moment.

## Ship order

- **Tier 1 (do first, 8):** `success-sent`, `success-scheduled`, `success-created`, `caught-up`, `no-results`, `load-error`, `moment-welcome`, `moment-account-ready`. Highest visibility, and the last one seen before a customer walks away.
- **Tier 2 (~6):** `empty-cards` (done), `empty-activity`, `empty-people`, `empty-sources`, `success-funded`, `success-welcome`.
- **Tier 3 (~6):** the long tail. Rarely seen; some may stay as a plain icon.

## How a drawing ships

1. Draw it to the spec below and export `public/illustrations/<id>.svg` (and optionally `<id>.dark.svg`).
2. In `src/lib/state-illustrations.ts`, set that id's `drawn: true` (and `dark: true` if there's a dark file).
3. That's it. Every screen wired to that id shows the drawing. Until `drawn` is true, screens keep their current icon, so partial sets are safe.
4. Tick it on the checklist.

Wired today: every customer-shell `TrueEmptyState` carries an `illustration` id; `FilteredEmptyState` always uses `no-results`; `ListErrorState` always uses `load-error`. Success and moment screens are **not wired yet**: use `<StateIllustration id="success-sent" fallback={…} />` directly where each is built (extracting a shared `SuccessState` from `PaymentSuccessScreen` is still open).

## Illustration spec

**Format**
- SVG only. No embedded raster images, no embedded fonts, no text in the art (screens are translated). Outline all strokes that must scale.
- Transparent background. The panel colour shows through.
- Under about 30 KB each. Static (no animation) for now.

**Canvas.** Author at 2× the display size, and set only a `viewBox` (no `width`/`height` attributes):

| Placement | Used for | viewBox | Displays at |
|---|---|---|---|
| `empty` | empties, `caught-up`, `no-results`, `load-error` | `0 0 400 264` | 200 × 132 |
| `success` | success screens | `0 0 480 320` | 240 × 160 |
| `moment` | welcome, account-ready, delivery stages | `0 0 640 400` | 320 × 200 |

**Safe area.** Keep the drawing inside an 8% margin on all sides. Anchor the visual weight in the lower-centre. The text sits directly below, and a top-heavy drawing looks like it's floating.

**Light and dark.**
- Draw on the light panel (`#ffffff` / `#f6f6f5`) and check it on the dark one (`#1e1e1e`). If it doesn't hold up, add `<id>.dark.svg`.
- Avoid pure black and pure white as fills. Use the card palette (gold `#f5be18`, blue `#0284c7`, maroon `#991b1b`, slate, emerald) plus one dark ink for accents.
- Style reference: `CardsEmptyIllustration.tsx`, flat colour blocks and one dark accent badge with no outlines.

**Meaning.** The art is decorative (`alt=""`). Never put information only in the picture. The title and line beneath carry the meaning.

**Tone**
- `empty`: an invitation, not a scolding. There is always a next step.
- `load-error`: reassuring. Nothing is broken about their money.
- `success`: relief and proportion. A £5 transfer gets a small tick, not confetti.
- `moment`: the one place to be warm and big.

**Kit.** Build every scene from one shared set of objects (card, coin/wallet, document, person, check badge, calendar, chart bars) so the 27 read as one set.

**Naming.** File name = registry id, exactly (`success-sent.svg`, `empty-cards.dark.svg`).

## Known limits of this scan

- Titles were read by regex over a fixed window; a few `ListErrorState` rows picked up a neighbouring title. Use the file and line, not the title, for those.
- Success situations are grouped by reading file names and toast text, not by tracing every variant. `PaymentSuccessScreen` (27 receipt/success references) probably has more variants than listed: check it before drawing.

## Re-run the counts

```bash
grep -rn "<TrueEmptyState" src --include=*.tsx | wc -l
grep -rn "<FilteredEmptyState" src --include=*.tsx | wc -l
grep -rn "<ListErrorState" src --include=*.tsx | wc -l
grep -rn "toast\.success(" src --include=*.tsx | wc -l
```
