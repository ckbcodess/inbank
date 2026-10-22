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

### 2026-10-26
- **Decision:** steps in a flow are the segmented bar (`ui/step-bar.tsx`, now shared by `AuthLayout` and the Insure profile flow), the step name as the title and a quiet `Step n of N` under it (designer, 2026-10-27, variation 1). Any new multi-step flow uses it.
- **Decision:** Cost or Face Value on a bond or bill purchase is two linked amount fields, "You Pay Today" and "You Receive at Maturity": type in either and the other follows. No toggle (designer, variation 6). The breakdown no longer repeats those two figures.
- **Gap:** Insure BuyPlanFlow still picks its amount basis (monthly, yearly, sum assured) with a segmented control; the same "show both numbers" idea may apply. Invest CreateProfileFlow and the card request flow show no step bar yet.
- **Decision:** Loans and Insure have the "Welcome to ..." dialog Invest has (designer, 2026-10-27): once per customer, only if they hold nothing yet, one button that only closes it. All three use `ProductWelcome` (`components/ui/product-welcome.tsx`); each product keeps its own `welcomed` flag in its store (`lib/loans.ts`, `lib/insurance.ts`, `lib/treasury.ts`). Copy is a first draft from what each product does. Clear the browser’s saved data to see it again; there is no Dev Mode switch to replay it.
- **Override:** the designer removed the summary block (amount, who, from where) from the one-time-code modal, everywhere (2026-10-27). This overrides CONSTITUTION §2 ("The payment is restated above the PIN or code boxes"). `TransactionOtpModal` no longer has a `summary` prop and `AuthSummary` is deleted; no flow passes one. **Proposal:** delete that rule from §2 and the line in §1 about restating, or say where the payment is restated instead (the review step directly before). Until then a bare code prompt is the intended behaviour.
- **Decision:** every purchase (Insure plan, salary advance, treasury bill or bond, term deposit) asks for the Terms & Conditions on its review step: a tick whose "Terms & Conditions" is a link that opens them in a dialog, and Confirm stays off until it is ticked, with the reason under the buttons. Shared: `TermsAgreement`/`TermsHint` (`components/ui/terms-agreement.tsx`), text in `lib/terms.ts` (also used by the Invest offer page). The old tick on the Insure and Loans form steps and Invest’s "by continuing" line are gone.
- **Gap:** the terms are working summaries of what the app does, not the bank’s legal text [ASSUMPTION]; swap them in `lib/terms.ts` when supplied. The new strings have no FR/ES/ZH rows yet (the catalogue still holds the old tick sentences).
- **Decision:** a loan’s Repay now is the banner too (due, or overdue), so the Repay Now row is gone from the loan page. An active loan that is on time now shows a neutral "Due 20 Nov" banner with Repay now on its page and on the Loans home.
- **Override:** the designer chose variation 2 of `prototype/product-actions-prototypes.html`: a slim banner under the title of a product record, and a dot on the sidebar item. This overrides CONSTITUTION §3 ("What needs you is a row, not a block... no banner"). Built: `ProductBanner` + `NavAlertDot` (`components/ui/product-banner.tsx`), rules in `lib/product-alerts.ts`, on the loan, policy and treasury holding pages. Amber rows that said the same thing were removed. **Proposal:** amend §3 so a product record may carry one slim banner (headline up to six words, one underlined action), and the row rule stays for everything else. Not done until the designer confirms.
- **Decision:** the banner is also on the Loans, Invest and Insure home pages (designer, 2026-10-27). One alert is a headline and an action; two or more are still one banner that counts them and opens in place into a line per record (three shown, then "Show all"). Never a stack. The sidebar dot is vertically centred on the right of the item. Detail pages keep their own banner.
- **Gap:** only `act` (overdue advance, missed premium) puts a dot on the sidebar; Invest has no `act` case (maturing is a heads-up with a default payout), so it never shows one. "Done" banners (repaid, paid out) are not built: they need a record of when the customer saw them. Declined advances and plan pages have no banner. The shelf cards still show their own amber status text beside the banner (and Invest’s "securities account is ready" is amber without being an alert); decide whether the cards go neutral. Not viewed in a browser.
- **Conflict:** the designer asked for banners and an alert icon on Loans, Invest and Insure when a purchase needs action. The constitution (§3) says what needs you is an amber row with an underlined link, and no banner. `prototype/product-actions-prototypes.html` has 8 variations: 1 keeps the row rule, 2–6 and 8 use banners or bars, 4 is icon-only, 7 is a cross-product Actions tray. Nothing built. If a banner wins, propose the constitution change rather than coding past it.
- **Question:** which moments count as "needs you"? Drafted: loan overdue, premium missed, bill maturing with no choice made. Waiting (approval, medical, cash-in) and done (repaid, paid out) are quieter, with no button.
- **Decision:** skeletons now copy the calm pages: list boxes have no dividers (like `ListCard`), `FormPageSkeleton` is the flows’ centred 560px column with a back arrow, and Insure/Loans/policy/loan/scheduled payments/business overview have their own shapes in `PageSkeletons.tsx`.
- **Gap:** admin and business detail pages still use the generic `DetailPageSkeleton`; the Invest forms use `FormPageSkeleton` with a field count, so their real steps (segmented choices, review) are only approximated. Not viewed in a browser.
- **Decision:** `admin/loading.tsx` picks `AdminDashboardSkeleton` on `/admin` and a list elsewhere; `/beneficiaries` has its own loading (tabs, search, list); the customer fallback has no action button.
- **Decision:** a holder's product page is the holdings list, then two full-width buttons (Buy/Open Another, View Statements). About is off the page until a placement is chosen (`prototype/invest-about-placement-prototypes.html`); until then a holder cannot reach About (new investors still have the row).
- **Gap:** Term Deposits had no statement. `/invest/treasury/statement?product=term-deposits` now emails one (active or closed deposits); Treasury Bills and Bonds still share one combined statement.
- **Decision:** Invest is three products by kind: Term Deposits, Treasury Bills, Bonds (`/invest/products/{term-deposits,treasury-bills,bonds}`, each with `/open` and `/about`; old `/treasury` redirects to bills). Primary/Secondary is a label on the row ("Primary · Settles ..."), not a group. Holder sees holdings + Buy Another + About; new investor sees the list + About. Instrument page is an Insure-style pitch (from `prototype/invest-combined-prototypes.html`, variation 1).
- **Gap:** instrument pitch dropped the facts card; the rate, dates and worked example moved into benefits and the divider, min deposit into the note above the button. Check on screen that a primary bill's "About x% a year" reads honestly. Not viewed in a browser (tsc and eslint only).
- **Gap:** the new copy (benefits, product lines, "Buy Another") is English only; FR/ES/ZH rows still to add. Bills and bonds scenes are flat placeholders until real images go in `PRODUCT_IMAGES`.
- **Decision:** header to first content is 40px phone / 48px from sm on every page (first set at 64px, cut to 48px the same day) (CONSTITUTION §6, PATTERNS §1). Done with `data-page-header` in globals.css, so no page root changed. Not covered: the dashboard greeting, auth/onboarding (`AuthLayout`), and Settings (no header row). Not viewed in a browser.

