# Working log

The temporary memory layer: an inbox, not documentation. Append freely under today's date in
**Inbox**. The rules for what goes here, the labels, and how items get promoted are in
[AGENTS.md](AGENTS.md).

The standing sections hold items that are still open. Delete an item once it's resolved, and promote
the outcome first if it passes the memory test. Consolidation tidies up this file; nobody else needs to.

---

## Open questions

### For the bank (BRD conflicts and missing rules)
- **Profile switching vs D1.** The BRD (FR-01, FR-02, BO-03, ASM-04) wants one login with Retail ⇄
  Corporate switching inside the session. The team's decision D1 (2026-08-26) separates the two
  views before sign-in. Has the bank agreed to depart from FR-02?
- **Sign-in identifier.**
  - ASM-06 says existing users keep their usernames. Since 2026-10-03 the prototype signs in with
    mobile number + password.
  - Can corporate users share one number? Two users on the same number can't be told apart.
  - Do staff need a different credential?
- **Password reset method.** FR-31 says reset by OTP "or other Bank-approved methods". The prototype
  uses mobile → selfie → new password. Is the selfie an approved method?
- **Password policy.** The rule was 12 characters (the "Bank rule") and was changed to 8 on
  2026-10-01. A source document reportedly still says 12. What is the official policy?
- **Audit retention.** FR-21 says "at least five (5) days". Probably years?
- **Scope edges.**
  - Loans → Apply versus "credit origination out of scope".
  - Lifestyle versus "non-banking services out of scope".
  - Cardless and Scan & Pay are marked *Not included* in the IA (D3), yet both are built.
- **Open IA decisions.**
  - D2: mobile screens re-laid out for web while keeping the same step count.
  - D5: conflicts between the mobile app and the BRD. The suggested tie-break is that the BRD wins on
    rules and limits, and the app wins on flow shape.
- **Admin portal roles.** Do Trade Officer, Operations and Bank Admin each get role-filtered nav, or
  is staff one population (screen spec §12.3)? And how is a staff member's own customer record kept
  out of support search (§12.6)?
- **Screen-spec states not yet confirmed:** *Disputed* on Transaction Details (§13.2), and approver
  *exceeds limit* behaviour (§13.4).

### Placeholders that need real values
- Card issuance fees (`ISSUANCE_FEE`: Debit GHS 50, Prepaid 30, Virtual 10).
- Cheque book fees (25, 50 or 100 leaves: GHS 35, 60, 110).
- Letter fees (email GHS 50, branch GHS 75) and turnaround times.
- `OTP_SHORTCODE` (`*711*5#`), its USSD code and network coverage.
- FX rates for the newly added currencies.
- Outside Ghana charge options assumed to be SHA, OUR and BEN.

### Design and product
- Can Business profiles link sources of funds? Today they show accounts only.
- Should the joint account stay a switchable profile (Samuel Quartey) under D1?
- The dashboard always opens on the healthy *Active* state, even for a customer who skipped funding.
  Is that acceptable on honesty grounds?
- Should the hero wave tuner be visible to everyone, or only in Dev Mode?
- Should the `/mfa` sign-in code also offer the USSD shortcode? (The team's note only covers the
  transaction OTP.)
- What should happen to device trust now that "Remember this device" is gone? Nothing sets a device
  as trusted, so the returning-user PIN screen can only be reached from the Demo hub.
  `RememberDeviceRow` and Settings → "This device" are orphaned. Bring the choice back somewhere, or
  delete them?
- Backend answers needed: the wallet auto-sweep, the system-wallet flag, KYC tier limits, and the
  "on its way to {account}" pending state in Add money.
- **Visible wallets for everyone?** This was proposed upstream for resilience during core-banking
  outages. The team's counter-position is to keep the wallet hidden and handle outages with stand-in
  processing on the account. Not settled.

## Known gaps (open)

**D1 implementation**
- There is no pre-login Personal/Business chooser with two doors yet.
- `navigation.ts` still adds Trade, Approvals and Administration to the customer shell by role.
  It should be split into a Personal model and a Business model.

**Sign-in and PIN** (2026-10-03)
- There's no real PIN check, no lockout after wrong tries, and no "Forgot PIN" flow (Settings → Reset
  PIN only shows a toast). Using the PIN to sign in raises the stakes on all three.
