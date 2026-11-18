# Type scale mapping

Approved and applied 2026-11-18 (all five decisions: yes). Later the same day the scale was cut to eight sizes: Micro → Meta, Label → Body Medium, and one 32px `type-balance` for every balance and approval amount. CONSTITUTION §5 has the current table; the rest of this file is history. The rules now live in CONSTITUTION §5; this file is the
record of how each old size moved. Differences from the draft below:

- The balance and headline steps are `type-*` utilities (`type-headline`, `type-balance-sm`, `type-balance`,
  `type-balance-lg`), because `text-balance` is already Tailwind's text-wrap utility.
- `type-balance-lg` is **32px on a phone**, not 44, so a seven-figure home balance still fits one line (as the old
  hero code did). From `sm` it is 56px.
- The account detail balance (was 30 → 36) became `type-balance`, as the role table says, rather than 32.
- The amount field keeps its own shrink-to-fit sizes (bespoke, CONSTITUTION §9).
- Sizes moved size-for-size: 13px is `text-label` everywhere, including some row text. Those get re-roled to
  `text-body` when a screen is next touched.

The draft as reviewed: The code uses 37 different `text-[Npx]` sizes (about 1,740 uses).
This proposes 12 named steps (11 new, plus the page title that already exists) and says where each current size goes. Once you approve it, the steps become
tokens in `globals.css` and the Figma text styles' code syntax points at the same names.

## Proposed steps

| Token | Size | Role | Figma style |
|---|---|---|---|
| `text-micro` | 11 | Badges, pills, chart axes, timestamps in dense rows | new: Micro |
| `text-meta` | 12 | Captions, meta, helper lines | Meta |
| `text-label` | 13 | Form labels, table headers | Label |
| `text-body` | 14 | Body, row primary text, table cells, inputs | Body |
| `text-heading` | 16 | Section and panel headings, emphasised row titles | Section heading |
| `text-title` | 18 | Dialog and sheet titles, auth step headings | new: Title |
| `type-page-title` | 18 → 20 → 22 | Page title (already exists, responsive) | Page title |
| `text-fact` | 20 | Key-fact value on a page with no balance | new: Fact |
| `text-headline` | 24 → 28 (sm) | Outcome screens (success, failed), welcome dialogs, empty-state heroes | new: Headline |
| `text-balance-sm` | 32 | Balance on a detail page or sheet | new: Hero figure S |
| `text-balance` | 40 → 48 (sm) | Balance on account, approval and receipt screens | Hero figure |
| `text-balance-lg` | 44 → 56 (sm) | Home hero balance only | new: Hero figure L |

The Figma column uses the six styles that are already in 1. TOKENS (Hero figure, Page title, Section heading, Body,
Label, Meta); "new" marks the five styles Figma would gain. The balance steps follow CONSTITUTION §5, which already
allows 32 for detail pages and 40–76 for home and account screens.

## Where each current size goes

| Now | Uses | Goes to | Notes |
|---|---|---|---|
| 7, 8, 9 | 11 | **exempt** | Mostly the miniature card faces (`CardsStack`, `VirtualCardModal`), which are drawn to scale like an illustration. The `filter-panel` and `ProfileSwitcher` cases go to 11. |
| 10 | 33 | 11 | Badges, kbd hints, tiny labels (`AccountsPanel`, `TopHeader`, `BeneficiaryDetailSheet`, `FxQuickModal`). Dev tools (motion-lab, sandbox, PersonaFlowSwitcher) are left alone. |
| **11** | 135 | 11 | **Decision: make this an official step.** It's clearly a real role (pills, badges, row meta). Some uses are uppercase and bold too, which breaks §5. Those get fixed in the same pass. |
| 12, 12.5 | 543 | 12 | 12.5 is in `button.tsx`, `login`, `StubNotice`, `hero-parts`. |
| 13, 13.5 | 590 | 13 or 14 | 13.5 in `ChoiceTile`, `TopHeader`, `hero-parts`, `QuickFundModal`: labels → 13, row text → 14. |
| 14, 14.5 | 393 | 14 | 14.5 is only in `CountryPicker`. |
| **15**, 15.5 | 98 | 16 or 14 | **Decision: drop 15.** 37 uses are `<h2>` section headings ("Your Accounts", "Cards & Wallets"); the constitution says those are 16. Account and source names in rows → 14, or 16 where they are the row's title. |
| 16, 16.5 | 63 | 16 | 16.5 is only in `ChoiceTile`. |
| **17** | 18 | 18 | Dialog titles (`ui/dialog.tsx:259` sets 17 for every dialog), `AuthHeader`, flow headings. **Decision: 17 → 18**, so dialog titles and auth headings share one step. |
| 18 | 26 | 18 | Already the title step. |
| 19, 20, 21 | 39 | 20 | Key-fact values, `FxPulse`, `SelectBankingChooser`. `OtpInput` digits are exempt (bespoke field). |
| 22, 23, 24 | 39 | 24 | Outcome and welcome headlines (`FirstRunWelcome`, `product-welcome`, "Confirm it's you", "Standing order set up"). Page titles already use `type-page-title`. |
| 26, 28, 30 | 27 | 24 → 28 headline, or a balance step | Success and failed screens (26 → 30) become `text-headline`. Amounts (`AccountExpenses`, `hero-parts`, admin trade totals) move to `text-balance-sm`. Avatar initials (`payee-avatar`) are exempt. |
| 32, 33, 34, 36 | 15 | 32 | Detail-page balances, `TransactionReceipt` (34 → 42), `OtpHelp`, `sheet.tsx`. |
| 40, 42, 44, 46, 48 | 15 | 40 → 48 | Approval, bulk, standing-order and receipt amounts. `CardDeliveryTracker` codes (46/48, letter-spaced) are exempt: they're a code to read out, not a balance. |
| 52, 56 | 2 | 44 → 56 hero, or exempt | `parts.tsx` xl hero → `text-balance-lg`. `CashoutTicket` 56 is a ticket illustration: exempt. |

Tailwind named sizes in use also map: `text-xs` → `text-meta`, `text-sm` → `text-body`, `text-base` (14px at our root) → `text-body`, `text-lg` (15.75px) → `text-heading`, `text-2xl` (21px) → `text-fact`, `text-3xl`/`4xl`/`5xl` → the nearest balance or headline step.

## Exempt (keeps its own size)

Miniature card faces, the cash-out ticket, avatar initials, `OtpInput` digits, card-delivery codes, and all
prototype tooling behind `SHOW_DEMO_TOOLS` (motion-lab, sandbox, Dev Mode panels). These are drawn objects or
bespoke fields, not text roles.

## Decisions for you

1. **11px becomes `text-micro`**: yes or no.
2. **15px is dropped** (headings → 16, row text → 14): yes or no.
3. **Dialog titles go from 17 to 18**: this touches every dialog via `ui/dialog.tsx`.
4. **Headline step at 24 → 28**: outcome screens currently go up to 30; they'd come down slightly.
5. **Three balance steps** (32, 40 → 48, 44 → 56): or fewer.

## After approval

- Add the tokens to `globals.css` (with line-heights) and update CONSTITUTION §5.
- Migrate file by file, fixing `font-semibold`, `font-bold` and `uppercase` where they sit on the same lines (38 cases).
- Add a lint rule that blocks `text-[Npx]` outside the exempt files.
- Update the Figma text styles and their code syntax to match.