### 2026-10-24
- Override (designer, 2026-10-24): CONSTITUTION §3 "one loud thing per screen: the number" is replaced. A big figure is only for balances (lead-in phrase over it); every other detail page is a title and label/value rows, the first row slightly larger; what needs the customer is an amber row with a text-link action, never a block above the page. Why: the rule forced a hero number onto screens with no natural one (policy: sum assured, ref and premium stacked as four near-identical grey lines read as noise). Rewritten in CONSTITUTION §3 and the type table, and PATTERNS §5.
- Done: the detail rule is applied to `components/insure/PolicyDetail.tsx`, `components/loans/AdvanceDetail.tsx`, `invest/term-deposits/[id]` and `invest/treasury/holdings/[id]`. Still on the old pattern (a big number with stacked grey lines under it), review one by one: `payments/standing/[id]` and the list/sheet variants (amount with cadence), `cards/*` detail, `invest/treasury/holdings/[id]/advice` and `/rediscount`, `ScheduledPaymentSheet.tsx`, `TransactionDetailSheet.tsx`, `invest/term-deposits/[id]/maturity`. `accounts/[id]` and the business equivalents are balances and keep the figure; dashboard, FX and receipts probably stay.
- Decision (designer, 2026-10-24): Insure, Invest and Loans are one skeleton, PATTERNS §24: a shelf (the same for every customer, one quiet status line per card, a lead figure only for balances), a product page (what you hold first, then what it is, then one button), an item, and a one-time gate at the button that keeps the chosen product. Built: Insure (`InsureHome`, `PlanPage`, `/insure/plans/[id]` is a real page now; `PlanDialog` deleted, and the profile prompt left the hub), Loans (`LoansHome` shelf, `AdvanceProductPage` at `/loans/products/salary-advance`, `AdvanceDetail`), Invest (`InvestHome` is two cards (the shared `ProductCard`, ids `term-deposits` and `treasury`) with no total above them (the "You have invested" figure was tried and dropped the same day); the Your Investments / Products switch is gone; holdings moved onto the product pages in `OwnedRows.tsx`; `PRODUCTS_HREF` is now `/invest`). Supersedes the Insure plan dialog decisions and the Invest two-views decision of 2026-10-08 and 2026-10-23.
- Gap: not viewed in a browser (tsc and eslint only). Check in light and dark and at phone width: the shelf card status line, the amber rows, the Loans card with no income, and Invest with each Dev Mode account state.
- Gap: the new copy is English only (the status lines, "Your Policies" on the plan page, "Apply for Another", "Open a Deposit", "You have invested", "To clear it today" and the amber row labels). Add FR, ES and ZH rows with the rest of the Insure, Loans and Invest copy.
- Gap: the Insure and Invest Dev Mode "before you can use it" prompt styles (`SetupPrompt` slim row, setup card, track) are now only used on the Loans product page. The Insure profile-gate prompt (`PROFILE_STEPS`) was deleted with the old hub; if the profile gate should explain its four steps before the flow, put it on `PlanPage`.
- Gap: Loans has one product, so its shelf is one card. It still goes through a product page, for the same skeleton; revisit when the Personal Loan arrives. Loans decline and missed-payment states are covered on `AdvanceDetail` only.
- Question: does the chosen plan survive profile creation? `PlanPage` sends `?next=…&label=…` to `/insure/profile` as `PlanDialog` did; confirm the profile flow returns to the buy flow for that plan.
- Reuse: `ProductCard` `status` and `ActionTile` `descriptionTone="attention"` carry the quiet status line; `needsAttention` in `lib/insurance.ts` decides amber for a policy.
- Decision (designer, 2026-10-25): on a page with a centred column, the page header (back arrow and title) sits inside that column so it lines up with the content, as on Request a Card, not at the far left of the pane. Applied to `PlanPage`, `AdvanceProductPage`, both Invest product pages (now a 560px column), `PolicyDetail`, `AdvanceDetail`, the term deposit detail and the holding detail. Other centred pages (standing order, card detail, accounts) still have the header outside the column: review them one by one.
- Decision (designer, 2026-10-25): the "With image" card look is back as a fourth option in the Dev Mode card switch (a flat scene per product across the top, then name, descriptor and what the customer holds as chips; the count chip is neutral, what needs them is amber). Scenes live in `PlanImage` in `insure/parts.tsx`, now for every product including Term Deposits and Treasury; swap in StarLife photographs there. Cleanup: this is one of four looks still to be narrowed to one. Check: the shelf cards are taller in this look (a 160px picture), so mixed-look screenshots will not line up.
- Decision (designer, 2026-10-26): the Insure plan page layout (picture, benefits, the price on the dashed divider, one button; manage state: only the holdings) now applies to every product page. Built: the generic `ProductPitchBody` and `ProductAboutBody` in `components/insure/ProductPitch.tsx` (`PlanInfo.tsx` is a thin wrapper for plans); Loans (`AdvanceProductPage`: pitch with "Apply for Salary Advance" or the gate; manage with the overdue loan first and Apply for Another off, with its reason, while one is waiting or unpaid; `AdvanceInfo.tsx`; About at `/loans/products/salary-advance/about`); Invest (`ProductPages.tsx`: Term Deposits and Treasury pitch with the headed lists of what to open instead of a button; manage with Open Another / Buy Another and an About row; new routes `/invest/products/term-deposits/open|about` and `/invest/products/treasury/open|about`; holdings maturing within a week are amber on their row). Types and Treasury highlights moved to `lib/product-highlights.ts`. Deleted with this: the Page top and Page layout Dev switches, `ProductTop`, `ProductHero`, `ProductLayout`, `ProductPicture`, `lib/product-steps.ts`, and `InvestDevTools`' `extraGroups`. Benefits are written only from what the app already does: Loans (up to 80% of pay, repaid on payday, repay sooner pay less), Term Deposits (fixed rate, choose how long, take out or roll over), Treasury (government, primary or secondary, rediscount). Gaps: none of these is viewed in a browser; the Term Deposits and Treasury About pages and the new `open` routes need a click-through; Treasury has no per-security price on the pitch when the market is closed (plain divider); Back on `OfferDetail` already returns to where the person came from (`PageHeader` backTo uses `useContextualBack`), so the new Open pages need no change; the benefit copy is English only; add real renders: `image` on each plan in `lib/insurance-plans.ts`, and a path for Loans and Invest in `lib/product-images.ts`. The shelf card's With image look and the product page show the same picture.
- Decision (designer, 2026-10-26): the plan page pitch is now just an image and the benefits, with the price printed on the dashed divider (variation 14 of `prototype/plan-page-simple-prototypes.html`), then the one button. The details card is gone from the pitch. `PlanPitchBody` is the picture, `PlanBenefits` (one under another, disc icon, title 17px, muted line) and `PriceDivider`; the About page keeps the benefits and the list card (price first, then term or cover, who it covers, provider) as `PlanAboutBody`. The picture is `plan.image` (a path under `public/`, new optional field on `InsurancePlan`) or, until real renders exist, the flat scene from `PlanImage`. Gap: a customer with no policy now cannot see the term, cover or provider before buying (they are on About, which only shows once you hold a policy, and in the buy flow's quote); if that matters, add a "Cost and terms" row (variation 15). Gap: add the renders as `image` on each plan. Supersedes the next entry's layout for the pitch.
- Decision (designer, 2026-10-26): the plan page pitch was variation 1 of `prototype/plan-page-detail-prototypes.html`, the designer's own layout refined: three benefits in a row (icons in discs of the plan colour), a dashed divider, one list card (price first and larger, then cover or term, who it covers, provider), one button named for the plan ("Apply for Child Education Plan", or Create a Profile). `PlanPitchBody` is shared with the About page. Replaces the slim band, the benefits list and the folded Details. `ProductPicture` is now only the Loans and Invest mark picture (the highlights and slim forms and `HighlightList` and `PlanPrice` were removed). The manage state is unchanged: only the policies. Check: three columns on desktop, stacked rows on a phone, two-benefit plans (Child Education, WealthMaster) in two columns, in light and dark.
- Decision (designer, 2026-10-26): the Insure plan page is two pages, never both (direction 1 of `prototype/plan-page-states-prototypes.html`), replacing the one layout that tried to sell and manage together. No policy under the plan: a slim band, three benefits, the price, one button (Create a Profile or Get Started), facts under Details. One or more policies: only the policies, Apply for Another beside the heading, About this plan as a row that opens `/insure/plans/[id]/about` (`PlanAbout`). New: `PlanPolicyRow` (policy number, then what needs the customer in amber or who it covers), `PlanInfo.tsx` (`PlanPrice`, `planFactRows`), `HighlightList` and `ProductPicture slim`. The Page top and Page layout switches no longer touch the plan page; they remain on Loans and Invest. Gaps: Loans and Invest have not followed (their pages still show picture, holdings, card and button together); the policy row for savings plans shows the premium where funeral plans show who is covered; check three policies, one with missed premiums, and the About page in light and dark; the earlier ProductPicture-with-highlights block (benefits on the picture) is now unused by Insure.
- Decision (designer, 2026-10-25): the page top and layout switches are back in Dev Mode, on all four product pages (Insure plan, Loans advance, Term Deposits, Treasury): "Page top" (Picture, the default, then Sentence only, Tinted hero, Adapts to the customer, Solid colour) and "Page layout" (Stacked, How it works, Yours | About), restored as `ProductHero`, `ProductTop`, `ProductLayout` and `lib/product-steps.ts`. Store: `pageTop`, `pageLayout`. With a sentence look the amber attention row leaves the card (the sentence says it) and the benefits return as a checklist. Cleanup: pick one top and one layout, delete the rest and both switches. Gap: Invest shows these switches only on its two product pages.
- Decision (designer, 2026-10-25): on the plan page the picture is the benefits (direction 4 of `prototype/product-page-benefits-first-prototypes.html`): a row of icon, label and short value on the plan's colour, from `highlights` in `lib/insurance-plans.ts` (the full `benefits` wording stays in the data but is no longer on the page, so "of an approved claim" is gone from the plan page; say it on the claim flow). The card holds only the price and the facts. Loans and Invest have no highlights, so they keep the mark picture: write them (Loans: what is paid, when it is repaid; Invest: what you earn, what you get back) if they should match. Cleanup: if more plans open, give each three highlights. Check: three columns on desktop, stacked on a phone, in light and dark.
- Decision (designer, 2026-10-25): the product page is the picture (direction 10 of `prototype/product-page-approaches-prototypes.html`), the customer's holdings, one list card with all the information, and one button. `ProductPicture` (the product's mark on a wash of its colour, no text) replaces the sentence hero; the checklist and the details box are one card; what needs the customer is that card's first row in amber with a link (an overdue advance, a missed premium, a deposit or holding maturing within a week). Built on `PlanPage`, `AdvanceProductPage` and both Invest product pages. Removed: `ProductHero`, `ProductLayout`, `lib/product-steps.ts` and the "Page hero" and "Page layout" Dev switches, and the sentence copy with them. Supersedes the two decisions below on `ProductHero` and "Page layout". Gap: the picture is 16:9, so it is tall on desktop; check it, and the Invest card rows (Term Deposits has real rates and terms; Treasury has two facts written for it: "Held in" and "Early exit"), in a browser.
- Decision (designer, 2026-10-24): product pages also take a "Page layout" Dev Mode switch, from directions 4 and 6 of `prototype/product-page-prototypes.html`: stacked (default), How it works (steps) and Yours | About tabs, via `ProductLayout`, with a fourth hero look, Sentence only (direction 1). All four pages (Insure plan, Loans advance, Term Deposits, Treasury) hand `ProductLayout` their pieces. Steps live in `lib/product-steps.ts` and carry no figures (those stay in the rows). The Invest pages call their second tab "Open" because it holds what you can start. Cleanup: pick one layout and one hero, delete the rest and both switches. Gap: the steps are English only.
- Decision (designer, 2026-10-24): product pages open on `ProductHero` (the answer-first sentence in the product's colour), narrowed from 18 in `prototype/product-page-prototypes.html` to three Dev Mode looks in the "Page hero" switch: tinted (11, the default), adapts to the customer (13: tall when new, slim when they hold something, no colour and an amber sentence when something needs them) and solid colour (18, neutral when something needs them). Used on `PlanPage`, `AdvanceProductPage` and both Invest product pages. Departure from the prototype: the hero is a rounded block under the page header, not full-bleed, so the back button and title stay in `PageHeader`. The plan disc and description paragraph are gone from `PlanPage` and `AdvanceProductPage` (the sentence and mark replace them). Cleanup: pick one of the three and delete the others and the switch. Gap: the sentence is English only; the Treasury page's securities-account status block still sits under the hero.
- Decision (designer, 2026-10-24): the shelf card is down to three looks, narrowed from 28 in `prototype/product-card-prototypes.html`: disc in the corner with the status at the bottom (8, the default), watermark icon (13) and rising icon (27). They replace plain, coloured, art, image and price (and `PlanArt`, `PlanImage` and the scene drawings, replaced by `PlanMark`). Invest's two tiles are `ProductCard`s too (ids `term-deposits`, `treasury`); `ActionTile`'s `descriptionTone` is now unused by Invest. The descriptor line always shows, with the status beside it (designer, 2026-10-24: the status must not replace it); no card shows a price except Loans' "Up to". All three are 184px minimum, and the three shelves share a 720px column. Cleanup: pick one of the three, delete the other two, the card-look switch and the persisted look (`nibs-insure-cards-v2`).

### 2026-10-23
- Override (designer, 2026-10-24): icons move from Lucide to Material Symbols (rounded, weight 400) on branch `icons`. All 207 files import from `@/components/ui/icons`, generated by `scripts/gen-material-icons.mts` (173 names, each mapped to a Material glyph; names kept so a swap back is one import path). Constitution §7 rewritten. The duotone Send & Pay icons are untouched. First pass looked too thin and small; `WEIGHT`, `EMBOLDEN` and a viewBox `TRIM` in the script are the knobs. `@material-symbols/svg-400` is installed as a dev dependency (`svg-300` was removed).
- Decision (designer, 2026-10-24): the Send & Pay hub icons stay Reicon (duotone and glass looks). A Material Symbols version was built and reverted: it lost the look. Everything else is Material.
- Gap: `TransactionIcon.tsx` still tags its icon kind as `"lucide"` (just a string discriminator). Rename when that file is next touched. Prop types in `payments/page.tsx`, `AuthLayout.tsx`, `VirtualCardDetailsView.tsx`, `dashboard/v2/parts.tsx` and `PaymentSuccessScreen.tsx` still list `strokeWidth?`; harmless, drop on touch.
- Gap: `package-lock.json` still lists `lucide-react`; `npm install` will prune it. Some glyph choices are stand-ins (Sparkles is `stars_2`, CircleDashed is `stroke_partial`, FileDown reuses `download`); check them in the browser.
- Decision: Insure plans are cards (two to a row) that open the plan in a centred dialog over the list (`PlanCards.tsx`, `PlanDialog.tsx`), replacing the rows and the separate plan page. `/insure/plans/[id]` renders Insure with that dialog open, so links and Back from the buy flow still land there. Cards use the ListCard glass edge. Each plan has a colour from `--cat-*` (no red) in `parts.tsx`.
- Decision: with no insurance profile, Insure shows one slim row above the plans (a sentence and Create Profile) instead of a heading, paragraph and button. Chosen from 8 options in `prototype/insure-no-profile-prototypes.html`. Loans uses the same pattern: the advance a customer qualifies for is a card (glass edge, `--cat-3` disc, "Up to" limit), and a customer not paid into GCB sees one slim row with a Copy Account Number button. `GLASS_TILE_CLASS` in `ui/list-card.tsx` is the shared tile edge. Insure and Loans share the Dev Mode switches (`useCardLooks` in `PlanCards.tsx`, one store): card look, layout, and the "before you can use it" prompt (`ui/setup-prompt.tsx`: slim row, setup card, progress track). The setup-card and track copy (Insure profile steps, Loans advance steps) is English only until one is chosen; add FR, ES and ZH rows then, and delete the other looks.
- Decision: the plan dialog (`PlanDialog.tsx`) has a tinted top block with the plan colour, name, description and the price once; the benefits and facts no longer repeat it (chosen from `prototype/insure-plan-dialog-prototypes.html`). The "Premiums from" bullets are gone from the plan data.
- Cleanup: card looks (plain, coloured, with art, with image, with price) and layout (two columns, one column) are Dev Mode explorations in `lib/insure-cards-store.ts`. Pick one, delete the rest and the store. "With art" shows the plan icon on a tint (`PlanArt`). "With image" draws a flat scene per plan (`PlanImage`); swap in StarLife's own pictures there when they exist.
- Gap: the "From" price on a plan is a placeholder (`planFromMonthly`; Ultimate Protection assumes age 30 on the shortest term). Not checked in a browser yet, in light and dark or at phone width.
- Decision: Insure is built from the Bancassurance Figma (section 6253:3), one feature per row: profile, buy (4 plans), policy, statement, beneficiaries, pay outstanding, cancel, claims. Code: `components/insure/`, `lib/insurance.ts` (store, pricing math, Dev Mode seeds), `lib/insurance-plans.ts` (every plan fact, server-safe). Dev Mode: Insure presets, profile, policies, arrears, failing requests.
- Decision: buying a policy takes nothing that day. The first premium is deducted in the month and window chosen (Mid-Month 12th–16th / End of Month 26th–31st), and the review says so. Paying arrears is the only Insure action that posts to the ledger now (Bills rail, Bills category, policy number as reference).
- Decision: departures from the Figma. Code instead of PIN everywhere. No Calculate button (the premium appears once inputs are valid). From Account sits at the top of the quote. One policies list on Insure, not a "View & Manage Policies" list per plan. Edit and Delete beneficiaries are one editor (removal is an Undo toast). Pay Outstanding only shows when something is owed. The "have these ready" claim screen is a list at the top of the claim form. Cancel has no code.
- Decision: a trustee is asked for only when a beneficiary is under 18, one per policy, on any plan (Figma shows it on Child Education, and "Trustee 2" per child). Beneficiaries and trustees are kept per customer (`people` in the insurance store) and offered as Saved on the next policy.
- Decision: claim types that can't succeed aren't offered: Maturity before maturity, Surrender Value and Policy Loan before the policy has a cash value, Death without a covered member (a policyholder's own death is claimed by beneficiaries, at a branch). Child Education's Figma "Death" type is replaced by "School Fees" (its school and class fields).
- Question: every price and rule in `insurance-plans.ts` is a placeholder for StarLife: tier premiums, the savings growth (25%), the protection rate, member price factors, the GHS 500,000 non-medical limit, the 90-day waiting period, the surrender rule (nothing in 2 years, then 70% rising to 95%), the 80% loan limit, and what Retrenchment and Policy Cashback pay.
- Question: what happens when a customer answers Yes to being a politically exposed person, or declares a medical condition? The profile records it; nothing else changes yet.
- Gap: Savings Protection, Vehicle, Travel and Personal Accident are listed as Coming soon; the Figma has no flows for them.
- Gap: seeded premium payments live on the policy, not in the account ledger, so they don't show in Transactions. Only arrears paid in the app do.
- Gap: cancellation can't be withdrawn once requested, and claims stay "Under review" (no approved, paid or declined states yet). A declined claim will need its reason and a way back (CONSTITUTION §1).
- Reuse: `BeneficiaryEditor` (shares to 100%, saved people, minors and trustees) fits any future nominee flow, such as pension or a term deposit nominee.
- Decision: Loans is built from the SALARY ADVANCE Figma (sections 1471:458 salaried, 1471:459 National Service, 1471:460 pensioners). One flow serves all three, named for the customer's income; the bank decides which applies (`income` in `lib/loans.ts`), so the Figma's three-option chooser shows only the customer's own advance. Code: `components/loans/`, `lib/loans.ts`; routes `/loans`, `/loans/salary-advance`, `/loans/[id]`, `/loans/[id]/repay`. The old toast-only `/loans/salary-advance` page is replaced.
- Decision: departures from the Figma. Loans is one page (Your Loans, Apply) instead of the Apply / View / Calculate menu; Calculate Loan Eligibility belongs to the Personal Loan, which isn't online. Costs show on the form as soon as the amount is valid. The Salary Account switch is said on the form with its GHS 10 monthly fee, and agreed in the same checkbox, instead of a notice after Submit. "Already have an advance" is a page state, not an error dialog. Repay is the full amount only. Code instead of PIN.
- Decision: an advance is requested, then approved or declined by the bank (Dev Mode → Bank decision). Approval pays the amount less fees into the chosen account (ledger `paymentMethod: "loan"`, excluded from Insights like term deposits). A decline states the reason and when to ask again.
- Decision: the dashboard's Recommended for you advance now uses the customer's real limit and only appears when they qualify, hold no advance, and their income account isn't empty (CONSTITUTION §1).
- Question: the Figma's example figures don't agree with each other (GHS 80,000 requested against a GHS 20,000 limit; "Facility Fee (0.0%)" of GHS 400; "2.17%" shown as GHS 172.8 a day). The prototype uses processing 1% and facility 0.5% up front (matching the 800 → 788 example), interest 2.17% a month charged daily (monthly ÷ 30), a 5% monthly late charge on the advance, a GHS 100 minimum, 80% of one month's net income, and paydays on the 25th (salary), 28th (allowance) and 20th (pension). All need the bank's numbers.
- Question: is the account class for pensioners and national service also called "Salary Account"? The Figma says so on all three rows.
- Gap: the proactive "You qualify" push (Figma 1:8) isn't built; there is no notifications surface to put it in. The dashboard card covers it for now.
- Gap: the advance has no automatic repayment on payday in the prototype (only Repay Now, and Dev Mode's Overdue state). A partial repayment isn't offered.
### 2026-10-22
- Discovery: another GCB internal corporate product (trade and statutory payments) onboards like this: anyone at the company (often the secretary) applies online, types the business details, uploads a letter from a downloadable template and accepts forced-scroll terms; emails go to the requester and the company address. Bank side: verify mandate against Flexcube (shows "two to sign"), return with a reason on mismatch, RM picked up from the account, negotiated rates/fees set, and the bank chooses which accounts are enabled. Users get Initiator, Reviewer or Authoriser plus per-user limits, a company Admin, and a GCB Super Admin; routing is automatic; first login forces a password change. Payments show a stage tracker.
- Decision (designer, 2026-10-22): a non-signatory (such as a company secretary) can start a company's application. Today `/business/signup/enrol` still needs a signatory's code at step 2, so it has to change. Signatories confirm only by signing the generated request letter, as today.
- Decision: built on branch `corporate-draft`. "Who's applying?" lists the signatories plus Someone Else (name, position, mobile, email; the code goes to that mobile). A non-signatory isn't a user unless they choose Add Myself on the users step. The letter names them as the contact, staff see "not on the mandate", and the bank's confirmation call goes to a signatory (`enrolmentTimeline`, `verificationCall.calledNumber`). Updates are emailed to the applicant and the company address (`CorporateCompanyRecord.email`). Demo hub: "Company secretary applying".
- Gap: anyone with a company account number sees its account names, last four digits, and signatory names with masked mobiles at steps 1–2. That was already true, but opening the flow to non-signatories widens who reaches it. Ask the bank whether lookup should show less until the letter is verified.
- Gap: no seeded application from a non-signatory in `/admin/enrolments`, and the emails are copy only.
- Decision (designer, 2026-10-22): businesses without a GCB account get a call-back request, not account opening (that stays out of Phase 1). `/business/signup/new-to-gcb`: sole proprietor or company → business name, contact, mobile, email, town → "our business banking team will call". Reached from the business door's first question, and from the company not-found and sole proprietor no-account screens (which replace Find a Branch with Open an Account).
- Decision (designer, 2026-10-22): the business door asks the personal door's question first. `/business/signup` is "How Would You Like to Register?" (GCB Account Holder / New to GCB), then account holders choose Sole Proprietor or Company (`?step=type`). The tile is a shared `components/auth/ChoiceTile.tsx`; `/get-started` still has its own inline copies and could adopt it.
- Question: who picks up these requests (RM pool, central corporate team, nearest branch), how fast, and what documents the customer should bring? The page promises no turnaround or document list until the bank says. Nothing is stored and no staff queue exists.
- Decision: workstream 1, the control model, built on `corporate-draft`. Roles are Inputter, Reviewer, Authoriser and Admin (session migration maps old Maker/Approver sessions). `lib/corporate/controls.ts` is the one table: each user's role, limit for one payment and visible accounts, the approval matrix (review above GHS 50,000) and a company daily limit (GHS 2,000,000), all placeholders the bank will set. A payment goes review → authorise; each step can comment or send back (comment required); only the Authoriser's step needs a code and releases the money. Queues show only steps for your role, on accounts you can see, never your own. Account lists everywhere go through `businessAccounts()`, which filters by the user.
- Decision (mine, confirm): reviewers, authorisers and admins don't see Send & Pay or the home payment doors; only inputters (and sole proprietors) start payments. BRL-04 allows two roles if segregation holds, but no persona needs that yet.
- Decision (designer, 2026-10-22): user administration is option C, recorded in PRODUCT.md §7 (it replaces the read-only Administration from earlier today). Business personas renamed: Inputter Ransford Gyasi, Reviewer Justice Oduro, Admin Samuel Quartey (same names as retail personas, separate identities). Demo: Samuel's pending "Add Kojo Asamoah" waits in Esther's Approvals.
- Decision: the header Dev Mode menu is business-aware. With a business signed in it lists the business users by role (from `COMPANY_USERS`) and Role flows that sign in as the right role and open the screen (`components/corporate/dev/BusinessDevMenuItems.tsx`); the badge shows the role. Before, it showed the personal Clean/Single/Everyday customers and switching dropped you into personal banking.
- Decision: business Home differs by role: inputters see Sent Back to You and how many are still waiting; reviewers and authorisers see their queue and user changes; admins see user changes waiting for a second person. Seeds added: `txn-apr-001` (waiting for review) and `txn-ret-001` / `apr-007` (sent back by Justice).
- Override (designer, 2026-10-22): business banking's brand accent is smoke ash, not GCB amber (CONSTITUTION §4 says primary is amber). Scoped by `<html data-app="business">` while a /business page is open (`app/business/layout.tsx`, `components/corporate/BusinessTheme.tsx`); tokens in globals.css "Business banking theme". Only the accent, icons and hero move; warning amber, status and categorical colours stay. Propose amending §4 to say so if this sticks.
- Decision: business pages follow the personal layouts. Home uses the shared hero frame (moved to `components/hero/hero-frame.tsx`; personal re-exports it) with role panels on the sheet; lists use `ListCard`; account details use the personal card-and-actions layout; Send & Pay uses the hub grid with ash glass icons.
- Gap: `/login?type=business` and the GCB logo eagle stay amber (shared sign-in; the logo is the brand). Bulk and Trade only got a mechanical pass (list card, rhythm), not a redesign; Trade is still held and bulk is workstream 2. Not viewed in a browser yet.
- Question: does the bank accept a two-person change inside its ceilings as the "authorised change" BRL-05 asks for? And may an Authoriser be the second person, or only another administrator?
- Gap: user changes aren't in an audit trail screen, no SMS or email is sent, a suspended user can still sign in as a persona, and a pending change can't be withdrawn by its proposer. The bank's ceilings (`BANK_SETUP`) are constants until workstream 7 builds the bank setup screens.
- Gap: the mandate's dual signing ("Both to sign") isn't modelled as two authorisations; every payment needs one Authoriser. Needs the approval matrix by mandate (FR-ADM-04).
- Gap: limits by channel and payment type (BRL-06, FR-COR-08) and a per-account daily limit aren't modelled; only per-user and company-wide. Bulk, standing orders and trade don't go through the new path yet; `/business/payments/bulk` and `/standing/new` aren't role-guarded by URL.
- Gap: an authorised payment's receipt shows "Processing" without who authorised it; the trail only shows while waiting or sent back. The transactions status filter has no "Sent back" option.
- Gap: Viewer role isn't modelled in the app (enrolment still offers it). No suspended-user sign-in state.
- Reuse (later): signatories could confirm by an SMS link to their mandate-registered number, as many as the signing rule needs, with the letter as fallback. Faster, but needs the bank to accept it in place of wet ink. Not built.
- Question: does the bank choose which company accounts are enabled for internet banking, per company and per user (UAR-05)? Neither the enrolment flow nor `/admin/enrolments/[id]` has this, nor limits, an approval matrix, concession pricing or a checker step (UAR-06).
- Question: is the customer-side Corporate Admin allowed to transact, or kept apart from Inputter/Authoriser for segregation of duties?
- Decision (proposed, not adopted): don't copy emailed credentials, forced password change, forced-scroll terms or typed business details; we already resolve the company from the account number and activate by link.

### 2026-10-21
- Decision: the transaction sheet shows what the row knows at once and fills the rest through `useTransactionDetail` (lib/transaction-detail.ts), with a skeleton and a retry. In the prototype it only simulates the call; swap in `GET /transactions/:id`. Dev switches on the list (detail instant/slow/fail) live in lib/transaction-dev.ts. A 5,000-row stress switch was tried and removed; it held up in the browser.
- Decision: the sheet leaves out rows with no data instead of inventing them (time, narration, category, account, fee). A missing fee is unknown, not zero, so the Amount / Fee / Total block shows only when `fee` is recorded.
- Gap: no seeded transaction has a `fee`, so the breakdown block is hidden for all demo data. Seed fees from the fee table (one source per fact) or decide the sheet's rule.
- Gap: for a real backend the list still filters, searches, pages and exports in the browser. It needs server-side search and filters, cursor paging (new items shift page numbers), a server total, server CSV, and exact amounts (minor units or strings). The open transaction should be an id in the URL, and receipts server-issued.

- Override: input placeholders are 14px on touch too. `globals.css` forces inputs to 16px on `pointer: coarse` (stops iOS zoom); placeholders now opt out via `input::placeholder` at 14px. CONSTITUTION §5 says placeholders match the value's size; the designer asked for the smaller placeholder on mobile. If it should become permanent, propose the constitution change.
- Decision: placeholders shortened to about 30 characters or fewer, keeping the example or the intent (for example "Search by name or number", "Card nickname"). New FR/ES/ZH rows added. Left as-is: the Sidi widget strings (no catalog rows at all, pre-existing gap).
- Gap: groups tab on mobile (`app/(customer)/beneficiaries/page.tsx`, `renderGroupRow`) shows an extra space under the last row in the designer's screenshot. Not reproduced from code yet; needs the element or a device check.
- Decision: personal sidebar regrouped (`retailNav` in `lib/navigation.ts`). Home, Accounts, Send & Pay, Cards / Insure, Invest, Loans / Beneficiaries, Transactions, More Services (Lifestyle, FX Rates, EagleSave) / Help & Support pinned to the bottom. My Profile removed because the header account menu already has Profile, Settings and Security (don't build a second account menu in the sidebar). Mockups: the "Sidebar Variations" canvas, variation 16.
- Decision: Settings is a modal (desktop, section list on the left) and a bottom sheet (phone, list then drill-in), not a page. Three sections: Profile, Security, Alerts. Opened by `?settings=<section>` on any page (`lib/settings-modal.ts`, `components/settings/`), mounted in `CustomerShell`. `/settings` only redirects old links. The header menu has one Settings item for customers (Profile, Security and the old Preferences tab are gone; theme and language stay in the header menu only). Mobile and email changes need a code sent to the current one; address saves straight away. Alerts are real switches (`ui/switch.tsx`) that save instantly. Mockups: the "Settings Hub Variations" canvas, boards M1 to M5.
- Decision: every modal now eases between dialog and bottom sheet as the width crosses `sm` (browser zoom), and slides up from the bottom edge and back on close below `sm` (CSS block "Every modal is one surface…" at the end of `globals.css`; opening and closing are transitions on `data-starting-style`/`data-ending-style`, no keyframes, so a resize never restarts them). Settings sheet and the two forms that forced `h-[92dvh]` on phone (`beneficiaries` add sheet, `EditGroupModal`) now fit their content, up to 92%/88% of the screen. Page padding and the shell card's radius ease at breakpoints. Full-screen dialogs, side sheets on desktop, the sidebar's breakpoint switch (fixed to in-flow) and page grids were left alone.
- Override: theme and language are also in Settings → Preferences (designer asked), so they live in two places: the header account menu (quick toggle) and Settings. Designer confirmed keeping both, so this is deliberate, not a duplicate to clean up.
- Discovery: transaction logo lag came from `next/image` sending every new logo through the optimizer (a request plus an AVIF encode each), and from a few oversized source files (`dvla.png` 332KB, `fnb.png` 256KB, `first-bank.png` at 1108px). Fix: logos in `public/brands/` cut to 144px max (1.8MB to 0.4MB), `TransactionMark` serves them `unoptimized`, and `/brands/*` now has the week-long cache header. New logo files should be added at 144px or less; replacing one under the same name can be stale for up to a week in a browser that already has it.
- Decision: the Send & Pay chooser strips (bank, wallet, cash-out code, bills, airtime and data) now show at most 5 saved recipients, then a "See all" tile that opens a "Choose a recipient" modal with search over name, bank and number (`RailBeneficiaryStrip` and `BeneficiaryPicker` in `payments/flows/beneficiaries.tsx`). Restored from the Oct 15 work (`89c84c0`) without its pin, last-paid and ranking, which the Oct 16 revert removed on purpose: the strip shows saved order and the picker is A to Z. The type-ahead under recipient fields (`SavedRecipients.tsx`) is unchanged. Not touched: the group-payment strip in `PaymentFlow`.
- Decision: network and bank pickers look alike. Both show a 28px mark and the name in the field and in every option. Banks use `BankMark` (`ui/bank-mark.tsx`: the logo from `lib/brands.ts`, otherwise a grey circle with a bank icon, never initials) and the bank picker opens with a search field (`BankSelect` in `flows/shared.tsx`, a popover styled as a select; networks stay a plain select because the list is short). The saved-recipient strips space their avatars at 16px (`gap-4`, was 8px).
- Gap: only `BankSelect` was changed; other bank-name displays (receipts, review rows, standing orders list) still show text only.
- Decision (rule, in CONSTITUTION §3): one scrollbar everywhere. `globals.css` styles every element's scrollbar thin and quiet; `custom-scrollbar` only adds the stable gutter.
- Gap: the add-beneficiary sheet and EditGroupModal grow as fields appear and now jump instead of holding one height; wrap their bodies in `SmoothHeight` if that feels abrupt.
- Candidate pattern: URL-param modal (`?settings=…` with `history.replaceState`, no Back step, deep-linkable). Reuse for other large modals if one appears.
- Gap: Settings step-up code is the demo `000000`, and "Change password" doesn't check the current password. Proxy Pay ID may belong in Receive money, not Profile. Business and admin have no Settings modal (admin header item still goes to `/settings`).
- Decision (supersedes the 2026-10-20 note on `lib/schedule-handoff.ts`): Schedule Payment is its own form, `/payments/schedule` (`SchedulePaymentFlow`), not the standing-order form. It is opened from the success page of any payment (the card is no longer hidden for ECG, bills, QR, SWIFT, PAPSS and the rest) and receives what the receipt showed: recipient, account or number, bank or network, bundle, payment method, amount, fee, source account and narration. They are shown filled in, and only the frequency, first date and end are asked, then a one-time code. The record it saves is a normal standing instruction, named "kind · recipient". `StandingOrderFlow` is back to its own form with no handoff code. Opened with nothing to carry (a refresh), it goes to a new standing order.
- Decision: "Standing order" is now "Scheduled payment" everywhere in the personal app, because the standing-order form and Schedule Payment make the same record. The list is Scheduled Payments (`/payments/standing`, URL and code names unchanged: `StandingOrderFlow`, `saveStandingInstruction`, `nibs-standing-orders`), "Select a standing order" is "What do you want to schedule?", the success title is "Payment scheduled", transactions made from one read "Scheduled Payment — name". FR/ES/ZH rows rewritten to match. Business banking still says "Standing order" (its own copy, `app/business`, `components/corporate`, `lib/corporate`); decide whether it follows.
- Decision: a scheduled payment opens as a right-hand sheet over the list (`ScheduledPaymentSheet`), like a transaction, not as its own page. Pause or resume and cancel (with its confirm) are in the sheet; a cancel closes it and says so in a toast. `/payments/standing/[id]` now only redirects to the list. Business banking still has its own detail page.
- Decision: the collapsed Beneficiary Details row leads with the provider's logo, not initials (`provider` prop on `CollapsedDetailsBadge`): the bank on other-bank, GCB, wallet-to-bank, PAPSS, international and scheduled bank payments, and the biller on bills. A provider with no logo file gets the grey bank mark. Mobile networks already showed their logo. Proxy, group, own-account and QR rows keep their own marks.
- Gap: other success pages (Invest buy and maturity, statement and account requests, group creation) still show a Schedule Payment card that opens an empty standing order. Those aren't payments to schedule; hide the card there with `hideSchedule`.
- Decision (rule, CONSTITUTION §9): one spinner. `AppLoader` now draws the dashed ring (`Classic` from `loading-dev`, was `Snake`), and the three hand-made `Loader2` spinners (cards list, cards panel, bills verifying) use it. The refresh and retry icons that turn (`RefreshCw`) are actions, not loaders, and were left.
- Decision: every Work in progress page shows the app's spinner (`AppLoader`) in the circle instead of the hammer. `/eaglesave` and `/help` now exist as Work in progress pages, so their nav items no longer 404. Still placeholders: Insure, Loans, Lifestyle, EagleSave, Help & Support.
- Gap: Beneficiaries and Transactions are separate groups to the sidebar renderer, so the More Services header sits one group gap below them rather than inside the same block.

### 2026-10-20
- Decision: a brand logo is drawn only on rails where the name comes from the system (bill, qr, card, airtime, data, wallet-to-bank, own-account). Payments to people keep the grey icon, so a payee named "MTN Ghana" can't borrow a logo that reads as verified (`TransactionMark`, `LOGO_RAILS`).
- Gap: the lasting fix is a biller or merchant id on `Transaction`, set where the payment is made (PaymentFlow, StandingOrderFlow, Scan & Pay, corporate payments), and `brandLogo()` looking logos up by that id, not by name. Needed in the production data model; logos should never be chosen by matching name text.
- Decision: Transaction History uses variation 2 (docs/transaction-history-variations.html). One quiet mark per row (hairline circle, grey icon, real logo where we have one), no box around the list, no tint colours, no green credits: direction is the + / − sign. Money in also gets a small grey corner arrow on the mark (money-in variation 1, docs/transaction-money-in-variations.html), because the sign alone made incoming rows too easy to miss. Shared by every list through `TransactionMark` and `amountStyling`, business included. The `--tx-*` tokens are deleted. Delete both variations files once the design is settled.
- Gap: `TransactionIcon` is still unused (see above). Money-in is still green in the transaction sheet's hero amount and in notification rows; decide whether those follow the list.
- Question: Transaction History feels busy (tinted marks, corner arrows, green credits, boxed list). Ten calmer versions are in `docs/transaction-history-variations.html`; none chosen yet. Build the chosen one behind a Dev Mode switch, then delete the rest.
- Decision: branch `feat/beneficiaries-transactions` joins design-exploration (beneficiaries, sheets, brand logos, `TransactionMark`, detail sheet), main (business onboarding) and the transaction display redesign. Where the last two clashed, the logo marks and the detail sheet won.
- Gap: `TransactionIcon` and `TransactionItem` (category icons, from feat/transaction-display-v2) are in the repo but nothing uses them. Either fold the category tint into `TransactionMark` or delete them.
- Discovery: how GCB onboards companies to internet banking today (Esther, call of 2026-10-16). A request letter on company letterhead plus the IB application form, sent by email, post or at a branch. The form holds the account number and name; each user's email, phone and date of birth; signatories' names and designations; and each user's role (Initiator, Authorizer, Viewer). The RM, or CBD and retail groups where there's no RM, checks the signatures against Flexcube; a mismatch stops the request. Requests go to the RM, the branch (by branch code) or a central pool, where someone approves or declines. On approval the user gets their username by SMS and a set-password link by email.
- Override (designer, 2026-10-20): companies apply online again, reworked to the bank's process. `/business/signup/enrol` (account → signatory code → users and roles → review → generated letter, upload or send it another way), `/business/signup/status`, letters recorded by staff in `/admin/enrolments`. Reverses this morning's "set up at your branch" reading of FR-ADM-05; the bank still reviews everything. Needs the bank's confirmation (question 4 of the 15).
- Question: Viewer is on the bank's form but not in BRD v2; v2's Reviewer isn't on the form. The application offers Inputter, Authoriser, Viewer. Confirm with the bank.
- Question: the bank's form collects date of birth; we collect a Ghana Card number for non-signatory users instead, because activation matches it. Confirm which the bank wants (or both).
- Question: Esther says users get a system-issued username by SMS. Business sign-in uses the mobile number. Which is it? (Links to the shared-number question above.)
- Question: can our generated letter, with its user annex, replace the bank's separate application form? We need the real form's layout if not. `components/corporate/onboarding/request-letter.ts`.
- Gap: `/admin/enrolments` still has no "capture an application" form for one that arrives entirely on paper; staff can only record a letter for an online application. It also still uses hand-styled boxes, emerald colours and a raw `<select>` (pre-existing).
- Gap: the request letter opens in a new tab in English only; it's a document addressed to the bank and the translator doesn't reach it.
- Gap: the signatory-code step assumes Flexcube holds a reachable mobile for every signatory. If none is reachable, the only path is the branch.
- Decision: business banking is its own surface under `/business` (approvals, administration, trade, bulk payments, `/business/overview`), split from retail `(customer)`. A lint firewall (`eslint.config.mjs`) stops either side importing the other. The split is staged: shell and routes first, shared libs and borrowed pages next.
- Discovery: corporate users had no dashboard. `/overview` was the retail `GcbDashboard`. `/business/overview` is now a small ledger-derived home (total available, approvals waiting, accounts, two payment doors).
- Decision: business data lives in `src/lib/corporate/` (`ledger.ts` accounts, transactions, cards, standing orders, card activity and sign-in people; `approvals.ts` queue and trade versions; `roles.ts`, `navigation.ts`, `insights-model.ts`, `cards-dev.ts`). `lib/mock-data.ts` still assembles one ledger from both, in the original order, so no screen changed. In the production split, `lib/corporate/` is the business app's.
- Gap: `DEFAULT_PROFILE_KIND` is still `CORPORATE`, the prototype's old default for unmarked data. Every seeded row has an explicit kind, so it only decides a standing order whose account is missing. Make it explicit or drop it.
- Decision: `/business` has two route groups. `(app)` is the signed-in shell (home, approvals, administration, trade, bulk payments). `(entry)` is signed-out business signup at `/business/signup`, `/business/signup/enrol` and `/business/signup/status`. Business signs in at `/login?type=business`, and signing out or an expired session returns to that door.
- Decision: the Demo hub has a Switch app row (personal or business, signed in or at the log-in screen, business as Maker, Approver or Admin) and a Personal onboarding / Business onboarding / Log in toggle. The Log in view lists sign-in, wrong password, welcome back, PIN and new device for both apps, plus forgot password and forgot PIN on any stage (`?stage=`; `/login?state=error`). The Business view lists new-business signup, existing-company enrolment, status tracking (with the staff review queue) and invited-user activation, via `?scenario=`, `?ref=` and `?step=` links. `BusinessFlowSections.tsx` reads the scenario lists in code, so a new scenario shows up there on its own.
- Decision: the two apps are fully separate (scope A). Business has its own Accounts, Send & Pay (supplier payment, bulk, standing orders) and Transactions, a trimmed nav that lists only business pages, and chrome (header, bottom bar, FX modal, assistant) that never points at a personal screen. Back is surface-aware (`lib/nav-history.ts`): it only pops to a page of the same app, otherwise to the page's own parent, and `useContextualBack` has no default fallback. A business relationship on a personal URL goes to `/business/overview`. Lint rejects any personal path in business code.
- Decision: Pay a Supplier is submit-for-approval. The maker confirms with a one-time code; the payment lands in the approvers' queue and on the ledger as awaiting approval; an approver's decision settles it (`lib/corporate/payments.ts`). Recent suppliers come from the ledger; there is no saved-suppliers list.
- Decision: shared building blocks take their links as props (`TransactionList`, `TransactionDetailSheet`, `TransactionReceipt`). `TransactionDetailSheet` still defaults its "Repeat" to the personal Send & Pay link when no prop is given; personal callers rely on that.
- Decision: the seeded notifications were business's, so they moved to `CORPORATE_NOTIFICATIONS` in `lib/corporate/ledger.ts` and personal banking got three of its own (money received, payment sent, airtime).
- Decision: deleted the dead dashboard widgets (`LiquidityDeck`, `LiquidityRail`, `LiquidityCore`, `QuickActionBar`, `ActionRequiredWidget`, `ActivityFeed`): no importers, made-up cashflow figures, links into business.
- Gap: business has no Cards, Beneficiaries (so no saved suppliers: Pay a Supplier should offer a saved list once a hub exists, per "two journeys, one store"), Reports, Settings/Profile/Security, Notifications, FX rates. The header bell and Profile/Settings items are hidden on business until those exist. `CORPORATE_NOTIFICATIONS` has no screen.
- Gap: the business "User activity" report (admin only, from the audit trail) left with the personal Reports page; rebuild it under `/business` (probably Administration). Personal Reports is still reached by personal insights links only.
- Gap: maker-checker is partial. An approver's approval does not ask for a one-time code (constitution §2 says every payment is authorised with one), and standing orders and bulk payments are not sent for approval.
- Gap: business cards simulation tables (`lib/corporate/cards-dev.ts`) and the `CORPORATE` branches in `cards-dev-store`, `insights` and `dashboard-insights` have no business screen reading them yet.
- Gap: `lib/profile.ts` (`rowKind`, `isBusinessProfile`, `DEFAULT_PROFILE_KIND`) is still used by the shared data layer and chrome. `DEFAULT_PROFILE_KIND` is still `CORPORATE`, the prototype's old default for unmarked data; every seeded row has an explicit kind, so it only decides a standing order whose account is missing.
- Gap: `PaymentFlow` and the personal flows still carry retail rails only; nothing in business uses them, so the 3,700-line machine is personal's alone now.
- Decision: `/select-banking` is demo-only. It shows wherever the Demo hub does (`SHOW_DEMO_HUB`) or in dev (`SHOW_DEMO_TOOLS`), and 404s otherwise. Gating on `SHOW_DEMO_TOOLS` alone would 404 it in the live build, where the hub is deliberately on.
- Gap: `migrate`, `signup` and the personal sign-in paths still push `/overview`; that is right for personal flows. Login (trusted device), activate and forgot-pin now use `homePathForActor`.

- Discovery: new BRD received, "Internet Banking Revamp, Phase 1" (GCB/DT/BRD/IB-REVAMP/P1, 59 pages, cover says v0.2, document control says 1.0, a consolidated draft for stakeholder validation dated 2026-09-09, go-live 2026-12-15). It lives at `Downloads/GCB Internet Banking Phase1 BRD Final 0.pdf`, not in the repo. IDs are now BR-, FR-RET-, FR-COR-, FR-ADM-, FR-SHR-, NFR-, BRL-, SEC-, UAR-, RPT-, INT-. It trims the prior corporate document (the Jan 2026 NIBS BRD, FR-01 to FR-38) to a Phase 1 subset (OS-08). PRODUCT.md still describes the old one until the conflicts below are settled.
- Conflict: **trade finance is not in the new BRD.** Letters of Credit, Open Account, Documentary Collections, Advance Payments and trade tracking (old FR-10 to FR-16, FR-25) do not appear anywhere, and "trade" is not named in the out-of-scope list either; OS-08 says unprioritised corporate features carry to later phases. We have Trade, trade approvals and an admin Trade Officer. Needs the bank's answer: out of Phase 1 or just unlisted.
- Conflict: **profile switching and single login are gone** (old FR-01, FR-02, BO-03). BR-04 says Retail and Corporate have distinct authentication models, and corporate has its own Web and Mobile models. This supports decision D1 (two separate views) and closes the old BRD conflict. Credential continuity for existing corporate users is still open (D-10, R-05).
- Conflict: **corporate roles changed.** New: Inputter (initiates, cannot approve, need not be on the mandate), Reviewer (any number of levels, no fixed upper limit, on the mandate), Authoriser (final approval, on the mandate), customer-side Corporate Administrator (scope to be confirmed), Group Administrator. We built Maker, Approver, Admin and Viewer, with a single approval level.
- Conflict: **customer self-service user management is replaced by bank-side setup.** Old FR-17, FR-18, FR-35 and FR-36 had corporate admins create users, assign limits and reset passwords. New BRL-05 and FR-ADM-01/02/07 say bank administrators set rights from the mandate, and the customer admin can only view or, where the bank permits, maintain. Our Administration screens and the enrolment "users and roles" step assume the old model.
- [REOPENED 2026-10-20, see Override above] Conflict: **corporate onboarding is in-branch** (FR-ADM-05, branch officer role; the only self-onboarding in the corporate scope is Sole Proprietor, by Ghana Card or passport). Resolved per designer instruction: online enrolment and account opening deleted; companies set up in-branch, sole proprietors self-onboard online.
- Conflict: **SWIFT is excluded** from Phase 1 (OS-01, BRL-25), but "Outside Ghana" (SWIFT) came back into Send Money on 2026-10-01. Applies to personal banking. Corporate has PAPSS outward only.
- Conflict: **standalone treasury bills are excluded** (OS-05); Phase 1 investments are term deposits and in-house products. We built a Treasury Bills & Bonds hub (decided 2026-10-08). The term deposit hub stays.
- Conflict: **languages.** The scope and A-10 say French and Chinese, BR-37 and FR-SHR-11 say English and French, NFR-21 says English only. We ship French, Spanish and Chinese; Spanish is not requested anywhere.
- Conflict: **typeface.** A-09 assumes the Milo typeface (or one MarCommX approves); the constitution says Open Sans only.
- Conflict: **pricing.** BRD v1 listed pricing and tariffs as out of scope. BRD v2 requires charges and commissions to be configurable without code change (BR-20, FR-SHR-10, BRL-15, NFR-24) and concession pricing set per user and transaction type. Treat configurable charges as in scope; the actual prices stay the bank's (D-12, R-12).
- Conflict: **business standing orders.** BRD v2's corporate scope has payment and transfer scheduling (FR-COR-31) and keeps single transfers (FR-COR-25), but lists standing orders for retail only (FR-RET-31). We built business standing orders. Ask whether corporate standing orders are wanted.
- Decision (2026-10-20): workstream 0 done. PRODUCT.md now carries BRD v2 as the baseline: both BRDs are named, v1-only items are marked `[NOT IN v2]`, and the decided items that disagree with v2 are marked `[CONFLICT]` (they stand in the prototype until the bank confirms). The BRD v2 PDF is not in the repo.
- Conflict: audit retention. Old FR-21 said at least five days; new NFR-23 and OI-11 leave the period to be confirmed.
- Discovery: **corporate payments in the new BRD.** One bulk file can mix eight rails (MoMo for MTN, Telecel and AirtelTigo, ACH, NRT, Express, GCB account, GIP, GhanaPay wallet, OBVAM), by upload or on-screen entry, with per-line routing and status, a downloadable error report, duplicate detection and a batch ID. ERP batches (XML or JSON over API, no VPN or file drop) get the same batch and workflow and are never released straight through. Express has a daily cut-off, understood to be 13:00 (OI-08). Our bulk screens are still the original stub.
- Gap (corporate, new in the BRD and not built): Ghana.gov and SSNIT payments; payment and transfer scheduling (funds checked at execution time, never released unless fully approved); PAPSS outward; virtual cards (create for staff or clients, top up one or in bulk, details sent to designated recipients); cardless tokens (single or CSV, sent to recipients); foreign-currency accounts with own FX to local transfers at the bank's rate (no third-party FX transfers, BRL-22); host-to-host API with bank-side activation, API principals, documentation and status return; the Corporate Transaction Approval mobile app; multi-company and subsidiary setup with a group view; business spend analysis; corporate branding from a bank palette (Could); concession pricing; per-user account visibility (UAR-05).
- Gap (corporate controls): segregation of duties enforced by the system (BRL-04); limits by user, role, account, channel and transaction type plus a daily entity and account limit (BRL-06 to BRL-08); a transaction releases only after every configured level approves (BRL-09); a rejection at any level returns to the inputter with a comment (BRL-10); comments at each approval level; funds checked at release; bank-admin changes under maker-checker (UAR-06); periodic access review report (UAR-08); dormant user handling (UAR-09); customer notified on beneficiary, limit, credential and device changes (SEC-16); fraud screening that can hold, flag or block (SEC-14); duplicate submission detection (SEC-19); no partial or duplicated postings with a reconciliation position (SEC-20).
- Gap (shared): the standard transaction reference must carry channel, date, time and a uniqueness part (FR-SHR-04, BRL-16), ours is `NIB-2026-884213`; a beneficiary is validated before it can be saved, and a verified name is reused (BRL-17, BRL-18); one receipt standard across channels; statements PDF by default with Excel as the alternative; OTP through the dedicated Internet Banking short code; notification channels SMS, email, WhatsApp and push by preference.
- Gap (reports): corporate dashboard with volumes, payment status, pending approvals and activity (RPT-05, Must); batch and per-line status with export (RPT-06); group view (RPT-07, Should). Bank-side reports RPT-08 to RPT-17 (cardless, channel, onboarding, approvals and exceptions, failed and reversed with reason codes, access and audit, adoption, host-to-host, service performance, regulatory extracts) belong to the admin portal.
- Gap (personal banking, new in the BRD): Express rail beside GIP, ACH and NRT; bank letter and cheque book requests with tracking; passport onboarding for diaspora; retail bulk by CSV; peer-to-peer by personal QR (Should) and a personal QR in the profile; save-on-transaction (Could); Lifestyle merchant feed with merchant-side QR payment (Should); debit card management (Should); salary-advance default through the loan system; Spends savings suggestions (Should).
- Question: the BRD refers to open items it does not list: OI-01 (password reset method: Ghana Card, security question, or OTP with PIN), OI-06 (direct G-Money interface), OI-07 (OBVAM naming), OI-08 (Express after cut-off), OI-09 (maximum records per bulk file), OI-10 (what happens to unredeemed cardless tokens), OI-11 (retention), OI-13 (accessibility standard), OI-24 (UAT checklist dates). Ask for the open items register.
- Question: scope of the customer-side Corporate Administrator, whether the approval app is a separate deliverable for this prototype, which corporate branding elements MarCommX approves (D-11), and whether Phase 1 includes the corporate password reset by in-branch recovery after lockout.

- Question: 15 questions for the bank were drafted from the BRD conflicts and open items (2026-10-20), grouped as scope, corporate setup and roles, payments, security and platform, and the open items register. Answers to 1 to 4 (trade, SWIFT, T-bills, in-branch onboarding) gate the rest. Not yet sent or answered.
- Decision (approved 2026-10-20): bring corporate banking to the new BRD one workstream at a time, plan shown before code, in this order. Only workstream 0 is being executed now; the designer continues with the rest later.

  | # | Workstream | What it covers | Size |
  |---|---|---|---|
  | 0 | Re-baseline the docs | PRODUCT.md updated to the new BRD, with confirmed, decided and unknown items labelled | S |
  | 1 | Control model (everything depends on it) | Inputter, Reviewer and Authoriser tied to the mandate; limits by user, role, account, channel and type plus a daily entity limit; system-enforced segregation of duties; multi-level approval with comments; rejection returns to the inputter; release only after every level; per-user account visibility; approver one-time code | L |
  | 2 | Real bulk payments | Mixed-rail files (8 rails), upload or on-screen entry, validation, downloadable error report, duplicate detection, batch ID, per-line status, limit checks, Express cut-off message | L |
  | 3 | Other corporate payments | Beneficiaries hub with maker-checker (gives Pay a Supplier a saved list), mixed-instrument groups, scheduling, Ghana.gov, SSNIT, PAPSS outward, approval for standing orders | L |
  | 4 | Reports and insight | Corporate dashboard, batch and line status with export, business spend analysis, user activity report, group view | M |
  | 5 | Cards, cash and currency | Corporate virtual cards, cardless tokens (single and CSV), forex accounts with own-FX to local | M |
  | 6 | Shared platform | Standard transaction reference (channel, date, time), receipt and statement standards (PDF and Excel), verified-name reuse, notification preferences, charges shown before confirm | M |
  | 7 | Bank-side admin | Corporate setup by bank admins (companies, users, roles, limits, workflows), branch application capture, host-to-host activation, maker-checker on admin, access review | L |
  | 8 | Integration surfaces | Customer view of ERP/host-to-host batches and status, API documentation page, the approval mobile app as a narrow mobile flow | M |
  | 9 | Personal-banking additions | Express rail, bank letters, cheque book, passport onboarding, retail bulk by CSV, QR peer-to-peer and personal QR, Lifestyle payments, debit card management | L |

  Order: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9. Control model and bulk first, because approvals, scheduling, cards and reports sit on them. Workstreams 4, 5 and 6 are independent once 1 and 2 are done and could run in parallel.
- Decision (approved 2026-10-20): held back until the bank answers the 15 questions: Trade (left as is, not extended), online corporate enrolment and the new-business application (left as is), SWIFT, Treasury Bills, Spanish, the Milo typeface, and removal of customer-side Administration.

### 2026-10-19
- Decision: one `PayeeAvatar` (`components/ui/payee-avatar.tsx`) for every saved person: tinted circle, initials, colour picked from the name, so someone looks the same on every screen. Icon only for billers and airtime. Used on the Beneficiaries page, Pay again and the Send & Pay strips.
- Gap: still hand-rolled avatars in `CreateGroupFlow` (member rows), `StandingOrderFlow`, and `PayeeChip` in `payments/flows/shared.tsx`. Move them to `PayeeAvatar`.
- Decision: tapping a beneficiary or group row opens a short summary sheet (Send, Edit, Remove or Delete); editing is one step further. All sheets use `bg-modal`.
- [SUPERSEDED 2026-10-20] **Conflict** Corporate internet-banking enrolment: Superseded by designer decision to align corporate onboarding strictly with BRD v2 (companies set up in-branch, users activate via link, online application deleted). (Original 2026-10-19 process: existing corporate account holder applied online with wet-ink pack, reviewed by RM/Ops at `/admin/enrolments`).
- Discovery: the dropdown container (`ui/dropdown-menu.tsx`) used to force `variant="destructive"` items back to foreground with `!` utilities, so Log out never went red. Those are gone; use `variant="destructive"` alone. Don't fight Tailwind `!` utilities with unlayered `!important` CSS: layered important rules win.
- Decision: Figma handoff. The Figma TOKENS file's Theme variables follow globals.css; groups stay as the designer's, and each variable's Web code syntax carries the exact CSS name. Section 1 of `docs/figma-token-mapping.md` is applied (41 variables, 5 renamed). Sections 2 and 3 are applied too. All 46 retired variables are in `_deprecated/` with nothing bound to them, and their former layers are bound to code tokens. Section 4 is applied as well, so all 173 active Theme variables mirror globals.css colour tokens with scopes and code syntax. Section 5 (spacing, radius, type) is open. When a colour token is added or changed in globals.css, add or update its Figma variable too, or the next capture won't bind.
- Decision: Figma captures get bound by `scripts/figma/bind-pass.js` (dry run first), not by the importer. Importers bind the first variable with a matching value, so icons ended up on input/border-focus and similar. The pass picks by role and corrects that. Card faces are skipped because `CardFace` colours come from the card theme, not light/dark tokens.
- Gap: there's no capture mode. The Dev Mode pill (Demo hub) shows up in every capture, so for now it has to be deleted in Figma by hand.
- Gap: `ui/button.tsx` base class has `font-semibold`, which breaks constitution §5 (two weights only). Not changed yet. Change token values in code first, then re-sync Figma, never the other way.
- Decision (designer, 2026-10-19): the code moved to a 4px spacing grid (`--spacing: 4px`) with the old density kept. Every spacing class was rescaled from the old 3.5px step to within 1px of its old size: 4,589 classes in 242 files. Below 16px, half steps are used (`p-4` → `p-3.5` = 14px, `gap-3` → `gap-2.5`); from 16px up, whole steps (`p-6` → `p-5`, `gap-10` → `gap-9`, `w-64` → `w-56`). Ties round down. An earlier pass that left small steps alone made Send & Pay scroll and pushed the Card Details list below the action buttons. The root stays 14px, so type and radius are unchanged. Not checked in a browser by the agent.
- Discovery: code that hardcodes a pixel value next to a spacing class has to change with it. `CardsCarousel` scroll step (`+ 14` for `gap-3.5`) and the Sidebar collapsed-centring padding (`px-[11.5px]`, 56px rail) were fixed. The carousel had been 2px off even before.
- Gap: icon buttons are below the constitution's 40px hit-target rule. `button.tsx` `icon` is `size-8` (32px) and `icon-lg` is `size-9` (36px). They were 31.5 and 35px before the grid change, so this isn't new, but `size-10` is now the honest 40px if the rule should be met.
- Decision (designer, 2026-10-19, supersedes the half-step decision below): spacing and radius are cut to small fixed scales. Spacing (padding, margin, gap) uses 2 4 8 12 16 20 24 32 40 48 64: 2,612 classes moved (6→8, 10→8, 14→12, 28→24, 36→40, 56→48, 68→64). Radius uses sm 4, lg 8, xl 12, 2xl 16, 3xl 20, full, set in px in globals.css; 150 classes unified (md→lg, bare/xs→sm, 4xl→3xl, px radii snapped; sheets went 26–28 → 20). Phone gutter is now 12px. Layout clearances above 64 (`pb-24`, `pb-28`) and the 2–3px swatch radii stay. Not checked in a browser by the agent.
- Decision (designer, 2026-10-19): colours snapped to clean ramps (option B, everything, including hero and chart colours). globals.css has a primitives block (`scripts/figma/snap-primitives.mjs` generates it and wrote `docs/primitive-snap-review.html`), and 168 token values point at it. 42 shifted visibly (destructive → red-600, warning → amber-500, primary-foreground → amber-950, charts, pills, hero glass). One fix on top of the sheet: dark `field-hover` is `gray-825`, because `gray-850` matched `field` and hid hover. Figma: Color Primitives hold the same ramps with code syntax (the old warm `gray/*` now holds the neutral values), Theme aliases them, and translucent values hold primitive colour plus alpha because aliases can't carry opacity. Theme is grouped into core, `component/` and `illustration/`. Not yet checked screen by screen.
- Gap: dark `warning-text` is now `amber-400`, the same as the brand amber. Consider `amber-300`.
- Done (2026-10-19): 2. CORE COMPONENTS (lgNxPD7Kn0ZaFZ7Ev1rVwu) remapped by key with `scripts/figma/remap-library.js`: 5,668 bindings across 8 pages, 0 errors, and a rescan found 0 left on retired or orphaned items. That covered retired TOKENS colours and radii, 20 orphans deleted from TOKENS earlier (`radius/*`, `border/width`, `stroke/width`, `text/on-raised|overlay`, old opacity copies; `radius/none` is now a plain 0), and 13 deprecated text styles (Component/Button → Label…). Use the same script for any other file that consumes TOKENS. In that file, "Semantic" is the old name of the Theme collection.
- Gap: CORE COMPONENTS still uses a separate UI-kit library (~30 bindings on Forms and Data: `Depth/*`, `Background/Warning/*`, `Space/*`), non-TOKENS text styles (`Text sm/Medium` 208, `Text xs/Medium` 126, `text-sm/regular` 27…), stray spacing variables (`space-y-*`, `p-1`, `mr-2`) and `family/default` on about 1,400 text layers (it switches to DM Sans in Mobile mode).
- Next: deletion is planned in `docs/figma-cleanup-plan.md`. Phase 1 (77 variables, 13 styles) is ready once every consuming file scans clean. Phase 2 (the old Spacing, Control Sizing, Typography and Brand collections) needs decisions first. One known blocker: CORE COMPONENTS still has 1 binding on `data/yellow`.
- Decision (2026-10-19): Figma has exactly the 10 type roles from `docs/type-audit.md`, built in place on the old styles so their ~2,200 layers stayed bound. All are Open Sans with no family variable, because that variable switched to DM Sans on Mobile. 13 old styles are renamed `_deprecated/`.
- Discovery: the API can't load Open Sans "Medium", but binding a text style's `fontWeight` to the `weight/medium` variable (500) gives Open Sans at `wght 500` through the variable font. That's how all the 500 roles are built; don't fall back to SemiBold.
- Open: about 530 off-scale font sizes in product code (13.5, 12.5, 15, 11.5px; see `docs/type-audit.md`), and the hero-figure rule (40–76) vs the 28px phone hero.
- Decision (designer, 2026-10-19): the dashboard hero is the one exception to the spacing scale. `HeroSplitLayout` uses `sm:pt-7 sm:gap-18 sm:px-9`, and `HeroStack` uses `-mb-7 sm:px-3`, all still 4px multiples, to keep the original proportions. Measured in the browser against the original screenshot: pill at 37/39, actions row at 158, sheet overlap at 239.
- Superseded: keep 2px half steps below 16px (no strict 4px). Spacing has no fractional pixels: the sidebar uses 16px icons on `px-3` (centred in the 56px rail), the panel toggles use `size-4.5`, and action tiles use `size-10`. The Figma Spacing Primitives gained size-2, 6, 10 and 14.
- Figma matches the unified scales: 12 spacing primitives (0 plus the 11) and 5 radii plus full, with code syntax; everything else is in `_deprecated/`. Gap: the semantic `Spacing` collection (spacing/0–15) is still a second spacing scale, and spacing/11–15 point at retired primitives.
- Superseded: Figma Spacing Primitives now cover every value up to 128px that code classes use (size-18, 20, 28, 36, 44, 68, 84 and 124 added on 2026-10-19). Widths above 128px (sidebar, menus) are deliberately not tokens. Still off-grid in code: `gap-[10.5px]` and `rounded-[15.75px]` (radius is undecided).
- Open: radius and type (mapping file, section 5) are undecided. Radius still follows the 14px root (`rounded-2xl` = 15.75px).
- Discovery (Figma cleanup Phase 1 pre-checks): confirmed consuming files (only CORE COMPONENTS consumes TOKENS library). Mapped all Phase 1 primitives (`ink/*` and `data/*`) into `scripts/figma/remap-library.js` with exact keys from TOKENS. Prepared `scripts/figma/delete-phase1.js` (with alias safety guard) and `scripts/figma/verify-phase1.js` for TOKENS and consuming files. Ready for version history tag and deletion run.
- Done (2026-10-19): Phase 1 deletion executed on 1. TOKENS library. All 77 Phase 1 variables (46 Theme, 4 Radius, 14 Spacing Primitives, 13 Color Primitives) and 13 text styles deleted with 0 broken aliases. Exactly 5 deprecated variables remain (`_deprecated/size-56`, `80`, `96`, `120`, `128`), which are deliberately preserved for Phase 2 as they are aliased by `Spacing` (spacing/11–15).
- **Question** For the bank: what are the "dates" on the user list (date of birth, ID expiry)? Must the request letter be on the company's own letterhead, or can we generate it pre-filled? Can signatories confirm by OTP to their mandate-registered mobile instead of wet signatures? Do all listed users get setup links on approval, or only a first admin? Email link vs mobile-number sign-in (2026-10-03 decision).
- **Done (2026-10-19): Corporate Internet Banking Enrolment ("Two journeys, one store") complete on branch `feat/corporate-banking`.**
  - Phase 0: Permanent defaults applied (wet ink mandate pack download/upload, 4 standard app roles with bank hint text, setup link via email + sign-in mobile/password).
  - Phase 1: Shared data model in `corporate-enrolment.ts` and persistent store in `enrolment-store.ts` seeded with 4 realistic lifecycles (`ENR-2026-0814`, `ENR-2026-0812`, `ENR-2026-0790`, `ENR-2026-0720`). Updated `roles.ts` (`RELATIONSHIP_MANAGER`), `mock-data.ts` (account mandate, signatories, RM persona Kwame Asante), and `navigation.ts` (Enrolments admin nav).
  - Phase 2: First-screen choice tiles at `/signup/business` ("Set up internet banking" vs "Open a business account") and replaced dead-end with link to enrolment.
  - Phase 3: Customer self-service flow at `/signup/business/enrol` (6 steps: Account lookup with multi-account company selector, Applicant OTP, Users & Roles with mandate hints, Review, Sign & upload pack, Submitted).
  - Phase 4: Application status tracker at `/signup/business/status` (Reference + OTP lookup, honest timeline, in-place re-upload for returned applications, invite status tracking & resend).
  - Phase 5: Staff administration at `/admin/enrolments` (list & filters) and `/admin/enrolments/[id]` (detail review with side-by-side signature comparison, callback logger, gated approve button, Return dialog, Rejection dialog, Reassign RM/Ops, and immutable audit trail).
  - Phase 6: Hand-off to corporate invite activation in `/activate?invite=1` (with expiration scenarios) and user sync in `/administration`.
  - Phase 7: Verification checks passed (`tsc --noEmit` clean, `eslint --max-warnings=0` clean across all modified files, i18n coverage tested).


### 2026-10-12

- **Decision (Active Persona and Account Holder Cleanup):** Replaced static hardcoded "Kwesi Appiah" occurrences across `LinkSourceAccountModal.tsx`, `ScanAndPayFlow.tsx` (GhQR payload, share text, and card details), and `BillsPaymentFlow.tsx` with dynamic session actor resolution (`actor?.name || "Ransford Gyasi"`), ensuring all simulated personas (Ransford Gyasi, Samuel Quartey, Ishmael Gyan) render accurately. Cleaned up Settings (`settings/page.tsx`) fallback from stale "Kodjo Mensah" to "Ransford Gyasi" with hydration synchronization, updated `ProxyIdModal.tsx` alias placeholders dynamically, prioritized `u-retail` as `ACTORS[0]` and default login persona, and aligned historical simulation persona references in the log.
- **Decision (Design Delivery Proposal Q4 2026):** Reworked design delivery timeline to 05 October – 18 December 2026 (11 weeks), aligning with the BRD target go-live of 15 December 2026. Reserved December for dedicated UAT testing support/defect triage and Design System Add-ons (harvesting and documenting UI assets/components created during the project for omnichannel reuse). Compiled print-ready proposal PDF at `docs/Internet-Banking-Design-Delivery-Proposal-Q4-2026.pdf` and markdown at `docs/DESIGN-DELIVERY-PROPOSAL-Q4-2026.md`.
- **Decision (Scan & Pay Viewfinder & My QR Refinements):** Refined `ScanAndPayFlow.tsx` and `qr-code.tsx`:
  - Updated camera viewfinder to an immersive full-black aesthetic (`bg-black`) with high-contrast white crosshairs and helper text positioned directly beneath the frame.
  - Positioned the destination receiving account switcher beneath the QR code card using `FromAccountSelector` matching the standard account selectors in Send & Pay flows.
  - Removed container gray fills (`bg-neutral-100`) from the My QR display and SVG cutout mask in favor of transparent/`bg-background` integration.
  - Balanced the center GCB emblem by increasing its scale (`w-12 h-auto`) to harmonize with the circular cutout diameter and removing the restrictive inner bounding ring.
  - Refactored `qr-code.tsx` module rendering from rounded chiclet squares (`rx={0.16}`) to standard, solid, continuous rectangular blocks with horizontal run-length merging and `shapeRendering="crispEdges"`, giving the code the authentic, sharp appearance of an official QR code.
  - Renamed the scan action button to "Enter Merchant ID" (replacing "Type Terminal ID") and removed the sample merchants simulation grid from the Merchant ID input dialog for a clean, production-grade modal.
  - Reordered the QR mode segmented controls so "My QR" appears first and "Scan & Pay" appears second, defaulting the initial tab to My QR unless `?mode=scan` is explicitly supplied.
- **Decision (Sidi Assistant Chat Panel Redesign):** Redesigned the global floating AI assistant panel (`src/components/layout/SidiAssistantWidget.tsx`) to match the reference structure:
  - Top ambient glow with warm peach and lavender gradient fade, top-right action controls (conversation clock toggle, expand/compact size toggle, close), and a friendly centered greeting (`✨ Hi ${firstName}, how can I help you?`).
  - Structured suggestion cards categorized under "For you" (spending summary, standing orders, virtual cards), "Insights" (top expenses, cash flow), and "More" (banking help).
  - Floating pill input bar featuring contextual `@` tag mentions and a dedicated blue upward arrow send button, with seamless switching to active conversational threads.
- **Decision (Onboarding Layout Chip Visibility):** Guarded the floating layout switcher chip in `AuthLayout` (`src/components/auth/AuthLayout.tsx`) behind `SHOW_DEMO_TOOLS` so it does not render on production/live builds (`process.env.NODE_ENV === "production"`), and bound it to `useDevToolsHidden()` and `useCaptureMode()` so pressing `Ctrl+Shift+D` (or `Cmd+Shift+D`) toggles its visibility in dev alongside the other floating tools.

### 2026-10-11

- **Decision (Internet Banking Review Implementation - 35 items across 7 modules):** Executed comprehensive review and polish items from `Internet Banking Review 9Oct26.docx`:
  1. **Pre-login & PIN:** `/forgot-pin` automatically bypasses redundant mobile entry if already authenticated in session; step count adjusted to 3 steps with back button routing to `/mfa`; added concrete visual examples (`e.g. 1234`, `e.g. 1111`) to PIN requirements rules.
  2. **Dashboard & Shell:** Updated unfunded nudge copy to "Fund your virtual account" and "Fund Virtual Account"; lowered `.dash-grid` container query breakpoint from 1060px to 920px (media fallback 1200px) enabling 3-column layout on standard laptops; changed transaction history dropdown to "View Last 10 Transactions"; decorated empty states with contextual semantic badges; mounted floating 3D Sidi avatar (`public/sidi-avatar.png`) assistant globally across all screens.
  3. **Accounts & Cards:** Enhanced `AddAccountDialog.tsx` with multi-select checkboxes and dynamic batch button ("Add Accounts (${count})"); renamed accounts funding section to "Other Funding Sources"; styled Remove Card dialog with exact confirmation copy; improved `LinkSourceAccountModal.tsx` with compact Select dropdown, 10-digit auto-resolution for account holder (Ransford Gyasi), and on-screen verification code simulation; added single-account fallback message in `OwnAccountFlow.tsx`; updated `VirtualCardDetailsView.tsx` with prominent "Card Blocked" title and masked account reference format `Linked to Current Account xxxx1234`.
  4. **Send & Pay Transfers & Rails:** Alphabetized all 33 Ghanaian banks in `BANKS` list from Absa to Zenith; renamed PAPSS processing fee to simple "Fee"; added clickable search icon and `Enter` key triggers across `OtherBankFlow`, `OtherGcbFlow` (enforcing strict 13-digit GCB length validation), and `ProxyPayFlow`; expanded `proxy-store.ts` to support Ghana Card, phone number, email, and custom alias proxy types; enabled 3 destination categories in `CreateGroupFlow.tsx` (GCB, Other Local Bank, Mobile Wallet); added optional Narration input and verified USSD push modal on `WalletToBankFlow.tsx`; updated `PapssPaymentFlow.tsx` to "Enter account number" and added `PAPSS_PURPOSES` Select dropdown; displayed recipient account and recipient bank rows in PAPSS review summary.
  5. **GCB Pay & Bills:** Swapped "Subscriptions" and "Others" so Others sits last; enabled ECG Prepaid auto-resolution to Sam Quartey; added `TV_PACKAGES` for DStv, GOtv, StarTimes prepopulating amounts while keeping them editable; ordered beneficiary details card to Name of Beneficiary -> Name of Biller -> Reference number; permitted flexible donor identifier resolution under Giving & Donations; removed own-card limitation on `CardTopUpFlow.tsx` and added 8-character alphanumeric reference support.
  6. **Confirmation & Receipts:** Enforced sentence case with exclamation mark on confirmation titles (`Transfer successful!`, `Payment successful!`, `Request submitted!`); replaced dollar receipt icon with `ReceiptText`; added interactive "Share Feedback" modal with emojis (😊 Great, 😐 Okay, ☹️ Not good), comment textarea, and toast feedback; wired View Receipt navigation with `?from=success` parameter; configured transaction receipt back button to return to payments; embedded official GCB logo and subtle eagle watermark on receipt background; hid "Save as Beneficiary" for own-account transfers.
  7. **QR Payments & Invest Hub:** Built dual-mode segmented toggle in `ScanAndPayFlow.tsx` between **Scan & Pay** and **My QR**; in My QR: receiving account selector, Ransford Gyasi customer name, masked account number, high-res GhQR SVG code, and Share & Download actions; in Scan & Pay: camera viewfinder with live frame, flashlight, "Select QR from Gallery" image upload, and Terminal ID entry with verification; streamlined Invest home to provide immediate, clear choice cards between Term Deposits and Treasury Bills & Bonds.

### 2026-10-10

- **Discovery** WebKit / iPad Safari container query SVG sizing: An inline-flex container with `h-[8cqw] w-auto` wrapping an SVG with percentage width (`size-full`) fails to resolve intrinsic aspect ratio under WebKit container query inline-size contexts. WebKit stretches the container across the flex row, pushing `{card.type}` out and centering the GCB logo in the middle. Fixed with explicit `w-[9.3cqw] aspect-[37.1621/32]` and `shrink-0` on `CardFace.tsx` and `GcbCardLogo.tsx`. Swept and added `aspect-ratio` and `shrink-0` across `NetworkLogo.tsx` (`Visa`, `Mastercard`, `GhLink`, `UnionPay`), `GCBLogo.tsx`, `RequestCardFlow.tsx` and `VirtualCardDetailsView.tsx`.
- **Discovery** Mobile `pointer: coarse` font override in `globals.css`: A global `input, textarea, select { font-size: 16px !important; }` meant to prevent iOS Safari auto-zoom forced the transparent `<input>` layer in `AmountInput` down from its display font size (26px) to 16px. Because each digit in the input was physically narrower than the overlaying 26px `TextMorph` digits, the native blinking caret sat in the middle of the field (around `5,0|00`). Exempted `.numorainput` from the 16px override and added font inheritance. Swept all currency/rate inputs (`fx-rates/page.tsx`, `FxQuickModal.tsx`) with `.numorainput font-sans` so caret alignment remains 1:1 on mobile/touch devices.
- **Decision** Hero secondary glass controls (`HERO_GLASS` and `Button` variant `glass`): Increased fill opacity from 8% to 15% and border from 8% to 20% with a specular inner top rim light (`shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]`). On dark hero surfaces (`#131516`), 8% fill was pitch-black; 15% produces luminous, physical frosted glass.
- **Decision** Virtual card 3D details view (`VirtualCardDetailsView.tsx`): Omitted EMV chip and contactless wifi waves when viewing virtual cards, matching `CONSTITUTION.md` and `CardFace.tsx`.

### 2026-10-09

- **Decision** Added PIN requirement checks ("4 digits", "No consecutive numbers", "No repeating numbers", and "PINs match" on confirmation) with a live requirements card (`PinRequirements.tsx`) placed beneath the OTP input fields in onboarding (`/signup` and `/activate`). Added `hasConsecutiveDigits`, `hasRepeatingDigits` and `pinMeetsRules` to `src/lib/auth-shared.ts`.
- **Decision** Changed the CTA button on the onboarding password creation step (`/signup` and `/activate`) from "Set Your PIN" to "Proceed".
- **Decision** Updated the COOS account opening redirect modal title to "Open a GCB Account" and extracted `OpenGcbAccountDialog` (`components/accounts/OpenGcbAccountDialog.tsx`). Reused it across `/get-started` and `/accounts` ("Open a GCB Account" in PageHeader for virtual wallet holders).
- **Decision** Added the "Recommended for you" card stack panel to the dashboard (Figma node 5990:5504) in `src/components/dashboard/v2/RecommendedForYouCard.tsx`, filling the 6th slot of the dashboard grid (`dash-grid`) across Overview, Hero, HeroSplit and Actions layouts. Built with a static non-animating header row containing top-right chevron controls, layered depth cards, fluid Apple-style spring animations (`DECK_SPRING`), touch/drag swipe gestures (`drag="x"`), and direct CTA links (`/loans`, `/payments/bills?biller=dstv`, `/invest`, `/insure`).
- **Decision** Removed narration, transaction category and schedule payment from the Wallet to Bank payment flow (`src/components/payments/flows/WalletToBankFlow.tsx` and `src/components/payments/PaymentFlow.tsx`). The flow now contains Destination Bank Account, Source Mobile Wallet, Amount and Proceed CTA.

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
- **Decision** Term Deposits decoupled from CSD securities account requirement (2026-10-08). Term deposits are direct bank fixed deposits and execute immediately from the customer's active account without CSD registration. The 7-day CSD setup gate and `CreateProfileFlow` apply strictly to Treasury Bills & Bonds. A customer with a pending CSD profile can open, hold and manage Term Deposits without blockage, and empty state "Start Investing" leads directly to Products.
- **Decision (superseded)** Nobody opens an account on purpose. The securities account (the CSD profile, called a securities account everywhere in the UI, never "CSD account") is set up the first time someone starts a Treasury Bill or Bond purchase, inline in `BuyFlow` through `CreateProfileFlow`, or from `/invest/profile`. It takes up to 7 working days, so the choice is saved (`intent`). While it is being set up Invest shows the pending status under Treasury, while Term Deposits remain fully active.
- **Decision** `CreateProfileFlow` is a real form the customer fills in, one block at a time: title, occupation, email (filled in from their sign-in), nationality, residential status, postal and residential address, signature upload, then the linked account and the terms tick. One code submits it, with the details restated above it; there is no separate review screen. An earlier version showed made-up "on file" details taken from the Figma mockup. The designer asked for those to go (2026-10-08): they were placeholder data, not the bank's records.
- **Gap** Statement only covers treasury holdings (term deposits have none in Figma). "Due to you at maturity" counts a rollover deposit's principal plus interest.
- **Decision** Without a securities account, the main button on an option's details reads "Open a Securities Account" and goes straight to the form, which carries on to that option afterwards (designer, 2026-10-27). The confirm popup (`SecuritiesAccountDialog`) is gone. The note under the buttons says they can start investing within 7 working days of creating it. With an account, Start Investing goes to Products and Invest goes on to the flow.
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

### 2026-10-09
- **Decision (Provider networks):** Added GhanaPay and G-Money networks and SVGs (`/ghanapay.svg`, `/gmoney.svg`) into `OPERATORS` (`lib/operators.ts`) and wallet pickers across the app. Removed redundant unbranded `"GCB Wallet"` dropdown item from `NETWORKS` in `shared.tsx` and `WALLET_NETWORKS` in `beneficiaries/page.tsx` since GCB's official mobile money wallet is `G-Money`.
- **Decision (Onboarding & Auth):** Review details step in `/signup` and `/forgot-password` now use `PhoneInput` with country flag picker. MFA loader updated to "Logging you in...". Forgot password enforces selfie verification before new password input.
- **Decision (Dashboard):** Balances hidden by default (`globalShowAmounts = false`, `splitCurrencyAndAmount` default `showAmounts = false`). Hero dashboard kebab options menu relocated beside `AccountSwitcher`; top-right hero actions hold QR code scan CTA followed by FX rates (`[QR] [FX]`).
- **Decision (Dashboard Recommendations Card):** Clean template background images used without baked-in raster text (`bg-salary-advance.png`, `bg-dstv.png`, `bg-term-deposit.png`, `bg-wealth-master.png`). Titles, subtitles, and interactive pill CTA buttons rendered as live DOM overlays on top of the clean artwork with Open Sans typography and theme-matched colors. "Recommended for you" header and left/right navigation chevrons sit stationary at the top layer (`z-30`), while the title, subtitle, and CTA button form a vertically centered, unified lockup on the left half to eliminate awkward gaps.
- **Decision (GCB Pay / Bills Verification):** Replaced real-time on-type bill reference resolution with an in-field "Verify" button (`BillsPaymentFlow.tsx`). Typing no longer reveals customer details or amount input in real time; customer details and subsequent amount field only appear after clicking "Verify". Modifying the reference resets the verification state.
- **Decision (Form fields):** All optional fields across all application flows (Send & Pay, transfers, standing orders, statement configuration, reports, settings, quick actions) explicitly render an italicized `(optional)` indicator by their label via `Field` (`optional` prop), with `CategorySelect`, `NarrationInput`, and `SaveBeneficiaryCheckbox` defaulting to optional.
- **Decision (Open GCB Account Modal):** Standardized title to "Open a GCB Account" (`OpenGcbAccountDialog.tsx`). Virtual account / wallet holders on `/accounts` clicking "Open a GCB account" trigger this same unified modal.
- **Decision (Password Creation CTA):** "Set your PIN" CTA button on the "Create your password" step in `/signup` and `/activate` changed to "Proceed".
- **Decision (PIN Validation & Rules):** PIN rules enforce 4 digits, no 3+ consecutive numbers (`hasConsecutiveDigits`), and no repeating digits (`hasRepeatingDigits`). The live `<PinRequirements />` checklist renders below PIN inputs displaying "No consecutive numbers" and "No repeating numbers" (and "PINs match" on confirmation step).
- **Decision (Forgot Password & Forgot PIN Flows):**
  - `/forgot-password` updated: Mobile → Selfie → OTP verification code → New password → Done.
  - `/forgot-pin` created: Mobile → Selfie → New PIN (with live rule checks) → Confirm PIN → Done. Linked directly from `/mfa` ("Forgot PIN?") and `/settings`.
- **Decision (Card Blocking Reason Dialog):** Redesigned the card blocking dialog in `VirtualCardDetailsView.tsx` (`BlockReasonDialog`) from a multi-level nested card/survey questionnaire (dense nested cards, multi-level button grids) to a clean, calm, single-level choice list (`misplaced`, `lost_stolen`, `fraud`, `budgeting`, `other`) with quiet context-specific guidance, eliminating all cards-inside-cards and nested button matrices.
- **Decision (Card Top-Up / Send & Pay):** Card top-up destination picker in `CardTopUpFlow.tsx` is strictly filtered to the customer's own active GCB fundable cards (`cardsForProfile(profileKind)` with `c.fundable && c.status === "Active"` — GCB Prepaid and Virtual cards). Top-up currency is enforced as GHS (`currency="GHS"`, `Top up Amount (GHS)`), and retail card mocks are denominated in GHS.

### 2026-10-10
- **Decision (Dev Mode User Simulation):** Replaced monolithic shared mock datasets with 3 coherent customer simulation personas (`useDevUserStore` in `src/lib/dev-user-simulation.ts`):
  1. `Clean` (Samuel Quartey, `u-clean`): Completely clean onboarding state with 0 payment cards, 0 saved beneficiaries, 0 transaction history, 0 standing orders, 0 linked funding sources, and a single unfunded GHS 0.00 account (`acc-clean-001`).
  2. `Single` (Ishmael Gyan, `u-single`): Realistic single-account user with 1 Current Account (`acc-single-001`, GHS 4,250.00), 1 GCB Visa Debit card (`card-single-001`), 2 scoped beneficiaries (Mum's MTN MoMo & ECG Prepaid), 5 focused transactions, 1 standing order, and 1 linked MoMo wallet.
  3. `Everyday` (Ransford Gyasi, `u-retail`): Active multiple-account retail customer with Current, Smart Save & USD accounts, 3 cards (Debit, Prepaid, Virtual), 25 beneficiaries, rich ledger history, 3 standing instructions, and 3 linked accounts/wallets.
- **Decision (Destructive Color Tokens):** Updated `--destructive` and `--destructive-text` across light and dark modes in `globals.css`:
  - `:root`: `--destructive: #dd1d43;`, `--destructive-text: #dd1d43;`
  - `.dark`: `--destructive: #e51f47;`, `--destructive-text: #e51f47;`
- **Decision (Dashboard Panel Stacking & Layout Balance):** Fixed vertical misalignment and awkward content stacking across dashboard cards (`parts.tsx` and `mock-data.ts`):
  1. Removed `justify-between` from base `Card` container so content naturally stacks from the top below `CardHeader` with consistent `gap-3` spacing, preventing single/sparse items in "Recent activity" and "Coming up" from sinking to the floor of the 260px card.
  2. Fixed "Pay again" (`PayAgainCard`):
     - For 1 to 3 payees (e.g. single-account user): renders as clean horizontal list rows matching the visual rhythm of Recent Activity and Cards, eliminating severe grid truncation ("Mum (Yaa ...", "ECG Electri...") and empty column voids.
     - For 4+ payees: renders as an evenly spaced avatar grid (`justify-around`), removing `my-auto` centering.
     - Fixed `initials()` parser to strip brackets/parentheses (`"Mum (Yaa Osei)"` now correctly yields `"MY"` instead of broken `"M("`).
  3. Balanced mock retail transaction distribution so primary Current Account `acc-ret-001` receives realistic day-to-day spending entries rather than all transactions being assigned to Smart Save `acc-ret-002`.
  4. Adjusted `RecentTransactions` display limit from 4 to 3 and added subtle row dividing lines (`divide-y divide-border/30`) with `py-2.5` padding in `MinimalKit.tsx` and `parts.tsx`. Previously, 4 items overflowed the available 184px vertical content height, cramming the 4th item directly against the bottom container border; 3 items provide generous, calm breathing room and match the visual rhythm of the other panels.
  5. Mapped list item row interaction and status styles strictly to existing semantic design tokens (`globals.css`):
     - Row hover surface: `hover:bg-tile-hover` (`--color-tile-hover` = `#eeeeed` light, `#1c1c1c` dark).
     - Credit indicator: `bg-pill-success text-success` (`--color-pill-success` & `--color-success`).
     - Debit indicator: `bg-tile text-muted-foreground` (`--color-tile` & `--color-muted-foreground`).
     - Transaction status text: `text-destructive-text` (updated `#dd1d43` light, `#e51f47` dark) and `text-warning-text`.
     - Pay Again avatars: dedicated `--avatar-*` tokens (`bg-avatar-teal`, `bg-avatar-sand`, etc.) with `text-primary-foreground`.
- **Decision (Transaction Green & Avatar Tokens Unification):**
  1. Unified `--success` and `--success-text` across `:root` (`#16a34a`) and `.dark` (`#22c55e`), applying the vibrant emerald green across the dashboard, transaction list, and transaction details.
  2. Mapped Pay Again and payee avatar circles in `parts.tsx` strictly to the dedicated `--avatar-*` tokens (`bg-avatar-teal`, `bg-avatar-sand`, `bg-avatar-green`, `bg-avatar-lilac`, `bg-avatar-blue`, `bg-avatar-yellow`, `bg-avatar-pink`) with `text-primary-foreground`.
  3. Aligned directional icons, row hover states, and amount typography in `TransactionList.tsx`, `transactions/[id]/page.tsx`, `accounts/[id]/page.tsx`, `VirtualCardDetailsView.tsx`, and `RecentActivityWidget.tsx` to match the dashboard (`bg-pill-success text-success` for credits, `bg-tile text-muted-foreground` for debits, `stroke-[2]`, `hover:bg-tile-hover`, and `text-success font-medium`).

- **Decision (QR Payment / Scan & Pay Redesign):**
  - Re-architected `ScanAndPayFlow.tsx` and `PaymentFlow.tsx` on `feature/qr-codes` to match the minimalist reference mockup (Images 1 & 2):
    1. Centered layout constrained to `max-w-xl` aligning the header `< QR Payment`, the segmented switcher, the viewport, and the bottom actions seamlessly.
    2. Full-width `SegmentedControl` (`Scan & Pay` | `My QR`) with edge-to-edge pill buttons.
    3. **Scan & Pay Tab:**
       - Replaced cluttered account selectors and quick merchant lists with a clean `aspect-[4/3]` viewport camera canvas featuring a subtle scanning reticle, animated laser indicator, and gallery file picker.
       - Rendered two side-by-side action buttons: `Select from Gallery` (outline) and `Type Terminal ID` (primary brand amber `#FFC423`).
       - Clicking `Type Terminal ID` triggers an accessible modal dialog to input the 8-10 digit GhQR Terminal ID, including quick sample merchant chips (Melcom Plus, Shell, Shoprite, Starbites).
       - Upon scanning or terminal verification, smoothly transitions to the payment details form (Account, Amount, Narration, Category, Review & Pay).
    4. **My QR Tab:**
       - Clean `aspect-[4/3]` canvas with a centered white rounded card housing the user's GCB GhQR code, account details ("Ransford Gyasi — Operating Account •••• 0313"), and central GCB emblem.
       - Rendered two side-by-side action buttons: `Share QR Code` (outline) and `Download` (primary brand amber `#FFC423`).
    5. Back navigation on `< QR Payment` seamlessly clears selected merchant if in payment details stage, returning user straight to the scanner canvas before exiting to payments hub.

### 2026-10-12
- **Decision (Demo Simulation Personas Renamed):**
  - Updated retail simulation personas in `src/components/states/DevStateMenuItems.tsx`, `src/lib/dev-user-simulation.ts`, and `src/lib/mock-data.ts`:
    1. **Clean (Zero Setup):** Samuel Quartey (`u-clean`) — fresh unfunded account, 0 cards, 0 beneficiaries.
    2. **Single Account User:** Ishmael Gyan (`u-single`) — 1 current account, 1 Visa Debit card, 2 beneficiaries (Mum Yaa Gyan & ECG Prepaid).
    3. **Everyday User (Multiple Accounts):** Ransford Gyasi (`u-retail`) — 3 accounts, 3 cards, full history.
- **My QR Layout & Logo Polish:**
  - Kept the outer `aspect-[4/3]` container footprint in `ScanAndPayFlow.tsx` without a background fill so action buttons stay strictly anchored at the same height across mode switches.
  - Built authentic Version 3 (29x29) Reed-Solomon QR code generator in `src/components/ui/qr-code.tsx` with smooth modules, proper finders, and a circular center knockout displaying the black GCB logo (`#1C1C1E`).
  - Removed the redundant top text header above the QR code on the card.
  - Fixed the `Type Terminal ID` dialog modal in `ScanAndPayFlow.tsx`: resolved double close buttons, eliminated title horizontal truncation, and moved instructional copy into `DialogBody`.
  - Replaced the camera icon and dashed box in `ScanAndPayFlow.tsx` viewfinder with a 4-corner rounded crosshairs reticle matching the camera framing reference.
  - Added `PersonalQrModal.tsx` and connected dashboard hero QR button (`HeroQrAction`) to trigger a personal QR overlay rather than navigating away immediately.
  - Made the camera viewfinder fill the mobile screen (`min-h-[58vh] sm:min-h-0 sm:aspect-[4/3]`) while keeping desktop 4/3 ratio intact.
  - Redesigned the Terminal ID modal into the clean Merchant ID dialog matching the reference: green store badge, "Enter the merchant ID" heading, centered pill input with "E.G. GCB-QR-88210", and right-aligned Cancel.
  - Refactored Merchant ID modal styling to use semantic design tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border/70`, `bg-muted`, etc.) ensuring natural adaptation across both light and dark themes without hardcoded dark values.
  - Anchored `Scan & Pay / My QR` segmented toggles cleanly at the top of the view, while vertically centering the camera viewfinder and bottom action buttons (`my-auto justify-center`) in the remaining viewport space.
  - Styled the camera scanning viewfinder canvas in solid pitch black (`bg-black border-black/80`) with bright white crosshairs brackets and white text (`text-white/90`) to authentically replicate an active camera feed.
  - Scaled up the My QR card and code matrix (card width `w-[320px] sm:w-[350px]`, QR matrix size `260px`, central logo `size-9`), and removed borders from both the card and the outer footprint container for a seamless borderless presentation.
  - Positioned the destination account switcher beneath the QR code card using `FromAccountSelector` (styled identically to the account selector in the Send & Pay flow): selecting an account automatically updates the card text, the QR matrix payload, and clipboard share copy.
  - Gave the My QR card a filled background that adapts cleanly across modes (`bg-neutral-100 dark:bg-neutral-900/90`), with theme-adaptive QR modules, center knockout circle, and GCB brand logo (brand amber eagle `#FFC423` + black text in light mode, white text in dark mode).
  - Updated dashboard hero QR button (`HeroQrAction`) to route directly to `/payments/send?rail=qr&mode=myqr` displaying the My QR code tab on load.
- **Sidi AI Assistant Panel Redesign & Motion Polish (`branch: insights`):**
  - Refactored `src/components/layout/SidiAssistantWidget.tsx` structure and aesthetics:
    1. Removed `@` context tag button and state for a cleaner, unified input bar.
    2. Refined input placeholder to `"Ask Sidi about anything..."`.
    3. Replaced generic blue colors with GCB amber brand tokens (`bg-primary`, `text-primary-foreground`, `hover:bg-primary-hover`, `group-hover:text-primary`, amber top ambient glow).
    4. Upgraded suggestion row icons (`ArrowRightLeft`, `FileText`, `CreditCard`, `Search`, `TrendingUp`, `HelpCircle`) inside soft tactile rounded badge containers (`size-8 rounded-xl bg-muted/70 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-colors`).
    5. Fixed entrance animation stutter: eliminated conflicting CSS `transition-all duration-300` on the `<motion.div>` container, set `style={{ transformOrigin: "bottom right" }}`, and implemented responsive spring physics (`damping: 26, stiffness: 340, mass: 0.7`) so the panel blooms smoothly out of the launcher avatar without lag or jitter.
    6. Removed the top yellow/amber gradient overlay per user feedback, keeping the header clean, crisp, and neutral against the card surface.
    7. Replaced the default browser scrollbar on the assistant content container with `.custom-scrollbar` and `overscroll-contain`, giving it the app's thin 6px pill thumb, transparent track, and dark-mode adaptation.
    8. Streamlined suggestions from 6 categorized items down to exactly 3 high-signal starter cards ("Summarize my recent transactions", "How to set up a standing order", "Find my highest expenses this month") under a single "Suggested" label to honor Hick's Law and reduce cognitive load.
- **Recommended For You / Personalized Insights Hub (`branch: insights`):**
  - Distilled `src/components/dashboard/v2/RecommendedForYouCard.tsx` following `/distill`, `/better-ui`, and `/better-colors`:
    1. Eliminated AI-generated clichés: removed card-in-a-card container nesting, cheese `Sparkles` badge, and multi-colored pastel icon boxes.
    2. Elevated to bold editorial typography with high contrast: prominent tabular financial stats (`GHS 12,500`, `In 3 days`, `14.5% p.a.`) leading directly into concise, natural human explanations.
    3. Seamless single-surface integration with the dashboard grid (`h-[260px]`, `bg-panel border-border`), quiet editorial counter (`01 / 03`), and tactile CTA pill (`active:scale-[0.96]`).
    4. Smooth, interruptible physical slide transitions (`framer-motion` with `ease: [0.2, 0, 0, 1]`) and drag gesture support.







---

## 2026-10-13

**Decision** — `RecommendedForYouCard` card stack updated to full bidirectional animation: using typed Framer Motion `cardVariants` with directional delta (`direction = 1 | -1`). When moving backward, the preceding card smoothly drops in from top/front while the active card pushes back into the stack with spring physics. Files: `src/components/dashboard/v2/RecommendedForYouCard.tsx`. ESLint 0 warnings, TSC exit 0.

- **Motion Lab & Tokenizer One-Pager (`/motion-lab`):**
  - Created interactive one-page animation laboratory at `src/app/motion-lab/page.tsx` for fine-tuning cubic-bezier easing curves (`settle`, `standard`, `inOut`, `snappy`, `bounce`), spring physics parameters, and every animation duration token across the app (`press`, `hover`, `reveal`, `move`, `entrance`, `modal`, `toast`).
  - Features an interactive SVG Bezier canvas with draggable handles, linear comparison runways, live micro-interaction tests (button press, card hover, modal dialog, toast alerts, slide drawers, accordion expansions), live runtime CSS injection to test changes instantly across the DOM, and 1-click token export directly to `src/lib/motion.ts` and `src/app/globals.css`.
  - Calibrated motion tokens in `src/app/globals.css` and `src/lib/motion.ts`: sped up card entrance duration from 400ms to 200ms (`--dur-entrance: 200ms`, `entrance: 0.2s`), and optimized `SPRING.settle` (`stiffness: 360, damping: 28, mass: 0.8`) for swift, responsive card loading and account switching across the dashboard.
- **Surface Token Refactor (`--item-hover`):**
  - Replaced ambiguous usage of `muted` / `tile-hover` for interactive row elements with dedicated semantic design token `--item-hover` / `hover:bg-item-hover`.
  - Defined `--item-hover: rgba(0, 0, 0, 0.04)` (light) and `--item-hover: rgba(255, 255, 255, 0.05)` (dark) in `src/app/globals.css`.
  - Standardized all list item hover states across Accounts (`/accounts`), Account Details (`/accounts/[id]`), Transactions (`TransactionList.tsx`), Cards list (`CardsList.tsx`), and Dashboard panels (`UpcomingList`, `PayAgainCard`, `MinimalKit` recent txns, `RecentActivityWidget`, `DashboardCardsWidget`).
- **Foreground Color Tokens Calibration (`src/app/globals.css`):**
  - Updated color tokens per user calibration:
    - `--accent-foreground`: `#171717`
    - `--destructive-foreground`: `#ffffff`
    - `--foreground`: `#0a0a0a`
    - `--hero-foreground`: `#ffffff`
    - `--muted-foreground`: `#8a8a8a`
    - `--primary-foreground`: `#290e00`
- **Tokens Consolidation & Color Tuner Groupings:**
  - Consolidated duration tokens across CSS and TypeScript (`src/app/globals.css`, `src/lib/motion.ts`) into a streamlined 3-tier velocity scale:
    - `--dur-fast` / `SPEED.fast`: `200ms` (`0.2s`)
    - `--dur-base` / `SPEED.base`: `400ms` (`0.4s`)
    - `--dur-slow` / `SPEED.slow`: `600ms` (`0.6s`)
    - Preserved backwards-compatible semantic aliases (`press`, `hover`, `reveal`, `move`, `entrance`, `modal`, `toast`).
  - Added dedicated **"Interactive & Hovers"** group category in [`src/lib/color-tuner.ts`](src/lib/color-tuner.ts#L30) to give clean, isolated control over hover overlay and interactive states in the live Color Tuner panel.
  - Synced defaults and exports in [`/motion-lab`](src/app/motion-lab/page.tsx).

---

## 2026-10-18

- Decision: Floating Sheet styling with uniform gap. On desktop, `side="right"` in `src/components/ui/sheet.tsx` is styled as an elevated floating card with a balanced, uniform 14px surrounding gap on all sides (`sm:inset-y-3.5 sm:right-3.5 sm:h-[calc(100dvh-28px)] sm:max-h-[calc(100dvh-28px)] sm:w-[440px] sm:max-w-md sm:rounded-[26px] sm:border sm:border-black/[0.08] dark:sm:border-white/[0.1] sm:shadow-[0_24px_64px_rgba(0,0,0,0.22)]`). Added `sheet-slide-in-right` and `sheet-slide-out-right` keyframe animations in `globals.css` bound to `[data-slot="sheet-content"][data-open]` and `[data-closed]`, providing a smooth physical slide-in curve (`340ms cubic-bezier(0.32, 0.72, 0, 1)`). Added `SheetBody`, `SheetCard`, `SheetRow`, `SheetHeroAmount`, and `SheetButton` (with `lime`, `primary`, `secondary`, and `ghost` variants).
- Decision: Transactions Sheet experience. All transaction rows across `TransactionList.tsx`, `accounts/[id]/page.tsx`, `ActivityFeed.tsx`, `MinimalKit.tsx`, and `TimelineLayout.tsx` now open the `TransactionDetailSheet` instead of navigating away. The sheet presents the centered hero amount, status dot, counterparty, copyable reference number with toast, account details, and pill action buttons (`Send again` and `Done`).
- Decision: Beneficiaries Sheet experience. All list items in `beneficiaries/page.tsx` (People, Billers) open `BeneficiaryDetailSheet` on row click instead of being non-interactive. The sheet presents category pill badges, verified indicator, centered hero icon tile, information card, and pill action buttons (`Send money` [electric lime], `Edit beneficiary` [neutral], `Done` [ghost]). The Add and Edit Beneficiary dialog was ported to a right-side Sheet (`<Sheet side="right">`), and group items open `EditGroupModal` (Sheet), removing all modals from beneficiary list items.

## 2026-10-17

- Decision: the filter dropdown (`FilterPanel` in `ui/filter-panel.tsx`) is a simple list. Segmented rows and wrapped chip tag clouds are replaced with vertical list rows, checkmark indicators on active choices, responsive press feedback (`active:scale-[0.98]`), and a focused menu width (`w-72 sm:w-80`) with `p-1.5` padding.
- Decision: multi-group filters in `FilterPanel` (such as Transactions) collapse into Linear-style category menus with icons and right carets (`▸`) that fly out into focused submenus on hover/click. Active choices show inline summary badges. Single-group filters keep the direct list.

## 2026-10-15

- Decision: the token dialogs' buttons stay in one row on phones (Delete token / Share Token; Keep token / Delete token), primary last.
- Decision: the cash-out ticket, success page and active-code dialog say "code" everywhere (Code generated!, Share Code, Delete code); "token" is retired from cardless copy. Supersedes the "token" wording noted in the Figma override above.
- Decision: the cash-out success page opens like Send & Pay success: the GCB eagle and "Code generated!" alone (about 1.25s), then the eagle leaves with the same blur-out, the ticket drops in above the title (the title slides down with a layout animation), and the expiry line and buttons appear once the ticket has settled. Reuses `GcbEagleEmblem` and `playDelightChime`, now exported from `PaymentSuccessScreen.tsx`. The ticket's own lead-in delay was cut from 0.7s to 0.15s because the intro now gives the pause.
- Fix: Sidi's "How can I help?" greeting could stay on screen for good in the live build. Its effect depended on the `actor` object, which the session store replaces when it hydrates; the re-run cancelled the timers that fold the greeting away and the session flag stopped it starting again. It now depends on signed-in or not and does not cancel its timers.
- Decision: the shell card is tokenized. `--shell-top` / `--shell-bottom` in `globals.css` (light: white to white; dark: #141414 down to `--surface`) feed `.shell-card`'s gradient, the floating top bar (`--shell-header` via color-mix) and the phone bottom bar, which lost its `dark:bg-[#121212]`. A gradient is fine as a token pair; the dark card now ends on the real backdrop colour instead of a hardcoded near-miss (#09090b).
- Fix: the Colour tuner's "Other" group is empty. Its groups come from the name patterns in `lib/color-tuner.ts`; new tokens (`shell-*`, `avatar-*`, `ticket-*`, `dm-*`, `panel`) had no pattern and fell through. They now have App shell, Avatars, Cash-out ticket and Dark elevation groups, and `panel` joins Surfaces. Rule: a new token family gets a group rule in the same change. The unused `--board-*` tokens (left from the removed split-flap board) were deleted.
- Decision: the sidebar and the margin around the card are one continuous gradient, `.shell-backdrop` (`--shell-surface-top` / `--shell-surface-bottom`: dark #0f0f0f down to `--surface`, light flat `--surface`), on the shell root, the mobile drawer and the sidebar, so the dark card's fade lands on the same colour the backdrop ends on. The tuner groups all `shell-*` tokens as "Shell and sidebar".
- Override: every beneficiary change from this stretch was taken out, on the branch `beneficiaries-default`: the one shared saved list behind the Send & Pay strips, pin, last paid and ranking, the saved-recipient buttons and type-ahead in the rail forms, merged mobile numbers, the International Bank form, the rebuilt Beneficiaries page, and the success-screen rail label fix. Beneficiaries, Send & Pay, standing orders and Pay again are as they were at `fcc47c9`. Kept: the shell tokens and gradients, the cash-out ticket and code wording, the Sidi greeting fix, empty-state art. Open (from the original): the success screen says "Send to Wallet" for international and proxy saves; the old Add form drops the nickname and SWIFT code.
- Decision: the default dashboard hero (Hero split) is two rows like the reference: account pill and options on the top left, My QR alone on the top right; the balance bottom left and the four actions (Send Money, GCB Pay, Top-Up, FX Rates) bottom right on one line. FX Rates moved from a top-right rate chip into the action row (`HeroFxRatesButton`, handed to `MoneyActions` through its `extra` prop so it shares the buttons' classes); the other hero layouts still use the chip (`HeroFxAction`). The hero is shorter, with the 32px sheet overlap in its foot padding.
- Decision: the hero's secondary buttons (the `glass` Button variant, the account pill, the round-action chips) are translucent glass with a backdrop blur and no stroke, filled with a top-to-bottom gradient from `--hero-glass-top` to `--hero-glass-bottom` (white at 22% to 8%); hover is a flat wash, `--hero-glass-hover` (white at 24%), not a gradient. The wash is an inset box-shadow, not a background swap, because a gradient can't transition to a colour (it snapped); a shadow eases. Translucent, so it takes the panel's colour; its own tokens, so it never follows the text colour `--hero-foreground`.
- Decision: the hero's colours have one source. The wave tuner and the colour tuner both set the hero's card, text and wave (the wave tuner wrote `--wave-*` onto the card, which overrode the `--hero-*` tokens the colour tuner edits), so they fought. Now `--hero-surface`, `--hero-foreground`, `--hero-wave` and the new `--hero-glow` in `globals.css` are the only colours (a wave's or glow's strength is the alpha inside its token), edited in the Colour tuner under Dashboard hero. The Wave tuner keeps only motion and shape (second wave, cycle, drift, grain, size, lift, pill shadow, glow size, pause) and points to the Colour tuner for colour. Saved wave-tuner colours in browsers are ignored; the old defaults are the token values, so nothing looks different.
- Fix: unused tokens removed from `globals.css`: `--balance-card-1..3` (only a component nothing imported used them, now deleted), `--sidebar-width` and `--sidebar-width-collapsed`, and `--hero-pill-shadow` with the wave tuner's Pill shadow setting (nothing read `--pill-shadow`). Checked every token for a `var()` use, a Tailwind class through its `--color-*` alias, or a dynamic reference; the rest are in use.
- Decision: the two hero waves each have their own colour token, `--hero-wave-a` (left wave) and `--hero-wave-b` (right wave), light and dark, in place of the shared `--hero-wave`. Both start at the old value so nothing changed; tune them separately in the Colour tuner (Dashboard hero).
- Decision: the hero's glass controls are one look, `GLASS_CLASS` in `ui/button.tsx` (the Button `glass` variant, the account pill and the round-action chips all use it; `HERO_GLASS` in `parts.tsx` is the same constant). The hero's dotted eagle is tunable in the wave tuner: size, distance from the right and bottom edges, and opacity in light and dark. Defaults equal the old fixed placement (471px, 4px up, 110px off the right, 35% light / 100% dark).
- Fix: the hero's glass buttons no longer shrink on press (no other button does), and the Pay again avatars no longer grow on hover; they take the Send & Pay beneficiary strip's hover instead: the avatar's colour deepens a touch (saturate and brightness), no movement.
- Decision: the hero card's border was already a token (`--hero-border`); the border of the sheet of panels under it read the global `--border`, so it now has its own, `--hero-sheet-border` (starts as `var(--border)`, so nothing changed), next to the other hero tokens in the Colour tuner.
- Decision: the hero's text colours are separate tokens: `--hero-balance-foreground` (the balance figure and its eye) and `--hero-button-foreground` (the glass buttons: GCB Pay, Top-Up, FX Rates, account pill, QR) alongside `--hero-foreground` (everything else). All start white, so nothing changed.
- Decision: the hero's primary button (Send Money) has its own tokens, `--hero-primary`, `--hero-primary-hover` and `--hero-primary-foreground`, defined as the brand primary so nothing changed; tune them in the Colour tuner without touching primary buttons elsewhere.
- Decision: the Colour tuner has hero presets: Original (the palette in `globals.css`) and Amber (the designer's amber hero, light and dark, saved from the tuner on 2026-10-17). A preset row sits under the panel title; applying one replaces only the hero tokens presets touch, and the active one is highlighted until something is tuned by hand. Add a preset in `TUNER_PRESETS` in `lib/color-tuner.ts`. The pasted amber values included a dark `--hero-wave`; that token was split into `--hero-wave-a` and `--hero-wave-b`, so it was left out.
- Fix: Scan & Pay entered differently from the other Send & Pay pages. Its page column was `max-w-xl` while every other flow is `max-w-2xl`, so the title and back button jumped sideways on entry, and it stacked four nested fade-ins (page, flow, stage, mode). It now uses the same `max-w-2xl` column as the others (the QR stays centred in a narrower block inside it) and one page fade; the My QR and Scan tab panels keep their own short fade.
- Fix: the transaction detail sheet had no exit and a rough entrance. `TransactionDetailSheet` returned null as soon as the list cleared its selection, so it unmounted before the slide-out could play; it now keeps the last transaction while closing. The sheet's slide-in animations use `fill-mode: both` so the first frame sits off-screen instead of flashing at its final position.
- Fix: the transaction detail sheet sat at the left, pushed down. Its `SheetContent` was given `className="relative …"`, which (tailwind-merge) replaced the sheet's own `fixed`, so it flowed in the page and its right/inset offsets moved it instead of pinning it. Removed the `relative`; `fixed` already makes it the positioning parent for the watermark and close button. Never pass a position class to `SheetContent`.
- Decision: a receipt's who-and-where rows follow the transaction kind, from `receiptFields()` in `lib/receipt-fields.ts` (the transaction sheet, its copied text and its PDF all use it): bank transfer (recipient, account number, how it was sent), mobile money (recipient, provider, mobile number), airtime and data (provider, mobile number), bill (biller, reference), card (merchant, merchant ID, card), PAPSS (recipient, account, PAPSS, country), own account (to/from account, number), trade, bulk. Credits say Sender, Credited To and Total Credited. The old fixed Bank Name ("Absa Bank" / "GCB Bank" by method) was invented and is gone: the seed transactions carry no bank name, so a bank transfer shows how it was sent (GIP, ACH, RTGS) instead. Gap: add a `counterpartyBank` to transactions if a bank transfer should name the bank.
- Decision: the transaction ledger reflects the Send & Pay rails. Retail history was reworked so each entry is something the system could have produced: Melcom is a Scan & Pay merchant payment (new `qr` method), airtime and data go to a provider and a mobile number (MTN/Telecel Ghana, a phone number), wallet-to-bank is the customer's own wallet ("My MTN Mobile Money"), a person-to-person wallet send is `momo`, the ATM entry is a cash-out code (new `cardless` method), and credits no longer carry a spend category. Transactions gained `counterpartyBank` (Bank Name on GIP, ACH, RTGS and PAPSS receipts, filled for the seeded transfers). Receipt fields: `lib/receipt-fields.ts`. Not done: the corporate ledger is only lightly touched (bank names, one data purchase); proxy, international wire, group and standing-order payments have no seeded history yet.
- Decision: the transaction list's two signals each answer one question. The amount's colour says whether money moved and which way (money in green, out plain, not moved muted, a failed one struck through); the word under it appears only when it isn't Completed (Pending, Failed in amber, not red). Before, red on a failed amount, green on a credit and a green "Completed" on every row said the same thing three ways and contradicted each other (a failed credit was a red plus).
- Decision: transaction rows lead with `TransactionMark` (`components/transactions/TransactionMark.tsx`): a duotone tile: a tint per kind of payment (`--tx-<colour>`) with the icon in a deeper shade of the same hue (`--tx-<colour>-ink`), light and dark, in the tuner's Transaction marks group (bank blue, mobile money yellow, airtime and data teal, GCB Pay sand, card lilac, Scan & Pay green, PAPSS pink, own account and cash-out lemon), showing the kind of payment (bank, phone, wallet, signal, wifi, receipt, card, QR, globe, swap, cash, ...) with a small corner arrow for direction (green when money came in), and the meta line reads "kind · date". Used by the Transactions list, an account's activity and the dashboard Activity card. Picked from the ten options in `docs/transaction-row-variations.html` (option 1). The dashboard's recent-activity widget and the virtual card's list use a different row model and keep their arrows.
- Decision: the transactions Method filter lists rails, not transfer methods: Between My Accounts, Other Banks, Outside Ghana, Mobile Money, Airtime & Data, GCB Pay, Scan & Pay, Card & POS, ATM Cash-out Code, Bulk Payments, Trade (`TRANSACTION_RAILS` in `mock-data.ts`; `transactionRail(t)` in `transaction-type.ts` maps a transaction to one). GIP, ACH and RTGS are how an Other Banks transfer travelled, so they are no longer filters (they still show on the receipt as Payment Method). The admin monitoring page uses the same list. Gap: a transfer to another GCB account has no separate `paymentMethod`, so it falls under Other Banks until the ledger can tell them apart.
- Decision: the transaction mark marks only money in: a small pale-green disc (success at 18% over the card) with a green arrow on the corner of a credit, nothing on a debit; the solid green badge was too bold (`docs/transaction-money-in-indicator.html`, option B) (the minus on the amount already says out). Picked from `docs/transaction-indicator-variations.html` (option 5). The dashboard's Recent activity now follows the same rules as the Transactions list through one shared `amountStyling()` in `lib/transaction-display.ts`: a pending credit is muted not green, a failed row is struck through, the status word appears only when it isn't Completed (Failed is amber, not red), and the category no longer fills that line for completed rows.
- Decision: the Transactions filter has a Money group (All, Money in, Money out), first in the panel, as a single choice; it is part of Clear and of the applied-filter chips.
- Decision: letter-spacing is tokens. `--ls-tight` (-0.01em), `--ls-heading` (-0.02em), `--ls-display` (-0.03em) and `--ls-label` (0.02em) in `globals.css`; the 112 raw `tracking-[…]` values for those four were replaced with `tracking-[var(--ls-…)]` across 64 files (-0.015em and 0.01em, used a handful of times, were left as they are). Change a token and every use follows. The constitution's type table and a new rule say to use them. Not added to the Colour tuner (it only handles colours).
- Fix: the money-in badge and the receipt's status chip used ad hoc greens (`color-mix` of `--success`, Tailwind `emerald`/`rose`/`amber`). They now use the pill tokens (`--pill-success`/`-text`, `--pill-warning`/`-text`) and `text-success-text`, so one place sets them in both themes. The receipt's Failed chip is amber (it was rose), as in the list.
- Override: a failed transaction's amount is muted like a pending one's, struck through; the word under it ("Failed") and the receipt chip are red (the destructive status colour), so Failed and Pending are told apart by the word. The constitution says failed payments are amber; the designer chose red for the word. Candidate for a constitution change.
- Fix: the FX currency converter had no limit on the amount, so a 30-digit entry overflowed the card and produced an absurd result. It now takes at most 12 digits before the point and 2 after (`MAX_WHOLE_DIGITS` in `fx-rates/page.tsx`); a longer paste is cut to fit.
- Decision: the original Beneficiaries page was simplified to two tabs, Beneficiaries and Groups (picked from `docs/beneficiaries-page-variations.html`, option 2). The old People and Billers tabs are one list, flat and A to Z, with one "All types" dropdown beside the search (only kinds you have). Removed: the grouped-by-method accordions, the Flat/Grouped toggle, Expand/Collapse all, the filter panel and applied-filter chips, and each section's Add and Send buttons. Rows keep their Send, Edit and Remove actions and show the kind next to the detail; the add form offers every kind. `?tab=billers` now means the Bills type filter.
- Decision: a beneficiary row is quiet at rest (tile, name, detail) and shows Send, Edit and Remove on hover or keyboard focus; where there is no hover (touch) they stay visible. The green verified tick and the kind chip were removed (the tile shows the kind); only a pending beneficiary is marked, "Pending approval". Group rows work the same way (total and split stay visible; Send, Edit and Delete on hover). Picked from `docs/beneficiary-row-variations.html` (option 5).
- Decision: cardless withdrawal redesigned to match the other flows and say "code" throughout (it was token, voucher and code). Form is from account, recipient number (third party only; no network, narration or category), amount, then Generate Code. A code for yourself goes only to the registered number and shows it masked. The hub's "Active codes" are quiet rows with the code hidden until Show code, and Cancel code beside it. The final screen is the code large and light, amount and expiry, one line of warning, a text Cancel code. Files: `flows/CardlessWithdrawalFlow.tsx`, the cardless hub in `PaymentFlow.tsx`, the voucher block in `PaymentSuccessScreen.tsx`.
- Decision: "Code for Others" has the network select again, as in Send to Wallet: network picker above the number, filled in from the number when it can be, empty to start (no silent default; the cardless state no longer falls back to MTN). The name check waits for both.
- Decision: a cardless withdrawal has its own success page, `payments/CashoutCodeSuccess.tsx`: a ticket (stub with recipient and amount, dashed tear line with notches, the code large on the main half), digits rise in one by one, one amber sweep after they land, then Copy code and Done. No cancel on this screen (cancelling an unused code lives in the Active codes list on the chooser). The old voucher block and `cardlessToken` prop in `PaymentSuccessScreen` were removed.
- Override: the cash-out success page and the Active token dialog follow the Figma frame "Showcase (Copy)" node 6050:1179 1:1, replacing the split-flap board: the designer's scalloped amber ticket (`public/illustrations/cashout-ticket.svg`, subtract-boolean vector) with the GCB eagle (`cashout-ticket-logo.svg`), YOUR TOKEN, the code at 60px bold, Amount and To rows, then "Token generated!", "This token expires after 24 hrs of creation", Share Token and Done. `payments/CashoutTicket.tsx` is the shared ticket; `CashoutCodeSuccess.tsx` and `ActiveCodeDialog.tsx` use it. Deviations from the constitution that the frame requires: weight 700 for the code, uppercase "YOUR TOKEN", "token" wording (the rest of the cardless flow says "code"), Open Sans for the small text (Inter is not loaded), ink is the on-amber token (#290e00) instead of pure black. The success page has Share Token and Done only. The token dialog has Share Token (primary) and Delete token (a danger button that opens a confirmation modal saying the token stops working, can not be undone and the money stays in the account), no Copy.
- Decision: the cash-out ticket (`payments/CashoutTicket.tsx`) was redrawn from a new reference: warm off-white paper (`--ticket-paper` #f1efe8, `--ticket-ink`, `--ticket-rule`, both themes), 278 by 396, scalloped top and bottom edges and a bite on each side, drawn as an inline SVG path (no image asset), the colour GCB eagle (`public/illustrations/cashout-ticket-logo-color-v2.svg`, the brand logo with the dark-mode letter colour fixed to black), "YOUR CODE" 16px semibold, the code 56px bold, a dashed rule, then Amount and To. It replaces the earlier amber Figma ticket and its SVG. The arrival now waits 0.7s before the ticket appears. Weights 600 and 700 are the reference's, not the house style.
- Decision: on the ticket the bites are now symmetrical (8 evenly spaced along the top and bottom, radius 10, half-bites at the corners matching) and the side bites sit on the dashed tear line (y 244) instead of floating at a different height. On the cardless chooser the Active codes are `ActionTile`s (Ticket icon, "For {who}", amount and expiry, chevron), the same tile as the accounts and hub rows, each opening the token dialog.
- Decision: the cash-out success page has a simple arrival (`payments/CashoutTicketArrival.tsx`), one continuous swing: the ticket hangs from its top edge, starts leaning forward (10 degrees, bottom toward the viewer) as it drops 56px with a strong ease-out, is upright mid-fall, swings back past vertical (about 4 degrees) as it lands, overshoots forward a little and settles (damped oscillation, omega 5.5, zeta 0.33, about 2s), with a small out-of-step twist (1.6 degrees about z) so it isn't mechanical. The entry already carries the motion that becomes the flap, so nothing hands over. Single Web Animation sampled from that physics (transform + opacity, off the main thread). Reduced motion gets a 200ms fade only. Dev-only Replay remounts it. The token dialog has no animation. A paper curl was tried in CSS strips, an SVG displacement filter and a WebGL shader and dropped.
- Discovery: `REGISTERED_PHONE` (`useAuthorisation.ts`) is a masked display string ("+233 24 ∗∗∗ 3821"), not a phone number. The cardless hub stored it as the recipient, so the own-number picker never matched it and always said "That wallet is no longer linked". The registered number to store or compare is `REGISTERED_WALLET.phone`. Also `currentAmount` had no `cardless` case (returned 0), which is why the ticket amount was wrong; it now reads `wAmount`.
- Decision: on the cardless chooser each Active code is one tappable row (who, amount, expiry, chevron) that opens `payments/ActiveCodeDialog.tsx`: the code large, a one-line warning, and Cancel code, Share code, Copy code (primary last). Share uses the device share sheet and falls back to copying a short message. Cancelling removes the code and says the money stays in the account.
- Override: a cardless code "for myself" can now go to any of the customer's own numbers (registered number plus linked wallets, via `OwnWalletPicker`, as in Send to Wallet), not only the registered number. PATTERNS.md section 14 still says cardless-for-self is registered-only as a security control; update it if this stays.
- Decision: the generated cash-out code, amount and expiry are made once when the withdrawal is confirmed and stored on the receipt (`ReceiptData.cashout`), so the success screen never changes it.
- Gap: active codes are a mock list (`ACTIVE_CASHOUT_CODES`); cancelling only removes it from the page. Cardless "for others" still can't pick a saved beneficiary or a linked wallet. The review screen is the shared one and still shows generic rows (Payment Method, Delivery Speed).

## 2026-10-14

- Decision: Recommended for you is text only (no photos), fed by the recommendation engine: one plain statement at a time, the reason it's shown, a text link to act, chevrons top right. Variant B chosen and cleaned up; "Not for me" was dropped (no dismissal).
- Override: soft amber corner shapes (inline SVG, `fill-primary`) on that panel, at the designer's request. Constitution 3 bans decorative blobs; if kept, propose the exception.
- Decision: Recommended for you keeps the shapes that shift with each item (variant D, others and the switch deleted). The shapes are closed and oversized, clipped by the panel, so rotating never shows a cut edge.
- Decision: Recommended for you uses four amber layers stacked in the bottom-left corner, faint to solid, each turning with the item. Variants and the dev switch deleted.
- Decision: dashboard empty-state icons are bare and thin (30px, stroke 1.3, muted, no container) in `PanelEmpty` (`dashboard/v2/parts.tsx`). Variants and the switch deleted. Empty panels without an icon (Insights, Timeline layouts) are unchanged.
- Decision: dashboard empty panels (`PanelEmpty`, `dashboard/v2/parts.tsx`) stack a bare thin icon, the message, and the action as the standard small outline `Button` (default radius, like the rest of the dashboard) with extra space above it. Variants and the switch deleted.
- Decision: every mask is now the centred asterisk (∗, U+2217), never a bullet or `xxxx`: hidden amounts, card and account tails, emails. `maskDigits` in `AmountVisibilityProvider.tsx` is the source for amounts; phone numbers already used it. Bullets stay only as separators. Keep new masks on ∗.
- Discovery: the mask sweep also turned Tailwind's `**:` child variant into `∗∗:` in `ui/dropdown-menu.tsx` and `ui/select.tsx`, breaking menu item styles. Restored. When masking again, never touch `**:` in class strings.
- Decision: the Sidi chat header has a Get help menu: call customer care (+233 302 681 531, from the assistant's own help answer) and Find a branch (`/locate-us`). There is no help or support route in the app yet.
- Decision: first-time empty states (Cards, Transactions) are one line-drawing (`states/EmptyArt.tsx`, inline SVG so it follows the theme), a one-line title and one action. No description. `TrueEmptyState` description is now optional. `StateIllustration` renders inline art before looking for a file.
- Decision: first-time empty states keep the centred layout: our own drawing (an object on layered amber shapes, `states/EmptyArt.tsx`), a one-line title and one action. Variants and the switch deleted.
- Decision: every customer first-time empty state with a registered drawing now uses our own art (`states/EmptyArt.tsx`: cards, activity, sources, people, groups, standing orders, statements, rates, chart, caught-up), a one-line title and at most one action. Descriptions were dropped except on FX rates (it says why there are no rates). Transactions action is "Start a transaction" (`/payments`).
- Override: empty states keep their descriptions again (designer's call), with a larger title (18/20px) and larger images (about 190px tall). This reverses the "title plus one action" trim above; descriptions are back to the original copy, including the longer FX rates line.
- Decision: a verified name looks one way everywhere: the green tick plus the name, `VerifiedAccountBadge` in `payments/flows/shared.tsx`, with no box and no "Account Holder:" label. The Link a wallet modal (`LinkSourceAccountModal`) and the Bills flow (`BillsPaymentFlow`) were the two that drew their own; both now use it. Use the badge for any new resolved-name line.
- Decision: in a row of two buttons the primary comes second (secondary first); stacked on a phone or in a column the primary stays on top. Card delivery actions, bulk payment pages, add-signatory and the card limit editor follow it. Dialog footers already did.
- Gap: the trade approval decision row (Approve, Return, Reject) is a three-way choice with the primary first and was left as it is; the payment approval page and a few full-width stacked pairs (forgot password and PIN, request card, first-run welcome, the accounts fund prompt) keep the primary on top by design.
- Gap: the Bills trailing "Verified" button state, the beneficiaries list tick (next to a saved name) and the Settings "Verified" pills are status marks, not resolved names, and were left as they are.
- Decision: four empty states use the designer's 3D renders instead of line drawings: cards (`empty-cards`), payment groups and saved people and billers (`empty-groups`, shared by `empty-people`), linked sources on Accounts (`empty-sources`) and activity (`empty-activity`: Transactions, account activity dialog, card activity). Web-sized copies live in `public/illustrations/*.png` (800px WebP, cropped to the artwork); the 2000px masters stay in `public/emptystates/` (`Activity.png` and `Transactions.png` are identical). `StateIllustration` renders these through `next/image`; the other six keep the inline line art in `states/EmptyArt.tsx`.
- Decision: `/payments/send` loading shows `StepListSkeleton` for the bank choice (`?rail=bank`, no recipient) and the form skeleton otherwise.
- Gap (fixed on `fix/working-log-gaps`: prop removed, text inline): Admin and invest empty states (no registered drawing) keep the icon style and their descriptions. Rates, statements and chart pages have no action, because none makes sense.
- Discovery: Cards and Transactions only showed `TrueEmptyState` when forced from Dev Mode; real empty data rendered an empty list. `effective` now treats `cards.length === 0` and `transactions.length === 0` as empty.
- Gap: the Transactions empty action is "Send money" (`/payments`) because there is no add-money route outside the dashboard's fund modal. On an unfunded account the better action is to fund it. (`CardsEmptyIllustration.tsx` was deleted on `fix/working-log-gaps`.) Other first-time empty lists (people, groups, standing orders, sources) still use the icon fallback.
- Decision: Sidi assistant (`layout/SidiAssistantWidget.tsx`) rebuilt. Launcher is the plain avatar that opens into an "Ask Sidi" pill on hover or focus and turns into a close button when open. No greeting bubble, no online dot: an unsolicited pop-up sits against "nothing between the person and their balance", and a green dot would claim a status we can't back. Panel: "New chat" header, welcome with pill suggestions, input and send only (no attach or skills, by design).
- Gap: assistant copy is hardcoded English (no FR/ES/ZH rows) and the replies are canned. The standing-order answer said "4-digit transaction PIN"; corrected to the 6-digit code per the constitution.
- Discovery: the rolling-number reel fades and clips its top and bottom edges, which cut the comma tail on the hero balance (`leading-none`). `RevealingAmount` now gives the reel room (`leading-[1.3]`, `-my-[0.15em]`, `--rn-edge-fade: 0.05em`).
- Gap: the recommendation copy is hardcoded English (no FR/ES/ZH rows) and the "reason" lines are mock. 

## 2026-10-20

- Override: Online corporate enrolment (`/business/signup/enrol`), status tracking (`/business/signup/status`), and new-business account opening wizard deleted on designer instruction (Ransford Gyasi). Pre-change tree preserved in commit `7fad563`.
- Decision: Business onboarding follows BRD v2 across three clean journeys:
  1. `/business/signup`: front door with business-type chooser (Screen A: Sole Proprietor vs Company/Organisation) and in-branch redirection (Screen B: Set Up at Your Branch) with a confirmation dialog before opening `gcbbank.com.gh`.
  2. `/business/signup/sole-proprietor`: 7-step online self-onboarding for sole proprietors (Ghana Card verification, liveness selfie match, account discovery with unmasked numbers and no balances, OTP, password, PIN) leading directly to `/business/overview`.
  3. `/business/activate`: 6-step activation for invited business users (invitation acceptance, Ghana Card number verification against bank record, OTP, password, PIN) with expired invitation and 3-attempt mismatch lockout states. `/activate` is restored to personal customer activation only.
- Decision: Sole proprietor payments (`paysWithoutApproval`) go straight out after one-time SMS code without an approval leg; button reads "Pay Supplier" and lands on "Payment on its way". Maker/approver corporate accounts continue through 2-party maker-checker. (Ask bank to confirm against BRL-04).
- Decision: Invited user confirms their Ghana Card number against the bank's record at `/business/activate` as a possession check; a third consecutive mismatch locks out to branch.
- Discovery: Business screens (`/business/transactions`, `/business/payments/supplier`) were leaking other demo companies' accounts; now scoped to the signed-in business profile via `activeProfileName()`.
- Gap: Passport onboarding is on hold for personal and sole proprietor; both currently require a Ghana Card (BRL-01, FR-RET-07).
- Gap: `/admin/enrolments` still reviews online applications; workstream 7 converts it to branch capture/submit (FR-ADM-05).
- Gap: Inputter, Reviewer, and Authoriser role names appear only on invitation copy; workstream 1 renames Maker/Approver app-wide.
- Question: In-branch checklist, exact Ghana Card linkage URL, and relationship manager contact for expired invitations.
- Question: D-10. Migration of existing corporate internet banking users.
- Discovery: "Account Not Found" on `/accounts/[id]` came from the Dev Mode dashboard states (wealth, new customer, and others). `dashboard-simulations.ts` builds accounts such as `acc-w-1` and `acc-new-1` that exist in no list, so the dashboard's links failed. Fix: `registerScenarioAccounts` in `mock-data.ts`, which `findAccount` checks after `ACCOUNTS`. Direct URLs to these ids still fail until the dashboard has been visited.
- Decision: the balance eye is the only amount switch. Only the dashboard balance figure hides (`BalanceFigure`, `HeroBalance`), with its own remembered choice (`useBalanceVisibility`, key `nibs-show-balance`, hidden by default). Every other amount in the app always shows. The global hide-amounts state and its eye controls on Accounts, Settings, Cards and the unused `LiquidityDeck` are gone.
- Gap: CONSTITUTION §2 still says every amount respects the hide-amounts setting, and §4/§5 are untouched. Update §2 once the designer confirms the new rule.
- Gap: about 30 files still read `useAmountVisibility()` and keep their hidden-amount branches (`showAmounts ? … : mask`). The hook now returns `showAmounts: true`, so those branches never run. Strip them in a cleanup pass. Dashboard components still take a `showAmounts` prop, which overview passes as `true`.
- Decision: Schedule Payment from a completed payment hands its details over in memory (`lib/schedule-handoff.ts`, not the URL, since they include account and phone numbers). `StandingOrderFlow` opens with the recipient, source, amount and narration filled in and shows them as a summary. Only the frequency, dates and confirm step are asked. Payment rails that standing orders don't offer (ECG, bill, card top-up, QR, cardless, SWIFT, PAPSS, GhanaGov) hide the Schedule Payment card.
- Decision: QR. The receiving account picker sits above the QR code. The hub's QR tile opens Scan & Pay (`mode=scan`), and the personal QR modal opens My QR (`mode=myqr`).
- Decision: Telecel Broadband asks for its account number (was "User ID"). MTN TurboNet still asks for a paired mobile number, since that product is mobile-based.
- Decision: sidebar reworked to Home, Accounts, Send & Pay, Cards, Insure, Invest, Loans, Beneficiaries, More Services (Lifestyle, EagleSave, FX Rates), Help & Support, My Profile (`lib/navigation.ts`).
- Gap (resolved 2026-10-21): `/help` and `/eaglesave` now have Work in progress pages, so they no longer 404. My Profile has since left the sidebar.
- Gap: Help & Support's sub-items (Contact Us, FAQs, Report an Issue, Track Complaint) have no pages, and the nav has no dropdown for them.
- Decision: Pay again repeats the last amount. Each payee's link carries `amount`, and `PaymentFlow` fills the rail's amount field (`REPEAT_AMOUNT_FIELD`), which stays editable. Mock amounts are invented per payee; they don't come from the transaction history, since the demo payees don't appear in it.
- Gap: Pay again is payee-based, not a list of past transactions. Narration and the source account aren't carried over. If the designer meant the list to be past transactions, that's a rebuild.
- Decision: Recommended for you links go to the transaction: DStv to `/payments/send?rail=bill&billerId=bil-006`, term deposit to `/invest/term-deposits/new`, salary advance to the new `/loans/salary-advance` form, and the wealth item to `/payments/standing/new` ("Set up a standing order"; there is no goals feature).
- Gap: the Recommended for you items other than the salary advance (DStv, term deposit, saving) still lack FR/ES/ZH rows.
- Decision: "GCB Pay" renamed to "Bills" everywhere (labels, breadcrumbs, the payments hub card and the FR/ES/ZH values: Factures, Facturas, 账单).
- Decision: `type-page-title` (globals.css) is the one source for the page title size, 18 → 20 → 22px. The other responsive sizes (15/16, 26/28, 46/48 and so on) are still per-file; tokenize them only once the designer picks the steps.
- Discovery: picking a saved GCB recipient never verified, because `OtherGcbFlow` required 13 digits and the seeded GCB payees had 10 to 12. A picked saved recipient now counts as verified (`pickedAcct`); typing a number still needs 13.
- Decision: seeded GCB account numbers are 13 digits in `beneficiaries-store`, `groups-store`, `flows/beneficiaries.tsx`, `PaymentFlow` and the `ACCOUNT_RESOLUTIONS` table. Justice Oduro is a GCB customer everywhere (he was Standard Bank in two stores). The business payee Accra Fabrics keeps the old number `0231 4455 8890`, so it no longer collides with Justice.
- Decision: Payment sent screen (`PaymentSuccessScreen`) follows variation 3 of `docs/payment-sent-refinements.html`: flat 88px badge (no sheen), amounts and payee in the message at full strength (`emphasise`), the three actions as round icons with short labels (Feedback, Schedule, Receipt), and Save as Beneficiary beneath them. Every gap between the blocks is 32px. The eagle intro and pulse rings are kept.
- Gap: `emphasise` only bolds the payee when a caller passes `beneficiaryName` (only `PaymentFlow` does). Other rails bold the amount only.
- Decision: the Share Feedback dialog (in `PaymentSuccessScreen`) is progressive. One question and three round faces first; picking one reveals a follow-up note field worded for that answer, and Submit appears only then. The inline thank-you banner is gone (the toast already says it).
- Override: the designer wants the emoji faces (😊 😐 ☹️) kept for the feedback ratings, against the Lucide-only icon rule (CONSTITUTION §7).
- Decision: period pickers (1w, 1m, 3m, 6m, 1y) use `RangePills` (`components/ui/range-pills.tsx`): outlined pills, the chosen one amber like the sidebar's active item. Used by `SpendsRadialChart` and `DashboardAnalyticsWidget`.
- Decision: repeated UI is now shared. `SegmentedControl` (now with optional `count`) drives the Cards filter, Beneficiaries tabs, Insights period, Account expenses view and Create Group split. New in `components/ui`: `SectionHeading` (title, optional info hint, optional action), `ListCard` (the white rows box, `as="div"` for non-list children), `SearchField`, `Fact`, `HorizontalScrollStrip`; `GcbEagleEmblem` is in `components/brand`. Payment sent now uses `Switch` and `RoundAction`.
- Gap: still hand-drawn and not worth a component yet: the theme switch in `TopHeader` (icon-only round segments), the `bg-card` panels in admin and business pages (they hold tables and forms, not rows), `AttentionBand` and `Collapsible` in `MinimalKit`, and the Feedback face picker (a selectable choice, not an action).

## Consolidation history
- **2026-10-03:** Bootstrap. Built the five files from these sources:
  - `.ai/INTERFACE.md`, `LEARNINGS.md`, `EXECUTION.md` and `STATES.md`
  - `DESIGN-LANGUAGE.md`, `DESIGN-PLAN.md` and `DESIGN-TIMELINE.md`
  - the old root `AGENTS.md`, `.cursorrules` and `CLAUDE.md`
  - Claude's private project memory
  - the BRD and the screen-consolidation spec

  EXECUTION.md's 384-line change history was not carried over; git and `docs/archive/` hold it. Only
  its open items were kept (above).

### 2026-10-26
- Decision (designer): the About entry on every product page (Insure plan, Loans advance, Invest products) is an `About` chip in the header (`components/ui/about-sheet.tsx`) that opens a centred sheet. The About routes are deleted. Insure and Loans show it only once something is held (the pitch is the About); Invest shows it always.
- Decision (designer): held product pages share `HolderActions`: heading, list, filled button, then View Statements where one exists. All Invest, Insure and Loans service pages use one 560px column with the header inside it.

### 2026-10-27
- Decision (designer): a securities account being set up is amber everywhere (the Invest card chip and the banner on Treasury Bills & Bonds, an `act` alert with the "!"). Once it is ready after a choice was saved it is a success banner (`success: true`: green, with a tick) whose detail names that choice. Dev Mode: Securities account has a fourth state, Active, choice saved.