- An untrusted device still uses password then code; the PIN isn't a sign-in step there.
- `REGISTERED_PHONE` is a separate constant from the persona's phone, so the two can drift.
- An unrecognised number signs in as the default persona, so the "incorrect" error never shows.
- Settings copy doesn't mention the PIN. The returning-user and trusted-device copy mentions neither
  email nor mobile.
- The passkey is a stand-in. It's shown with nothing enrolled, so it isn't honest until enrolment
  exists.
- The PIN error message lost its demo hint ("any 4 digits except 0000").

**Onboarding**
- Pass 2:
  - Split "Wallet or Card" into two `/get-started` options.
  - Add a device-trust selfie on the new-device `/mfa`.
  - Add a primary-account picker on `/activate` when there are more than one eligible account.
- `/activate`'s review step is still read-only.
- Signup edits aren't persisted beyond the page.
- `/migrate` never offers the referral.
- The guided tours (`tours.ts`, `TourOverlay`) have no launcher, and the activation and sign-up tours
  need to be walked again.
- Terms and Privacy links are `href="#"` (the pages don't exist), and acceptance is by tap only, with
  nothing logged.
- The verified mobile is per browser (`nibs-verified-mobile`), not on the customer record.
  `SaveSourcePrompt` doesn't record whether the number was verified.
- The post-onboarding card's single-step dev triggers show the full 3-step plan. Esc acts as skip on
  every step.
- MoMo linking has no "prompt expired or declined" state.

**Send & Pay**
- Outside Ghana:
  - The Beneficiaries SWIFT form still has its own 10-country list and none of the new fields.
  - Saved SWIFT payees don't carry the bank address, address, email or contact.
  - Receipts and history don't show these details.
- PAPSS bank lists only cover 7 countries.
- Proxy, group and PAPSS use representative logic: a fixture directory, no per-recipient validation,
  fixture rates.
- Other flows haven't been audited for the progressive-disclosure gap that Wallet to Bank had.
- The wallet review line still says "My Own Wallet (Self)".
- The dashboard Top-Up → My Account shows for every persona, and doesn't ask which account receives
  the money. Only `/overview` listens for `OPEN_FUND_EVENT`.
- Standing orders:
  - There's no way to edit an order.
  - No default short name is set.
  - Browsers holding a saved list from before the change keep the old shape.
  - `resetStandingInstructions()` isn't wired to anything.

**Accounts, cards and FX**
- FX: the modal says "updated daily", but the rates are static mocks. `FxRatesWidget` has its own
  `USD_RATES`, which disagree with `FX_RATES`. FxPulse, the hero pill, the modal and `/fx-rates`
  should all read one source.
- Cards:
  - The dashboard Cards panel uses `MiniCardThumbnail`, not `CardFace`, so it doesn't match the
    Gallery.
  - The stack layout only works for about 5 cards; it needs a "see all".
  - The daily limit has no "limit reached" state.
  - The wide layouts (B–E) haven't been checked against a card awaiting activation, a delivery, or
    an empty activity list.
  - The card front doesn't draw the chip.
- Illustrated states:
  - None drawn yet; see `docs/STATES.md`.
  - The success and moment screens aren't wired.
  - "All caught up" still rides on `TrueEmptyState`.

**Cross-cutting**
- The dark mode and 375px pass hasn't been run across routes.
- Most screens since 2026-09-24 were checked with tsc and eslint only, not viewed in a browser.
- `loading.tsx` covers navigation, not data that arrives after first paint. Skeleton shapes are
  generic per variant.
- The admin portal has no user access and role admin, no maker-checker queue and dialogs, and no
  operations audit logs.
- The language toggle is missing from the admin shell header.
- The i18n catalog is missing the new 2026-10-01 onboarding copy, the consent line, and the 2026-10-03
  sign-in and OTP help strings.
- All FR, ES and ZH strings are unreviewed drafts.
- `t()` calls aren't checked by the coverage script.

## Cleanup backlog
- **Dashboard:** Hero split is the default. Delete the Overview, Focus, Timeline, Insights, Actions and
  Hero layouts once confirmed. Until then they still have circular mobile actions and row dividers.
- **Auth:** Hybrid is the default. Remove the look-switch chip and `auth-layout-store`, then the `quiet`
  and `card` variants and `EagleBackdrop` / `EagleStudio`, once Hybrid is confirmed. Still open from
  that work: should onboarding card tops line up with the centred login card?
- **Dead or unreachable code:**
  - `FxQuickModal` and its store
  - the `nibs-pending-source` helpers
  - the skipped-funding flag (`setHasSkippedFunding`), which is written and cleared but never read
  - `buildNewRetailActor`, which nothing calls
  - the unused "Email or user ID" translations
- **Wording in code:** the `u-dual` id is now Kwame Boateng. The payee "Kojo Appiah", "Ama's upkeep"
  and the "Ama" school payee keep the old names. So do `prototype/`, `.design/` and the
  `account-details-prototypes.html` files.
- **Gradual migration** (do it whenever the file is touched):
  - about 180 raw `duration-150/200/300` classes
  - inline springs in `RequestCardFlow`, `PaymentSuccessScreen` and `smooth-height`
  - `uppercase` in about 27 files
  - Title Case not yet swept through the flows

## Candidate patterns and reuse
- **Candidate pattern:** a shared `SuccessState` pulled out of `PaymentSuccessScreen`, carrying the
  `success-*` illustration ids.
- **Candidate pattern:** confirm that every high-risk admin action goes through the one compliance
  dialog (reason, step-up, audit) instead of each building its own.
- **Reuse:** `CardFace` for the dashboard Cards panel, the card detail page and the Cards layouts.
- **Reuse:** have the `/payments` hub tile list read `src/lib/payment-options.ts`, as the dashboard
  pickers already do.
- **Reuse:** the large-screen card detail layouts (A–E) could become a wide layout for Account Details.
- **Reuse:** `OtpHelp` (resend and shortcode) on every code screen, if the shortcode is confirmed for
  sign-in.

---

## Inbox

### 2026-10-03
- **Decision:** Project memory moved into `agents/`, which is now the only source of truth.
  - `.ai/INTERFACE.md`, `.ai/LEARNINGS.md`, `.ai/EXECUTION.md` and `DESIGN-LANGUAGE.md` are archived
    verbatim in `docs/archive/`.
  - `.ai/STATES.md` and its checklist moved to `docs/`.
  - `CLAUDE.md`, the root `AGENTS.md` and `.cursorrules` now only point here.
  - Facts that lived only in Claude's private memory (verification preference, accounts and sources
    model, D1, detail-page order, house design language) are now in the project files.
