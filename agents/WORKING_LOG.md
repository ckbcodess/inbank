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
  and `card` variants and `EagleBackdrop` / `EagleStudio`, once Hybrid is confirmed. (Resolved: all auth
  and onboarding cards are vertically centred by default, eliminating card jumps).
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

### 2026-10-08

- **Decision** Invest offer details gained an interactive timeline scrubber and custom amount entry in `ReturnVisual` (`components/invest/OfferDetail.tsx`). 10 bars show accrued return across the tenure: clicking or scrubbing with pointer events highlights the selected date, displays projected balance with an arrow badge, and shows remaining milestones as dashed future outlines. Custom deposit entry live-recalculates all bars and passes through to `NewDepositFlow` and `BuyFlow`.
- **Discovery** Treasury bills and term deposits share the straight-line accrual curve for intermediate bar inspections without needing separate calculation stores.
- **Decision** Shared `Field` built (2026-10-08). `components/ui/field.tsx` (`Field`: label, hint, error, optional) sits on `Label`, which Title Cases its text at render (`lib/title-case.ts`). `Input`, `Textarea`, `Select` trigger and `PhoneInput` share one look (h-13, rounded-2xl, px-4, 14px); about 130 label wrappers, 50 raw inputs and 55 select triggers were moved onto them, and the private `Field`s and class constants (`INPUT`, `FUND_FIELD`, `LABEL`…) were removed. Only OTP boxes and amount fields stay bespoke. The old Send & Pay size won because it was the majority (50 of ~95).
- **Gap** Search inputs are still hand-built in `TransactionList`, `CreateGroupFlow`, `EditGroupModal` and `CountryPicker` (`ui/search-bar.tsx` and `ExpandableSearch` exist). Inline cells (group contribution amounts) are raw by design. Not viewed in a browser: the unified size will change the look of login, signup, settings, beneficiaries, cards and group screens, which used h-10/h-11 before.
- **Override** Placeholders are the same size as the typed value, in every input, textarea and select. Removed the global `input::placeholder { font-size: 13px }` rule in `globals.css` (added with the one-time-code work, "smaller placeholders"), so placeholder text inherits the field's own size. Don't set a placeholder size per field. Then set both to 14px (designer, 2026-10-08): about 100 field classes moved from `text-[15px]` to `text-[14px]`, and CONSTITUTION §5 now says so (the constitution row changed from 15px).

- **Decision** Invest → Treasury Bills & Bonds built from the Figma "Treasury Bills" section (file `1GC177yYfcpCVtXAiHzS28`, node 4215:103, 12 mobile flows). Routes under `/invest/treasury`: `/buy?id=`, `/statement`, `/holdings/[id]` with `/advice`, `/maturity`, `/rediscount`. The home, the market list and the account set-up are on the one Invest page (see the Invest decisions below). All the logic and the saved records are in `lib/treasury.ts` (store `nibs-treasury`); screens are in `components/invest/` and the routes. Dev Mode switches the investment account (none, pending, active), the market (open, closed) and "settle waiting purchases and cash-ins".
- **Override** Where the Figma flow broke a constitution rule, the constitution won, and these are the differences from Figma:
  - A one-time code authorises everything, not a 4-digit PIN. `TransactionOtpModal` gained a `summary` prop so the request is restated above the code boxes.
  - Reading Advice is not behind a code (it moves nothing).
  - Changing a maturity instruction to "Do not rollover" needs no code and has an Undo toast (stopping is never harder than starting). Choosing a rollover does need one.
  - Terms & Conditions are ticked once, when setting up the investment account. Each purchase only says "By continuing, you agree…" (Figma ticks it every time).
  - Figma's four buy flows (primary or secondary, by cost or face value) are one flow with a "Calculate by" switch. "View available" and "Purchase" share one list.
  - Rediscount has no separate review screen. The breakdown shows the cost of cashing in early and the exact payout, then Proceed goes straight to the code.
  - Maturity instruction starts on "Do not rollover" (nothing automatic unless chosen). Email arrives filled in at account opening and statement.
  - Figma's second "91-day" bill became a 182-day bill. Its numbers (face 998 against cost 900 at 15%; "estimated amount you receive" showing the cost) are replaced by figures derived from one pricing table.
- **Question** For the bank, none confirmed, all placeholders in `lib/treasury.ts`:
  - Pricing: bills use simple interest on 365 days, bonds use a price per 100 of face value (`costFromFace`). The rediscount rate is 18.5% (`REDISCOUNT_RATE`, from Figma).
  - Are there brokerage or CSD fees? None are shown today.
  - What exactly do "rollover same face value", "same cost" and "with interest" do? The one-line descriptions are our reading.
  - Is a Terms & Conditions tick required on every purchase? And where is the document? There is no link yet.
  - When is a primary purchase debited (at bid, or at settlement)? Is the statement free?
  - Is "7 working days" and the support line 0800 422 422 right? Both come from Figma.