- **Conflict (resolved):** these contradictions between the old files were settled while building
  CONSTITUTION.md. Say if any is wrong.
  1. Primary colour: INTERFACE.md said "restrained blue", but `globals.css` is GCB amber. **Amber.**
  2. Font: INTERFACE.md said Geist, but the app uses Open Sans only. **Open Sans.**
  3. Weight: the older docs said "never bold, use size only", but §9 (at the designer's request) uses
     `font-medium` for headings, labels and buttons. **Medium is allowed; semibold and bold are
     banned.**
  4. Group labels: DESIGN-LANGUAGE.md said `11px uppercase tracking-wider`, but the designer said no
     all caps (2026-09-30). **Sentence case.**
  5. Page title: the docs said a fixed 22px, but `PageHeader` uses 18/20/22. **Responsive.**
  6. Definition of done included `next build`, which breaks the designer's dev server. **tsc and
     eslint only, unless asked.**
  7. Hub tile fills were raw hex in CLAUDE.md and DESIGN-LANGUAGE.md. They're now the `--tile*`
     tokens (dark `--tile` is `#141414`, not `#1e1e1e`).
  8. Back button: the root AGENTS.md used `window.history.length > 1`. **`canGoBackInApp()`**
     (`nav-history`), because the history length counts pages from before the app.
  9. The root AGENTS.md gave TextMorph an inline spring (`stiffness 400, damping 30`). **Motion
     tokens.** Gap: existing `TextMorph` uses may still carry inline springs.
  10. "Never inline alerts" versus the inline code and PIN errors. **Toasts for alerts; inline for
      errors on what was just typed.**
  11. Lists: the docs said `divide-y` hairlines, but the 2026-09-29 redesigns use whitespace and a hover
      inset. **Whitespace for lists, hairlines for tables.**
  12. "Lucide only" versus the duotone icons on the Send & Pay hub. **Kept as the one documented
      exception.**
- **Discovery:** `railSteps()` no longer exists. Payment authorisation is now enforced through the
  shared `useAuthorisation` hook. The old docs still named the removed function.
- **Discovery:** `NAV_ITEMS` doesn't exist either. Nav items come from `getNavigation()` in
  `navigation.ts`, and `ICON_MAP` lives in `Sidebar.tsx`. The old CLAUDE.md, INTERFACE.md and
  LEARNINGS.md all named the wrong place.
- **Decision:** the `/mfa` sign-in code goes to the masked mobile (`+233 24 *** *821`) and offers "Send to
  email instead" (toggles to "SMS instead"), matching sign-up and activation.
- **Gap:** the new-device card on `/mfa` still says "unrecognized browser", and the dynamic
  "Send to … instead" label isn't in the FR/ES/ZH catalogs.

### 2026-10-04
- **Candidate pattern:** card detail hierarchy, from the Wise, N26 and Revolut references.
  - Three levels, each drawn differently: the card, then **one row of round actions** (56px circle,
    label under it), then status (balance, daily limit as a slim bar), then a flat **Manage card** list
    (ringed icon, label, chevron, hover inset). Whitespace between groups grows as importance drops
    (`gap-6` card to actions, `gap-10` to the rest).
  - The old page drew all eight things as the same boxed tile, so nothing led.
  - Built in `VirtualCardDetailsView.tsx` as local `RoundAction` and `ManageRow`. Promote to PATTERNS
    if Account Details adopts it.
- **Decision:** a card with no daily limit (`spendLimit: null`, which is how physical cards are issued) shows
  "Daily limit · Set a limit" with "Up to GHS 20,000 a day" (plus spent today) in place of the bar. Before,
  null silently became 5,000. An absent value still defaults to 5,000.
- **Discovery:** the card detail page's Dev Mode menu now holds every state in one place: page state
  (loading, empty, error), card type, status, activity (live or none), daily limit (including not set),
  spent today, delivery stage and wide layout. The route's own switcher only appeared once you were
  already off "populated", so those three states were unreachable before.
- **Gap:** "Set a limit" and "Up to GHS … a day" aren't in the FR/ES/ZH catalogs. The "Not set" state
  isn't checked for a corporate card, which may have a different cap.
- **Gap:** the wide layouts A–E now use the flat list, and the old "tiles stretch to match the column"
  behaviour is gone, so columns may end on different lines. Not eyeballed at any width.
- **Decision:** the card detail page has one quiet caption line beneath the card (as Wise does), not a headline above
  it. A prepaid or virtual card says **Balance** and the card's real balance, with the hide-amounts eye. A debit card
  holds no money, so it says **Linked to** the account name, and tapping it opens the account page. Because that is
  the same link as the old Account button, a debit card has no Account action. The round actions follow the money
  (see below). Under them, one list of tiles, no group labels: Daily spending limit ("GHS 5,000 a day" or Not set),
  Card nickname, Show PIN (prepaid only), Reset PIN (physical only), Block card (Unblock when blocked), Replace card.
  Delete card was tried and removed. The Linked account row and its picker were removed, so a card's account can't be
  changed from this page. The caption was "Available to spend" (balance held down by the daily limit) and was
  renamed Balance, so it now shows the real balance; the limit stays visible as its own row.
- **Decision:** Details lives only on the round action, and Block only in the list, so no control appears twice.
  The Track delivery row went because the banner under the actions opens the same tracker.
- **Gap:** the wide layouts (B, C, D, E) show the full activity list instead of the preview. Linked account
  offers every account of the profile, whatever its currency. New strings are not in the FR/ES/ZH catalogs.
- **Decision:** the card no longer flips. Full number, expiry and CVV/CVC are in a **Card details** sheet (opened by the **View Details** action, behind the same PIN-or-code gate as payments; it closes itself after 15 seconds, with the seconds shown, like the PIN view)
  (tap to copy), opened from the "Details" round action only. No PIN or code gates it, same as the flip had.
- **Gap:** "Daily limit", "Card activity" and most other strings on this page aren't in the FR/ES/ZH
  catalogs (only "Manage card" was added).

### 2026-10-05
- **Decision:** the shared `ActionTile` is filled (`--tile`, `--tile-hover` on hover), has no stroke, and its icon
  has no chip behind it. The earlier outlined tile with a muted chip is gone. `TileChip` follows, so every
  caller changes with it: Send & Pay hub, Account Details, the accounts list, Add account, the toggle tile and
  the card detail list. Look at each once.
- **Decision:** round actions follow the money. A card that holds some (prepaid, virtual) leads with **Top Up**,
  then **View Details**, **Activity**. A debit card leads with **Show PIN**, then **View Details**, **Activity**,
  so the first slot is the only one that changes and the last two never move. Options
  that don't apply are hidden, not disabled: a virtual card has no PIN, so it has no Show PIN and no Reset PIN.
  Prepaid keeps Show PIN as a list row, since its third action is Top Up. The list, in order: Daily spending
  limit, Card nickname, Show PIN (prepaid only), Reset PIN (physical only), Block card, Replace card. Nothing
  appears both as a round action and a row. Block stays in the list by choice; for a lost or stolen card it is
  the most urgent step, so move it up if the list ever feels slow in that moment.
- **Decision:** the icons on the amber round actions of the card page are `#321800` in both modes (`--action-icon`).
  Dark brown on amber reads well in either mode. The Send & Pay two-tone icons keep their amber.
- **Decision:** linked mobile-money wallets on the accounts page show the operator's logo (`getTelcoLogo`, the
  same marks as the send flows) instead of a phone icon.
- **Gap:** `CreateGroupFlow` and `EditGroupModal` still show a plain phone icon for wallet members; they could
  take the operator logo from the member's network.

- **Decision:** the GCB amber is `#F9C632` (was `#fdc307`), hover `#E5B62E`. It is set once in `globals.css` and
  flows through `--primary`, `--chart-1`, `--sidebar-primary`, the brand gradient start, the dark `--tile-accent`
  and the GCB logo's eagle default. CONSTITUTION §4 updated to match.
- **Decision:** raw colours turned into tokens: the tile chevron uses `text-muted-foreground`; activity amounts use
  `text-success` / `text-destructive` / `text-warning` in the card page and the dashboard activity widget; the
  Mastercard circles use `--mc-red` / `--mc-orange`; the two-tone icon outline uses `--duo-outline` (via
  `.duo-outline`); the dark shell background is the `--surface` token; delivery-tracker and dashboard card amber
  chips use `bg-primary`.
- **Gap:** 66 raw hex colours remain in components, besides the sandbox page: PaymentSuccessScreen (9), PaymentFlow
  (9), CardDeliveryTracker (7), RequestCardFlow (6), TransactionList (5), AuthorisePanel (4), TourOverlay (4),
  SuggestedForYouCard (4), MobilePromoBanner (3), VirtualCardModal (3), and a few single ones. Each needs a token
  chosen, so they were left. The sandbox dashboard page is a throwaway and is untouched. The logo SVG files were
  not checked for the old amber.