- **Gap** Purchases and cash-ins don't touch balances or the ledger. A pending purchase doesn't reserve funds, and nothing appears in Transactions. Account balances elsewhere stay as they were.
- **Gap** Advice has no PDF download (no PDF pipeline, and the shell has no print styles). The Figma "Download PDF" button is left out rather than faked.
- **Gap** The opening review leaves out the Ghana Card number Figma shows (personas don't store one). Nationality and title are asked because the personas don't hold them.
- **Gap** Joint accounts ("both to sign") and the Business view can buy and cash in with a single code. Neither is defined for Invest. The Invest nav item already shows for corporate profiles. Wallet-only customers can't set up an investment account (no cedi bank account) and are told so.
- **Gap** "Market closed" and "account being set up" use icons; the Figma has art for both (register in `lib/state-illustrations.ts` when drawn). Term Deposit is now built (below).
- **Decision** Invest → Term Deposit built from the Figma "MOBILE-APP-SECTIONS" file (`94VCjR1s0YHAYdj6RYLOY2`, node 58:22615): New Request, View Request, Redeem and Close. Routes under `/invest/term-deposits`: `/new?days=`, `/[id]` (detail), `/[id]/redeem`, `/[id]/close`, `/[id]/maturity`. The list lives on the Invest page. Logic and saved records are in `lib/term-deposits.ts` (store `nibs-term-deposits`); screens are in `components/invest/` (`NewDepositFlow`, `RedeemDepositFlow`, `term-deposit-parts`). Opening, redeeming and closing complete at once (it is the bank's own product, no settlement wait), so each posts a ledger line (`postDepositEntry`, `paymentMethod: "term-deposit"`, no spend category, treated as internal in `insights.ts`) and View Receipt opens the ordinary receipt. Dev Mode switches existing deposits (two or none) and whether new requests go through or fail, to walk the failure screens.
- **Override** Differences from Figma, where the constitution or the data forced them:
  - A one-time code authorises every request, not a 6-digit PIN or a fingerprint.
  - The "Calculate" button is gone: the interest and the maturity amount show as soon as the amount is valid.
  - The Terms & Conditions tick is gone. Its text said "treasury bills/bonds" on a term deposit, so it looked pasted from the wrong flow. Add the right one back if the bank needs a tick.
  - The maturity instruction starts on "Close on maturity" (nothing automatic unless chosen).
  - The three periods are tiles that show each one's rate and its maturity date, and the amount comes after.
  - Redeem part and Close share one flow. The list has no search (two rows), and the meaningless "Face Value 201,901" row is dropped.
  - Added a "When it matures" page (Figma has none): without it a rollover chosen at opening could only be stopped by closing early. Stopping a rollover needs no code and has an Undo; choosing one does.
  - Figma's numbers disagree with each other (4%, 12.5% and 15%; "receive 2080" next to "2000"). Everything now comes from one rate table.
- **Question** For the bank, none confirmed, all placeholders:
  - Rates (91 days 12.5%, 182 days 13.5%, 364 days 15%), the GHS 1,000 minimum, and simple interest on 365 days.
  - The early-redemption rule. Figma only says "may attract a penalty", so the prototype gives up the interest earned so far on the amount taken out (`earlyRedemption`).
  - What "Roll over principal amount" does. Our reading: the interest is paid to the account and the principal stays in for the same period at the rate that day. Are there other options (principal and interest)?
  - Do the three periods and the minimum apply to Business?
- **Gap** Balances still don't move when a deposit opens or closes (same as treasury), and a deposit doesn't appear on the dashboard. Rollover isn't simulated: the fixed "today" never reaches a maturity date, so a deposit never actually rolls.
- **Gap** Joint ("both to sign") and Business accounts can open and close a deposit with one code, as with treasury.
- **Reuse** `postDepositEntry` is the way to put any investment cash movement on the ledger without it counting as spend. The treasury purchases and cash-ins should use it too once they can post (they settle later).
- **Decision** Invest is one page with two views, switched at the top (`/invest`, `?view=products`): Your Investments and Products (designer, 2026-10-08, after Robinhood and similar apps: look first, commit later). Your Investments keeps the two kinds apart: a Term Deposits section and a Treasury Bills & Bonds section, each with its own list and its own "Due to you at maturity" total (the earlier mixed list and combined number were rejected); Statement sits with treasury. With nothing yet it is one line and a "View Products" button. Products is two tiles, Term Deposits and Treasury Bills & Bonds, each showing its top rate (treasury shows "Closed right now" when the market is shut). Each opens its own page (`/invest/products/term-deposits`, `/invest/products/treasury`, `ProductPages`), so there is never more than one control on a screen: Invest has one switch, and the treasury page has none, just two headed sections, Primary Market (new issues, bought at auction) and Secondary Market (bought from other investors). Three stacked toggles on one screen (type, then market, then view) were rejected as a bad pattern. Both markets belong to treasury. `/invest/products` redirects to the Products view. Components: `InvestHome`, `ProductPages`, `offers.tsx`.
- **Decision** Tapping an offer never starts anything: it opens its details (`/invest/offer/[key]`, `OfferDetail`): the rate, a few facts, a worked example in cedis, and an "Invest" button. What pressing it involves is said right above it before they press: "To invest, we'll first set up your securities account." (or that it's being set up, or that the market is closed). With no account the button goes to `/invest/profile?next=&label=` (the intent is only accepted for `/invest/` paths); with one it goes to the buy or deposit flow. The earlier behaviour, where tapping a row jumped straight into account set-up, was rejected as a surprise.
- **Decision** The welcome has one button, "Get Started", which only closes it: no redirect, nothing is created, and there's no close icon. Shown once to a customer with no account; closing counts as seen (Dev Mode: Welcome → Show it again).
- **Decision** Nobody opens an account on purpose. The securities account (the CSD profile, called a securities account everywhere in the UI, never "CSD account") is set up the first time someone starts an investment, inline in `BuyFlow` and `NewDepositFlow` through `CreateProfileFlow`, or from "Start Investing Now" in the welcome (`/invest/profile`). It is needed for term deposits as well as bills and bonds (designer, 2026-10-08, although the term deposit Figma has no such step). It takes up to 7 working days (designer, 2026-10-08), so the choice is saved (`intent` in the treasury store). While it is being set up Invest says so, shows what was saved, and the offers can be looked at but not started; once it is active Invest shows "Your securities account is ready" with Continue to pick the choice back up.
- **Decision** `CreateProfileFlow` is a real form the customer fills in, one block at a time: title, occupation, email (filled in from their sign-in), nationality, residential status, postal and residential address, signature upload, then the linked account and the terms tick. One code submits it, with the details restated above it; there is no separate review screen. An earlier version showed made-up "on file" details taken from the Figma mockup. The designer asked for those to go (2026-10-08): they were placeholder data, not the bank's records.
- **Question** Should a term deposit really wait on the CSD profile? The Figma opens it with no such step, so this is the designer's call to confirm.
- **Gap** While the account is pending a customer can't start anything, even a term deposit, so the first investment can be up to 7 working days away. If term deposits shouldn't wait, relax the gate in `NewDepositFlow` (one condition).
- **Gap** Statement only covers treasury holdings (term deposits have none in Figma). "Due to you at maturity" counts a rollover deposit's principal plus interest.
- **Decision** Without a securities account, both "Invest" on an option's details and "Start Investing" on an empty Your Investments open the same popup (`SecuritiesAccountDialog`: "Open a securities account", Not Now / Open Securities Account). With an account, Start Investing goes to Products and Invest goes on to the flow.
- **Decision** The securities account form shows in blocks, not field by field (designer, 2026-10-08: one reveal per field was too heavy): title, occupation, email, nationality and residential status together; then postal and residential address and the signature; then the linked account and the terms. The being-set-up state on Your Investments is centred with a large icon, says they can explore the products meanwhile, and has an Explore Products button. The "Due to you at maturity" totals are removed from Your Investments for now.
- **Decision** A per-investment Statement was not added to the treasury holding screen (2026-10-08). Advice already is the single-investment confirmation, and Statement already covers the whole portfolio (active or closed, emailed) from the Treasury Bills & Bonds header on Your Investments, so a third option would repeat one of them. The designer liked the reasoning and asked for it to be kept so future requests are checked the same way: before adding an option, ask what outcome it adds that the customer can't already reach, and if the answer is none, recommend against it and name the existing path. Now a standing instruction in AGENTS.md ("Say when a request repeats an existing path").
- **Gap** Not viewed in a browser (no dev server, per AGENTS). Checked: `tsc` and eslint clean on every changed file, i18n coverage clean for the new screens (only product names, nationalities, titles and Dev Mode labels are left in English), and the pricing and date maths run in isolation.
- **Reuse** Holdings could appear on the dashboard (a "due at maturity" line) and a standing order could fund a purchase. Rolled-over instructions could post to Needs attention a week before maturity. Not built.

### 2026-10-07
- **Decision** An alternative way to do the same step replaces the heading in place; it never opens underneath it. On every code screen, "Use a shortcode" cross-fades the heading ("Enter OTP Verification Code" plus its line) into the shortcode in the same slot, with the same type size, weight and position. The block keeps one height (both layers share a grid cell), so the boxes below never move and the eye stays put. Why: opening it underneath left two competing headings, pushed the boxes down and made the screen feel like it had changed state.
- **Candidate pattern** In-place heading swap: `OtpPrompt` in `payments/OtpHelp.tsx` for the dialog and panels, `swap` prop on `AuthLayout` for sign-in (`/mfa`). Drive it from `OtpHelp`'s `shortcodeOpen` / `onShortcodeOpenChange`. Reuse it for any "try another way" that changes what the screen asks (PIN vs code, resend options) before adding a second block.
- **Override** CONSTITUTION §2 ("a payment code never auto-submits"): `TransactionOtpModal` has no Confirm button and submits as soon as the sixth digit lands (designer, 2026-10-07). Cancel is the only footer action. Constitution still needs the change proposed.
- **Override** CONSTITUTION §2 (transaction PIN by default): every payment is now authorised with a one-time code (SMS or shortcode), no PIN. `useAuthorisation()` defaults to `otp`; `TransactionPinModal` became `TransactionOtpModal` (OTP only; the payment is not restated above the boxes, by the designer's choice, against CONSTITUTION §2); `/mfa` sign-in still uses `useAuthorisation("pin")`. The shortcode `*822*1*2#` is a placeholder until the real one is issued.
- **Decision** Broadband is a third option on the Internet and airtime chooser ("Send to My Number", "Send to Other Numbers", "Broadband"; Broadband on Internet only): `flows/BroadbandFlow.tsx`, `topupCategory === "broadband"` in `PaymentFlow`. A connection at a home or office, so the destination is the provider's broadband account (resolved to a name first), not a phone. Provider and package are never preselected. Packages in `getBroadbandPackages` (shared.tsx); `OptionTile` is the shared pick-one tile.
- **Assumption** Broadband plans in `getBroadbandPackages` (shared.tsx): MTN Fibre 100/300/500 Mbps at GHS 299/444/999 (MTN Ghana, 17 June 2026); MTN TurboNet 4.3/8.7/91.8/350.5 GB at GHS 43/87/253/516 (list from January 2025); Telecel Monthly plans (Browser 120, Streamer 220, Webmaster 270, Downloader 410, Office 680), One Family (Small 180, Medium 330, Large 550, Extra Large 1,045) and Unlimited passes (Daily 40 for 24 hours, Weekend 30 for 2 days). Not included: Telecel Mini and Bolt-on add-ons and Flexi (validity and tiers unconfirmed), the Unlimited Holiday pass (seasonal), and MTN 5G Home Internet (one source says from GHS 999 a month, unconfirmed). The providers' own pages were blocked, so every price is from news or listing sites: re-check before launch.
- **Gap** Broadband accounts can't be saved as beneficiaries or appear as recents yet (the phone recents are hidden on this path), and the plan isn't offered in standing orders. Broadband isn't in the hub's tile copy or the Demo hub.
- **Override** Casing (2026-10-07, designer): input and field labels are now Title Case ("Mobile Number", "From Account", "Transaction Category"), replacing the sentence-case decision below and CONSTITUTION §5 for form labels. Placeholders, helper text and questions stay sentence case. Swept `<Label>`/`<label>` text, `label=` props on field components, and the shared defaults in `payments/flows/shared.tsx`; catalog rows added for FR/ES/ZH. Constitution §5 still needs the change proposed. Review/summary row labels and receipt rows (`PaymentFlow` review, transaction detail) are not fields and were left.
- **Decision (superseded by the Override above)** Casing: input labels are sentence case ("Mobile number", "Ghana Card number"). Title Case is for navigation, menu items, page titles, modal titles, tile titles and the primary buttons on detail pages. Questions and helper text stay sentence case. Buttons elsewhere (login, signup, dashboard flows, payment flows) and select options, chips and table headers are still mixed; not yet swept.
- **Gap** About 300 raw `<button>` elements in 72 files (outside `components/ui`, sandbox, brand, dev) still bypass `Button`, so they keep their own weight. Designer wants everything to come from a component; needs a plan per kind (text actions, tiles, pills, tabs, icon buttons) rather than a blind swap.
- **Decision:** every list filter now sits behind one `Filters` button (`components/ui/filter-panel.tsx`: `FilterPanel` + `AppliedFilters`), on branch `improved-ux`. The panel has one row per filter, a segmented control beside the label when options are few, wrapped chips under it when many, and "Any" for off. Chips under the toolbar show what is applied. Migrated: transactions, admin transaction monitoring, beneficiaries, cards, approvals, notifications, audit log, locate-us. The old mobile bottom sheets and the unused `FilterDropdown` are gone. Not yet viewed in a browser.
- **Discovery:** Locate Us had a city filter in state with no control, and its reset set the city to "All" while the filter compares "all", so a reset would have hidden every location. Fixed, and City is now a row in its panel.
- **Gap:** Reports (date range, search) and the Statement configuration are forms that set what gets exported, not list filters, so they were left as they are. Revisit if the designer wants Reports to use the panel too.
- **Gap:** Group by and Expand/Collapse on Beneficiaries are view options, not filters, so they stay beside the panel. Search on the `ExpandableSearch` pages is still separate from Filters; "Clear all filters" only resets the panel's rows.
- **Gap:** Dev Mode has no way to force a filter row's "many options" layout. Check the panel at 360px width, with a long account list, and in dark mode.
- **Override** CONSTITUTION §5 (two weights, no semibold): the shared `Button` (`components/ui/button.tsx`) is now `font-semibold` (600) on the designer's instruction. The `font-medium` overrides on `<Button>` calls were stripped (30, 13 files) so all inherit it, and the dashboard hero actions (`MoneyActions`) now use `Button` and `RoundAction`. If this stays, §5 needs a deliberate rewrite (a third weight, buttons only).
- **Override** Constitution §7 (Lucide only): Send & Pay hub icons now use Reicon (`reicon-react`, branch `new-icons`) on the designer's instruction. If Reicon is kept, §7 needs a deliberate rewrite; the rest of the app is still Lucide.
- **Candidate pattern** Hub icon looks (Dev Mode → "Icon style" and "Icon colour", store `useIconStyle`, key `nibs-icon-style`): style = outline, glass, duotone or duotone glass (one region of each icon in a second tone, `accent` on each hub action, regions on the 24px grid); colour = GCB amber or by function. Colours are tokens `--icon-<tone>-light|mid|dark|ink` (amber, blue, green, violet, rose, teal, plus slate as the graphite partner) in `globals.css`, read through `lib/icon-tones.ts`. Factories: `glassOf`, `duotoneOf`, `toneOutlineOf`. Functions: blue = to a bank account, violet = wallet or phone, teal = people, green = across borders, amber = bills and utilities, rose = cash and in person. Once a look is chosen, delete the others, the store and the switch.
- **Conflict** Six tones go past the constitution's five categorical colours (§4). They are icon decoration, not chart data, but if "by function" is kept the rule needs a note.
- **Decision:** form type follows Mercury's balance (measured on demo.mercury.com send-money/amount: values 15px, labels 13px, helper 12px). Input/Textarea values are 15px, Label is 13px medium, helper stays 12px. CONSTITUTION §5 updated (inputs were 13px there, but Send & Pay already used 15px). Applied in `ui/input|textarea|label`, all Send & Pay flows, standing orders, groups, delivery-mode fields. Tracking and muted labels from Mercury were not copied (constitution bans them).
- **Decision:** every field label in the app is now 13px medium foreground (signup, settings, beneficiaries, cards, dashboard modals, TransactionList and admin filters, which also lost their uppercase tracking). Sandbox, brand and dev tools left alone.
- **Decision:** "Insufficient funds" is inline under the amount field (`InsufficientFundsAlert` now renders `InlineError`), not a toast. ScanAndPay now passes it as the amount's `error` like the other flows. The "Insufficient funds" heading is gone; the line states the available balance.
- **Decision:** every input, textarea, select trigger and phone field outside sandbox/brand/dev is now 15px, including compact h-8/h-9 filter fields (transactions filters, admin filters, header select, expandable search, settings page-size select). If those feel heavy, give compact toolbars their own size in the constitution rather than drifting back.
- **Gap:** `AmountInput` (26px hero figure) is deliberately not Mercury's plain 15px field; revisit only if the amount step should go plainer.
- **Decision:** the GCB amber is now `#FFC423` (was `#F9C632`), given by Ransford. Dark hover is `#EBB420`, derived (about 8% darker, as the old pair was); light hover stays `#fedb71`. Changed in `globals.css`, the GCB logo default and CONSTITUTION §4. The older Decision from 2026-10-05 that names `#F9C632` is superseded.
- **Decision:** dashboard `Card` (`dashboard/v2/parts.tsx`) uses a new `--panel` token (`bg-panel`) that follows `--background` in both themes, so those panels can be tuned apart from `--card`. `HeroSheet` still paints with `--card`.
- **Discovery:** `@kitlangton/rolling-number` keeps `will-change: transform` on every digit (`.rn-ink`), which left the hero balance grainy over the dither background. Overridden at the end of `globals.css` (unlayered, so it beats the library's own CSS).
- **Gap:** the rolling-number `.rn-slot` also has a permanent soft top/bottom mask. If edge fuzz remains, set `--rn-edge-fade: 0` on the balance.
- **Gap:** the amber is hardcoded in `account-details-prototypes.html` (old HTML exploration) and the light `--ring` is an `oklch` approximation of the old amber, not recomputed from `#FFC423`.
- **Decision:** token values set by Ransford: light `--primary-hover` `#ffd966` and `--destructive` `#df2a69`; dark `--panel` `#181818` (so it no longer follows `--background` in dark; light still does), `--destructive` and `--destructive-text` `#fe5d6d`. This supersedes the light hover `#fedb71` and the "panel follows background in both themes" notes above. Dark hover is still the derived `#EBB420`.
- **Gap:** light `--destructive-text` is still `oklch(0.5 0.2 27)`, an orange-red, while the new light `--destructive` is a pink-red (`#df2a69`). Check they read as one red.
- **Decision:** `InsufficientFundsAlert` takes no props and says "Exceeds your current balance." (no figure; the balance is visible in the From account picker above).

### 2026-10-06
- **Decision:** Split auth/onboarding cards into their own `--card-auth` / `--auth-card` tokens (light `oklch(1 0 0)`, dark `#181818`), aliased to each other. AuthLayout and card-verification scope `--card: var(--card-auth)` via `[data-auth-shell]`, and AuthLayout uses `bg-card-auth/95`. Nested cards on the onboarding card (option cards in `/get-started`, signatories in `/signup/business`) use `--card-item` / `--card-inner` (light `#fafafa`, dark `#212121`), ensuring visual separation and independent tuning from the outer card.
- **Decision:** Rebalanced auth card and form rhythm. In `/login`, grouped credentials (`gap-4`) and action buttons into a tight group (`gap-2.5` between Log in and Register) separated by `mt-6` from fields, eliminating the 24px gap between primary and secondary actions and the `-mt-3` margin hack. In `AuthLayout`, trimmed card padding to `px-6 py-7 sm:px-8 sm:py-8.5` and dynamic title margin (`mb-6` without description, `mb-7` with). In `/get-started`, tightened options list to `gap-3` and internal card padding to `p-4.5 sm:p-5`.
- **Decision:** Standardised vertical centering across all auth/onboarding screens by defaulting `AuthLayout`'s `vAlign` to `"center"` with scroll-safe `my-auto` on the card container. Resolves the vertical card jump between `/login` (which was centered) and `/get-started` or other onboarding routes (which were top-anchored at `pt-[12vh]`).
- **Decision:** Moved "Already have an account? Login" on `/get-started` inside the card body (below the registration options) instead of rendering in the external layout footer.

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
- **Decision:** every colour in the components is a token now, and the colour tuner finds all of them itself.
  - New tokens: status text (`--success-text`, `--warning-text`, `--destructive-text`, `--info-text`) and `--info`; fields
    (`--field`, `--field-hover`, `--field-border`, `--field-border-focus`, used by Input, PhoneInput, Textarea, Select,
    the PIN boxes); menus (`--menu*`); the device frame; the three promo banners and the balance card (three stops each);
    the avatar tints (`--tint-*-bg`, plus `-text` for four); the Mastercard marks.
  - Tailwind palette classes (emerald, amber, rose, blue and their kin) became `success`, `warning`, `destructive` and
    `info`; tile greys became `tile`, `tile-hover`, `tile-border`; the `dark:bg-white/[0.07]` field look became the field
    tokens. A `dark:` class that repeated the plain one was dropped. Shade differences are gone: one token per meaning.
  - The tuner reads every custom property defined on `:root` / `.dark` that the browser can read as a colour, so a new
    token appears with no list to update. See-through ones get an opacity slider.
  - Payee and biller initials circles use `--avatar-*` (a pastel in both modes, dark ink on top), separate from the
    `--tint-*` pairs that flip for the dashboard suggestions. They briefly shared one set, which turned the teal, sand and
    green avatars dark-on-dark in dark mode; fixed.
  - The hand-built field and dropdown boxes (the 58px selects, the 48px phone and text fields, About 90 class strings in
    27 files: account pickers, network pickers, group and request forms, the "for myself" dropdown) now use the field
    tokens too, so the tuner's field fill, border and focus border move every input and dropdown together. Their focus
    ring became the field focus border. Read-only info boxes of the same height keep the card colours.
  - Field hover and focus are separate tokens: `--field-hover` (a faint wash on hover, now a visible grey on light, a
    faint white on dark) and `--field-focus` (the fill while typing). Both apply to Input, PhoneInput, Textarea, the
    select trigger, the PIN boxes and the hand-built field boxes. A dropdown's own menu rows hover with
    `--menu-item-hover`.
  - A second sweep caught the fields the height filter missed: the amount box (`AmountInput`, now with the field fill,
    border, hover and focus fill), the search boxes, the date picker, the admin and transaction filters, and the group
    forms. The badge and checkbox focus styles were left as they were.
  - Pruned: 42 tokens gone. Unused: the five `--chart-*` and five `--chart-secondary-*`, the eight `--sidebar-*`, the brand
    gradient pair, `--surface-raised`, the glass pair and the `.glass` helper, `--ripple-opacity`, `--avatar-plum`.
    Merged into the one that stays (same values, or close enough): `--input` into `--border`, `--tile-border` and
    `--menu-border` into `--border`, `--secondary` into `--muted`, `--secondary-foreground` into `--accent-foreground`,
    `--card-foreground`, `--popover-foreground` and `--menu-foreground` into `--foreground`, and four avatar tints
    (sky into blue, mint into green, violet into lilac, amber into yellow). The eight elevation surfaces became three
    (`--surface-1` page raise, `--surface-2` floating layer, `--surface-3` stacked); levels 1 to 8 still exist and map onto
    them in `surface-classes.ts`, with the colours of the levels that were actually reached (3 and 5) kept as they were.
  - Candidates left alone: `--cat-*` and `--spend-*` are two category palettes for different charts (merging changes
    one chart's colours); `--balance-card-*` and `--banner-gold-*` share their dark stops.
  - Amount fields: besides the shared `AmountInput`, the amount boxes in the onboarding funding card, Quick Fund, the FX
    converter, the FX rates page, and the dashboard deposit and pay-a-biller boxes had their own card or muted fills and
    now use the field fill, border and focus like every other input.
  - The field tokens (`--field`, `--field-hover`, `--field-focus`, `--field-border`, `--field-border-focus`) are opaque colours
    now. They were see-through (a 4 to 12% wash), and the tuner keeps a token's opacity when you pick a new colour, so changing
    the hue of a 4% hover looked like nothing happening. Opaque means the colour you pick is the colour you see.
  - Chips and pills have their own tokens. Chips (the segmented filters on Cards, Insights, Beneficiaries, Approvals, account
    expenses, the liquidity deck, the group forms and the theme switch): `--chip` (rail), `--chip-selected`,
    `--chip-selected-foreground`, `--chip-foreground`. Status pills: `--pill-{success,info,warning,destructive,neutral}` and
    `-text`, defaulting to the status colours (derived with `color-mix`, so they follow `--success` etc. until set). Used by
    `Badge` (new `info` variant), the card status pill, and the hand-built "Default", "Corporate", "Personal" and "Verified"
    pills. Icon circles in the liquidity deck still use the status colours. The rails that were 40 to 80% grey are now the full
    `--chip`, and the selected chip in a few places is the dark `--chip-selected` instead of the card colour.
  - A dropdown trigger shows its dark focus border only for keyboard focus (`focus-visible`). It used to show it on any focus,
    so after a mouse pick (focus returns to the trigger) it looked stuck in focus.
  - Colour tuner "where is this used": tap a token's name and the page scrolls to an element that uses it, with a pink
    outline and "--token - 2 of 9"; tap again for the next. Uses are read from the stylesheet (every rule that sets a
    property from `var(--token)`), plus tokens built from it (tapping `--success` also finds the pills). It only sees
    what is on the page you are on, and states like hover are found by their class, so they may not look different.
  - New `--focus-ring` token (starts as `--ring`) for the keyboard ring on the round actions and the Linked-to link.
  - Dark values set by Ransford (pasted from the tuner): field `#181818`, field border `#292929`, hover `#1c1c1c`, focus
    `#181818`, focus border `#424242`, tile hover `#212121`, ring `#f9c632`, duo outline `#52606b`, hero border `#1e2224`,
    account card `#93a7ba14`, sheet rim `#c5d6dd80`, surface `#080808`. If the hero tuner's defaults
    (`HERO_WAVE_DEFAULTS`) carry the hero border, they may need the same change.
  - `RoundAction` (the round amber button with its label under it) is a shared component now (`components/ui/round-action.tsx`).
    The card page and the account detail page both use it: Account Details has Top up and Share details as two round
    actions, spread evenly, in place of the filled and outlined buttons.
  - Token values set by Ransford (pasted from the tuner): light `--pill-info`, `--pill-info-text`, `--pill-warning`,
    `--pill-warning-text`, `--foreground #2e2e2e`, `--muted-foreground #8a8a8a`, `--primary-foreground #321800`, field
    focus border `#8a8a8a`, primary hover `#fedb71`, hero border `#8d9aa5`; dark chips (`#1a1a1a`, `#303030`, text `#6e6e6e`),
    dark pills (success `#002e0d` / `#20df69`, info `#2e2e2e99` / `#c7c7c7`, warning `#ffc80029` / `#f9c632`) and
    `--primary-foreground #321800`. `--action-icon` was the same colour as `--primary-foreground`, so it is gone.
  - The colour tuner is development only: the layout mounts it only when `SHOW_DEMO_TOOLS` is true, the component returns
    null in production, and `hydrateColorTuner` does nothing in production, so saved tuner colours never apply there.
  - The header is lighter: the language switch and the theme switch moved into the profile menu (Light / Dark / System and
    EN / FR / ES / ZH rows). The sign-in screens keep their own header controls.
  - Focus border re-tuned: `--field-border-focus` is `#292929` in light and `#969696` in dark. The delivery cards and the
    branch combobox now use the field tokens, so the tuner edits them.
  - Every route has a skeleton shaped like its page now (dashboard hero-split, account detail, accounts, settings,
    transactions, receipt, Send & Pay hub). Change a page's layout and its skeleton in `PageSkeletons.tsx` with it.
  - Decision: onboarding cards share one rhythm in `AuthLayout`: `py-10 sm:py-14` card padding and `mb-8 sm:mb-10` under
    the title. `padY` and `headerGap` props override it per screen. Not yet seen on the long signup and activate steps.
  - Decision: the trusted-device "Welcome back" screen asks for the password again, not the PIN (reverses the earlier
    PIN-for-returning decision). The PIN now only authorises payments.
  - Decision: the step after the password (`/mfa`) reuses the Send & Pay authorisation (`useAuthorisation` plus
    `AuthorisePanel`): PIN by default, one-time code by SMS or shortcode as the alternative and the way past a
    forgotten PIN. Trusted-device memory lives in `sessionStorage`, so a fresh visit opens on the full log-in form.
    The Demo hub has Choose personal or business, Personal log in, Business log in and Welcome back entries.
    The chooser is `/select-banking` (restored from before `/` started redirecting to `/login`); the app does not link to it.
  - Decision: every flow that charges or links a card hands off to `/card-verification`, the mock bank 3-D Secure page
    (`lib/card-payment.ts` for payments, `lib/card-link.ts` for linking). Quick fund, the welcome fund step and Add
    money from a linked card return to where they left off (receipt on approval, form on cancel). Cardless top-ups from
    the customer's own account have no 3DS.
  - Decision: onboarding order is referral, then the fund prompt, then save-source. Card networks are Visa, Mastercard,
    GH-Link and UnionPay (`lib/card-schemes.ts`, one `NetworkLogo`); the GH-Link and UnionPay marks are placeholders.
  - Decision: the card page is two columns from `lg` (card, caption and round actions left; the option list right), one
    column below. The Dev Mode layout picker and the other five arrangements are deleted; the skeleton mirrors it.
  - Override: a debit card shows Show PIN twice, as its first round action and as a row in the list, at Ransford's request
    (CONSTITUTION §9: never two controls that do the same thing). Prepaid and virtual cards have it in the list only.
  - Decision: loading states are one set of bones (`PageSkeletons.tsx`). `ListSkeleton` in `ListStates.tsx` renders the same
    rows as the route's `loading.tsx`, and the account page's in-page loading uses `AccountDetailBody`, so a loading state
    turned on in Dev Mode can't show an older shape than the real one. Draw new skeletons there, not inline.
  - Decision: shared pieces live in one file each (`operators.ts` and `OperatorLogo`, `SourceMark`, `CheckBadge`,
    `NetworkLogo` and `NetworkChip`, `CountryFlag`, `ActionTile`). Use them; don't rebuild a picker, mark or tile inline.
  - Decision: `--surface-1/2/3` are gone. Only `--surface-2` was ever reached (menus and popovers) and nothing used the
    other two, so floating layers now read `--menu` (popover and tooltip alias it) and dialogs and sheets read `--modal`.
    Elevation levels still drive the shadow.
  - Decision: `--modal` is the one token for modal and dialog surfaces (starts at the onboarding card colour).
  - Decision: breadcrumbs use each flow's full name (`HeaderBreadcrumbs.tsx`); the header crumb for the dashboard is Home.
  - Decision: the passkey option is gone from the returning-customer sign-in (it was a stand-in with nothing enrolled).
    Bring it back only with real enrolment.
  - Override: the Demo hub (`PersonaFlowSwitcher`) now ships in the live build, behind `SHOW_DEMO_HUB` in
    `src/lib/demo-tools.ts`. The colour tuner and Post-Onboarding Cards stay dev-only. CONSTITUTION §10 still says
    prototype scaffolding never reaches production; update it if this is permanent.
  - Not tokenised, on purpose: card artwork colours (`card-themes.ts`), flag and currency marks (`currency-logo.tsx`), the
    white GCB logo mark on cards, white/black overlays on photos and cards (`bg-white/20`, `text-white`), the unused
    `VirtualCardModal`, the sandbox dashboard page, and the hero-wave and eagle tuners' own defaults.
- **Gap:** this was a bulk rewrite and was not looked at in a browser: check status colours (green, amber, red, blue),
  the promo banners, avatar tints, inputs in dark mode, and the select menu once in each theme.
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

- **Decision:** loading skeletons shimmer: `.skeleton-shimmer` (a soft highlight sweeping each bone, `--skeleton-shine`,
  still under `prefers-reduced-motion`) now drives every `Bone` in `PageSkeletons`, replacing the pulse. This reverses
  the old "pulse only" rule in that file. The card detail skeleton was rebuilt to mirror the new page (back arrow and
  name, card, caption, three round actions, five tiles), and the Dev Mode "Loading" state now shows it too.
- **Note:** every loading skeleton now shimmers: `Bone`, the cards and list skeletons, the transaction detail, the dashboard
  and insights placeholders. The pulses left are status, not skeletons: the camera dot, the link-source icons, the scan line,
  and the blank full-screen Suspense fallbacks on login, mfa and activate.

- **Decision:** "for myself" (Send to myself, Airtime and Data "My own number") is a dropdown, not a radio rail. The
  registered number is already chosen, so the usual case needs no tap; any linked wallet is one pick away, and "Add
  another of your numbers" (or "Link another wallet") is the last item. It no longer collapses into a summary after a
  pick, and the amount and later fields show as soon as the default is in. The removed-wallet notice still shows.
- **Gap:** cardless withdrawal's "for myself" still offers only the registered number, not the linked wallets.
- **Decision:** `OfferDetail` (`/invest/offer/[key]`) promoted to the grouped list design with the rate row integrated into the main facts panel (`Rate`, `Deposit period`, `Matures`, `Minimum deposit`) and an explicit worked breakdown in the example card (`You deposit`, `Estimated interest`, `You receive at maturity`). Standalone 40px hero rate and exploratory variant harness deleted.

### 2026-10-08
- **Decision (Mobile-native UX):** Breadcrumbs in `TopHeader` (`HeaderBreadcrumbs.tsx`) are hidden on mobile (`hidden sm:flex`). On mobile (<640px), the top bar remains clean with only the hamburger menu and action buttons.
- **Decision (Subflow Navigation):** Replaced negative-offset absolute positioning (`-left-11`) with responsive in-flow flex back button headers in `PaymentFlow.tsx` and `StandingOrderFlow.tsx` so back buttons are never clipped or pushed off-screen on mobile screens.
- **Decision (Mobile Platform Baseline):** Added Next.js `Viewport` export (`viewportFit: "cover"`, `interactiveWidget: "resizes-content"`) in `layout.tsx` and baseline CSS rules in `globals.css` (`-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, 16px input prevention of iOS zoom, `overscroll-behavior: none`).

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