- **Decision:** the card page's round actions are spread across the card's width (`justify-between`, 360px), like
  the Wise reference, instead of clustered in the middle.
- **Discovery:** a **Colour tuner** dev tool (`ColorTuner`, store in `src/lib/color-tuner.ts`) is mounted in the root
  layout under `SHOW_DEMO_TOOLS`. The palette button sits bottom right, left of the wave tuner. It edits about 35
  opaque tokens live for the theme on screen (light and dark kept separately), writes them into one `<style>`
  (`html:not(.dark)` and `html.dark`, so light can't beat dark), saves them in `nibs-color-tuner`, and "Copy CSS"
  gives the changed tokens in `globals.css` shape to bake in. Tokens with alpha (`--account-card`, `--hero-*`
  mixes) are not in it. Edits survive a reload until "Reset all".

- **Decision:** the card on the detail page is now the shared `CardFace`, the one the Cards page draws (chip, contactless
  mark, same type sizes), with the block state applied. It used its own hand-built face, so the two never matched. The
  theme comes from one rule (`themeForCard`); the detail page used to fall back to gold for a debit card with no
  theme, the Cards page to black.
- **Decision:** the caption under the card is a fixed 32px row for both kinds of card (Balance or Linked to), so the
  actions and list sit at the same height whichever card is open. A debit card whose account can't be found keeps an
  empty row of the same height.
- **Gap:** an inactive card no longer shows the "Needs Activation" badge on its face (the shared face has none); the
  page's Activate button and delivery banner say it. The inactive delivery hero still draws its own card.

---

## Consolidation history
- **2026-10-03:** Bootstrap. Built the five files from these sources:
  - `.ai/INTERFACE.md`, `LEARNINGS.md`, `EXECUTION.md` and `STATES.md`
  - `DESIGN-LANGUAGE.md`, `DESIGN-PLAN.md` and `DESIGN-TIMELINE.md`
  - the old root `AGENTS.md`, `.cursorrules` and `CLAUDE.md`
  - Claude's private project memory
  - the BRD and the screen-consolidation spec

  EXECUTION.md's 384-line change history was not carried over; git and `docs/archive/` hold it. Only
  its open items were kept (above).
