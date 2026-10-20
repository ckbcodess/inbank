# Business onboarding rework: execution plan

> **Partly superseded (2026-10-20, later the same day).** After the call with Esther the designer brought the online
> company application back, reworked to the bank's process. §2.1 Screen B and the deletion of `/business/signup/enrol`
> and `/business/signup/status` no longer apply. See PRODUCT.md (Business onboarding) and the WORKING_LOG Override.

Written 2026-10-20 on branch `feat/corporate-banking` (clean at `7fad563`). Approved by the designer, Ransford Gyasi.
This plan is self-contained: an agent with no memory of the planning conversation can execute it end to end.

---

## 0. Before you touch anything

1. Read `agents/AGENTS.md`, `agents/CONSTITUTION.md` and `agents/PATTERNS.md`. They are binding. This plan
   repeats the rules that matter most, but where it is silent the constitution decides.
2. Run `git status`. The tree should be clean. If it isn't, stop and tell the designer.
3. House rules for this job:
   - **Never** run `npm run build` or `npm run dev` or open a browser preview. The designer runs a dev server,
     and `next build` breaks it. Verify only with `npx tsc --noEmit`, `npx eslint <paths> --max-warnings=0`
     and `npx tsx scripts/i18n-coverage.mts`.
   - Don't commit, push or open a PR unless the designer asks.
   - Keep comment density and naming like the surrounding code. File-top docblocks say *why* a screen exists.
     They are not changelogs.
4. Work the phases in order. Each phase ends with a check. Don't start the next phase until the check is
   clean, because later phases assume earlier ones compiled.

---

## 1. Why this exists

The business onboarding was built against BRD v1 and a 2026-10-19 decision. BRD v2 (`GCB Internet Banking
Phase1 BRD Final 0.pdf`, the current baseline, not in the repo) changes it:

| Today | BRD v2 |
|---|---|
| `/business/signup` opens a new business account online (company, TIN, signatories, documents) | Account opening is out of scope for Phase 1 |
| `/business/signup/enrol`: an existing company enrols online (6 steps, mandate roles, wet-ink pack, upload) | **The branch captures the corporate application**, and bank administrators set up users, roles, mandates and limits (§8.3, FR-ADM-01, FR-ADM-02, FR-ADM-05) |
| `/business/signup/status`: an application tracker | Not in the BRD; it only served the online application |
| *(missing)* | **Sole proprietors self-onboard** with Ghana Card or passport, with no branch visit (§5.1 Corporate, "Self-Onboarding: Sole Proprietor") |
| Invited-user activation is hidden inside `/activate?invite=1` and says "Corporate Maker" and "Invited by Corporate Admin" | Users set up by the bank still activate, but the bank sets them up, and the roles are Inputter, Reviewer and Authoriser (FR-COR-04 to FR-COR-06, BRL-03, BRL-05) |

The designer also finds the current business screens too text-heavy. The personal flows (`/get-started`,
`/signup`, `/activate`) have the look to match: **one title, one short line, then the action**.

### Designer decisions (2026-10-20). Final; don't re-ask.

- **Delete the old flows** outright (account opening, online enrolment, status tracker). Git is the undo.
  This overrides the 2026-10-20 log entry that held online enrolment "as is" until the bank answered.
- **Passport is on hold.** The sole proprietor flow is Ghana Card only. Don't build a passport toggle, field or
  placeholder.
- **A sole proprietor never needs an approval.** It is a single user with one role. Their payments go straight
  out after the one-time code, with no approval queue.
- **An invited user must confirm their Ghana Card number** before the code step. The number is matched against
  the record the bank holds for them. There is no selfie.

---

## 2. The experience, screen by screen

All three journeys use `AuthLayout` (`src/components/auth/AuthLayout.tsx`) with `width="compact"`, the default
`variant`, `stepProgress` on multi-step flows and `animateHeight` on step changes. That is exactly how
`src/app/signup/page.tsx` uses it. The steps reuse the shared components, so nothing is restyled by hand:
`GhanaCardInput` (`components/ui/ghana-card-input`), `Field`, `SelfieCapture`, `OtpInput` (`OTP_LENGTH`),
`NewPasswordFields` with `newPasswordReady`, `PinRequirements`, `AlertToast` and `Button` (`loading` for busy
state, `disabled` only for validity).

The new screens have none of these:
- the labelled step strip (`<ol>` of "Company / Contact / ...")
- paragraphs under the title
- `ReviewSection` boxes
- callout cards
- explanatory blurbs on choice tiles (one short subtitle only)
- `uppercase` labels
- hardcoded palette colours (`amber-*`, `emerald-*` and so on)

Status colours come from tokens only (`text-success-text`, `bg-pill-success` and so on).

### 2.1 `/business/signup`: the door (rewrite of the existing page)

The login page's business "Get started" button already links here.

**Screen A** (default)
- Title: `How Is Your Business Set Up?`
- Description: `Choose the option that describes your business.`
- Back: `backHref="/login?type=business"`, `backLabel="Back to login"`
- Two option tiles, built exactly like `src/app/get-started/page.tsx`:
  - `Store` icon, `Sole Proprietor`, subtitle `I run the business in my own name.`, chevron. Navigates to
    `/business/signup/sole-proprietor`.
  - `Building2` icon, `Company or Organisation`, subtitle `Limited company, partnership, NGO and others.`,
    chevron. Shows Screen B.
- Under the tiles: `Already registered? Login`, linking `/login?type=business`, styled as on `/get-started`.

**Screen B** (company, local state like get-started's `screen === 2`, deep-linkable as `?type=company`)
- `icon={Building2}`, `align="center"`
- Title: `Set Up at Your Branch`
- Description: `Your branch registers your company and sets up each user from your account mandate. Everyone then
  gets an invitation to activate.`
- One primary button `Find a Branch`. It opens a confirm dialog modelled on
  `src/components/accounts/OpenGcbAccountDialog.tsx` (title `Find a GCB Branch`, body
  `You will be redirected to gcbbank.com.gh to find your nearest branch.`, buttons `Cancel` and
  `Continue to website`), which opens `https://www.gcbbank.com.gh` in a new tab.
  - Make it a small new component, `src/components/corporate/FindBranchDialog.tsx`. Don't generalise the
    personal dialog: it lives in personal code.
- Back returns to Screen A (`onBack`).
- No document checklist and no RM contact. Neither is in the BRD, and we don't invent them.

### 2.2 `/business/signup/sole-proprietor`: sole proprietor self-onboarding (new route)

Seven steps, mirroring `/activate`. It uses the step ids in `src/lib/onboarding-steps.ts` (`ghana_card`, `selfie`,
`review_details`, `otp`, `password`, `pin`, `confirm_pin`) and supports `?step=` with `parseOnboardingStep`,
like `/signup` does.

| # | Step id | Title | Description | Content and action |
|---|---|---|---|---|
| 1 | `ghana_card` | `Verify Your Identity` | `We will securely verify your identity using your Ghana Card.` | `Field label="Ghana Card Number"` around `GhanaCardInput`, prefilled with the sole proprietor demo card. `Continue`. Terms and Privacy line underneath, copied from `/signup`. |
| 2 | `selfie` | `Selfie Match` | `Center your face in the circle.` | `SelfieCapture`, as in `/signup`. |
| 3 | `review_details` | `Confirm Your Business` | `We found this business under your Ghana Card.` | The verified-holder row from `/signup` step 3 (avatar or selfie, holder name, card number, the `Verified` pill). Under it the business name as a quiet heading row (`text-[14px] font-medium`), then the business's accounts as rows: name plus `•••• 1234`, **no balances** (CONSTITUTION: account lists show none). Rows are separated by whitespace with no box. Button: `Continue`. There is no default-account picker, because business banking has no default-account concept. |
| 4 | `otp` | `Confirm Your Code` | `A 6-digit code has been sent to {masked registered mobile}.` plus `Please enter the code below.` | Copy the `/signup` OTP block exactly: resend countdown, `*422*11#` line, `000000` demo error. |
| 5 | `password` | `Create Your Password` | `Choose a password you will remember.` | `NewPasswordFields`; button `Proceed`. |
| 6 | `pin` | `Set Your PIN` | `Set a 4-digit PIN for secure access.` | Same as `/signup`. |
| 7 | `confirm_pin` | `Confirm Your PIN` | `Re-enter your 4-digit PIN to confirm.` | Same as `/signup`, including two misses restarting the PIN. On success: sign in as the sole proprietor actor (§3.1), `selectProfile` its profile, `verifyMfa()`, `setFirstRun("new")`, `setPendingReferral(false)`, then `router.push(homePathForActor(actor))`, which lands on `/business/overview`. |

The registered mobile isn't typed. It comes from the bank record (resolve, don't ask) and is shown masked with
`maskMobile`. Back follows `/activate`'s `handleBackStep` order, and step 1's Back goes to `/business/signup`.

**Outcomes off the happy path.** Each one renders in place of the step content: same `AuthLayout`,
`align="center"`, an icon, one primary action. No stepProgress on these.

| Outcome | When (demo) | Icon | Title | Description | Action |
|---|---|---|---|---|---|
| ID not verified | step 1 with the "not verified" demo card | `ShieldAlert` | `We Couldn't Verify Your Ghana Card` | `Link your Ghana Card to your GCB account, then try again.` | `Link Your Ghana Card`: opens the GCB Ghana Card linkage page on `gcbbank.com.gh` in a new tab (BRD §13 retail fallback). Secondary `Try Again` resets to step 1. |
| No business account | step 1 with the "no account" demo card | `SearchX` | `We Couldn't Find a Business Account` | `There's no sole proprietor account under this Ghana Card. Your branch can help.` | `Find a Branch` (the `FindBranchDialog`). Secondary `Try Again`. |
| Company signatory | step 1 with the "company signatory" demo card | `Building2` | `Your Business Is Registered as a Company` | `Companies are set up at the branch. Each user then gets an invitation.` | `Find a Branch`. Secondary `Back to Options` goes to `/business/signup`. |

Outcomes are reachable from the Demo hub with `?outcome=not-verified|no-account|company`.

### 2.3 `/business/activate`: invited business user (new route; moves out of `/activate`)

Six steps. Step ids: `invite`, `ghana_card`, `otp`, `password`, `pin`, `confirm_pin`, plus `?step=`.
`?expired=1` shows the expired state, and `?outcome=locked` shows the lockout.

| # | Step | Title | Description | Content and action |
|---|---|---|---|---|
| 1 | `invite` | `Accept Your Invitation` | `GCB Bank has set you up on Adinkra Textiles Ltd's business banking.` | Quiet label and value rows, no card (whitespace first): `Your Role` → `Inputter`, with one muted line under it: `You prepare payments. Someone else reviews and authorises them.` `Accounts You Can See` → one line per account (`Corporate Current Account •••• 6789`). Button `Accept Invitation`. |
| 2 | `ghana_card` | `Confirm Your Identity` | `Enter the Ghana Card number GCB Bank holds for you.` | `Field label="Ghana Card Number"` and `GhanaCardInput`, prefilled with the invitee's demo card. `Continue`. A mismatch shows the inline error (`AlertToast`, as `/signup` uses for field errors): `This number doesn't match the one GCB Bank holds for you. Check it and try again.` A third mismatch shows the lockout. |
| 3 | `otp` | `Confirm Your Code` | `A 6-digit code has been sent to {masked mobile on the mandate}.` plus `Please enter the code below.` | Same OTP block as `/signup`. |
| 4 | `password` | `Create Your Password` | `Choose a password you will remember.` | Same as `/signup`. |
| 5 | `pin` | `Set Your PIN` | `Set a 4-digit PIN for secure access.` | Same as `/signup`. |
| 6 | `confirm_pin` | `Confirm Your PIN` | `Re-enter your 4-digit PIN to confirm.` | Same as `/signup`. On success: sign in as `u-dual` (Kwame Boateng, the inputter), `selectProfile`, `verifyMfa()`, `setFirstRun("new")`, `setPendingReferral(false)`, `router.push(homePathForActor(actor))`. That is exactly what `/activate` does today for `isCorpInvite`. |

Two states replace the flow (centred, icon, one action):

- **Expired** (`?expired=1`): `Clock` icon, title `This Invitation Has Expired`, description
  `Ask your branch or relationship manager to send you a new one.`, button `Go to Login` (`/login?type=business`).
  Don't state an expiry period: no source gives one.
- **Locked** (third Ghana Card mismatch, or `?outcome=locked`): `ShieldAlert` icon, title
  `We Couldn't Confirm Your Identity`, description `For your security, finish setting up at your branch.`,
  button `Find a Branch` (`FindBranchDialog`). This is the BRD's lockout-then-branch rule (SEC-05, §13).

Use Inputter, Reviewer and Authoriser only on this screen. The rest of the app still says Maker and Approver;
workstream 1 renames them (log a Gap, see Phase 6). Role explanations, one line each, kept as data in §3.2:
- Inputter: `You prepare payments. Someone else reviews and authorises them.`
- Reviewer: `You check payments and pass them on, or send them back with a comment.`
- Authoriser: `You give the final approval that sends a payment.`

### 2.4 What the feel checks say (fintech-ux)

- **The moment:** a business owner or employee at a desk, impatient and slightly suspicious. They want to know
  why each thing is asked and how far through they are.
- **The one action** on each screen is the single primary button.
- **In control?** Yes. Every step says what is checked, the progress bar shows how far in they are, and every
  failure names a way forward.
- **Without judgment?** Yes. No "invalid". Failures name the fix (link the card, see the branch).
- **Lighter?** Yes. Companies go from 6 steps plus a wet-ink pack to one screen. The sole proprietor gets the
  same 7 steps as personal. The invitee goes from 4 steps to 6. The extra Ghana Card step is the designer's
  deliberate security trade-off, and it is named here.
- **Named "no":** without a status tracker, a company has no in-app view of its branch application. The
  invitation is the "it's ready" moment, and the BRD doesn't ask for a tracker.

---

## 3. Data and model changes

### 3.1 Sole proprietor actor and data (business code only)

`src/lib/roles.ts` (shared):
- Add `"SOLE_PROPRIETOR"` to `Role`, in the customer group.
- `ROLE_LABEL.SOLE_PROPRIETOR = "Sole Proprietor"`.
- `SHELL_OF_ROLE.SOLE_PROPRIETOR = "customer"`.
- Run `tsc`. Any exhaustive `Record<Role, …>` elsewhere will fail, so add the key there too.

`src/lib/corporate/roles.ts`:
```ts
/**
 * A sole proprietor is the business's only user, so there is no one else to approve their payments: the
 * one-time code is the authorisation (designer decision 2026-10-20; BRL-04's segregation needs two people).
 */
export function paysWithoutApproval(role: Role): boolean {
  return role === "SOLE_PROPRIETOR";
}
```

`src/lib/corporate/ledger.ts`:
- `SOLE_PROPRIETOR_PROFILE: Profile = { id: "prof-sole", kind: "CORPORATE", name: "Akosua Darko Enterprises", reference: "SP-40217" }`.
- Add to `CORPORATE_ACTORS`:
  `{ id: "u-sole", name: "Akosua Darko", email: "akosua.darko@example.com", phone: "0244300414", role: "SOLE_PROPRIETOR", shell: "customer", profiles: [SOLE_PROPRIETOR_PROFILE], tradeEligible: false }`.
  - Check first that the phone is unused (`grep -rn 0244300414 src`).
  - `tradeEligible: false`, because trade is not in BRD v2 and a sole proprietor has no trade relationship in the demo.
- Add two accounts to `CORPORATE_ACCOUNTS`, both with `profileKind: "CORPORATE"`, `companyName: "Akosua Darko Enterprises"`,
  `mandate: "Sole signatory"`, `status: "Active"`, `relationshipManager: null`:
  - `acc-sole-1`: "Business Current Account", `1001 5566 7788`, Current, GHS, balance 48,250.00, available 48,250.00
  - `acc-sole-2`: "Business Savings", `3300 5566 7789`, Savings, GHS, balance 12,400.00, available 12,400.00
- Add 6 to 8 realistic `CORPORATE_TRANSACTIONS` on `acc-sole-1`, so the sole proprietor's home and Transactions
  aren't empty: customer receipts, a supplier payment, a utility bill, rent, bank charges. Match the existing
  rows' shape exactly. Categories must come from `CORPORATE_CATEGORIES`. The `NIB-2026-xxxxxx` references must
  be unique, and dates in the last 30 days before 2026-10-20.
- Copy the existing account shape exactly: if other rows carry `signatories`, give the sole accounts one
  signatory, Akosua Darko.

`src/lib/corporate/accounts.ts`, `explainMandate`: add a case `"Sole signatory"` returning
`"You are the only person who can authorise payments from this account."`

**Scope business data to the signed-in business (fixes a real leak).** `businessAccounts()` currently returns every
`CORPORATE` account. So Adinkra Textiles' users today also see Volta River Logistics' and Gold Coast Mining's
accounts, which were added for the enrolment demo. Change it to:
- `businessAccounts()`: the CORPORATE accounts where `(a.companyName ?? CORPORATE_PROFILE.name) === activeProfileName()`.
  - `activeProfileName()` reads `useSession.getState().activeProfile?.name` (falling back to
    `actor?.profiles[0]?.name`, then `CORPORATE_PROFILE.name`). Check `src/lib/session-store.ts` for the exact
    field names. `acc-004` has no `companyName`, so it stays Adinkra's.
  - Keep the existing `type !== "Foreign Currency"` and `!scenarioOnly` filters by building on
    `accountsForProfile("CORPORATE")`.
- `findBusinessAccount(id)`: only resolves when the id is in `businessAccounts()`.
- New `businessTransactions()`: `transactionsForProfile("CORPORATE")` filtered to the account ids of
  `businessAccounts()`.
  - Replace the two business call sites: `src/app/business/(app)/transactions/page.tsx:22` and
    `src/components/corporate/payments/SupplierPaymentFlow.tsx:66`.
  - Then `grep -rn 'transactionsForProfile("CORPORATE")\|accountsForProfile("CORPORATE")' src` and route any
    other business-side caller through these helpers.
  - Check whether `/business/overview` reads `lib/dashboard-insights.ts` (`transactionsForProfile(kind)`). If it
    does, give that path the same scoping without touching personal behaviour. Business code may pass already
    scoped rows in; it must not add a CORPORATE branch inside a personal file.
- `/admin/*` reads the admin's own data paths. Confirm with grep that no admin page imports `businessAccounts`.
- Regression check: write down `businessAccounts().map(a => a.id)` for Adinkra before and after (by reading the
  data). After the change it should be `acc-001, acc-002, acc-003, acc-004` minus foreign-currency or
  `scenarioOnly` ones, and no `acc-volta-*`, `acc-gold-*` or `acc-sole-*`.

### 3.2 Onboarding demo data: new `src/lib/corporate/onboarding.ts`

One business-owned module holds every demo value the three journeys use, so the screens hold no hardcoded
people:

```ts
export const SOLE_PROPRIETOR_DEMO = {
  ghanaCard: "GHA-445566778-2",
  holderName: "Akosua Darko",
  businessName: "Akosua Darko Enterprises",
  mobile: "+233244300414",
  actorId: "u-sole",
  accountIds: ["acc-sole-1", "acc-sole-2"],
};

/** Which outcome a typed Ghana Card number leads to (demo only). Anything else is the sole proprietor. */
export function soleProprietorOutcome(card: string): "ok" | "not-verified" | "no-account" | "company"
//   "...999999999..." → not-verified, "...111111111..." → no-account, "...223344556..." → company

export const BUSINESS_INVITE_DEMO = {
  companyName: "Adinkra Textiles Ltd",
  inviteeName: "Kwame Boateng",
  role: "Inputter" as BusinessUserRole,
  ghanaCardOnRecord: "GHA-334455667-8",
  mobile: "+233244300411",
  actorId: "u-dual",
  accountIds: ["acc-001", "acc-002"],
};

export type BusinessUserRole = "Inputter" | "Reviewer" | "Authoriser";
export const BUSINESS_ROLE_LINE: Record<BusinessUserRole, string> = { /* the three lines in §2.3 */ };

export const INVITE_MAX_ATTEMPTS = 3;
export const FIND_BRANCH_URL = "https://www.gcbbank.com.gh";
export const GHANA_CARD_LINKAGE_URL = "https://www.gcbbank.com.gh"; // the bank hasn't given the exact page; see WORKING_LOG
```

- Normalise card numbers with the same helper `GhanaCardInput` uses (look in `src/lib/ghana-card.ts`).
- Account names and numbers for the screens come from the ledger by id (`findAccount`), never retyped.
- Mobiles are masked with `maskMobile` from `@/lib/auth-shared`.

### 3.3 Sole proprietor payments go straight out

`src/lib/corporate/payments.ts`:
- Pull the ledger-entry builder out of `submitSupplierPayment` into a private `buildSupplierTransaction(request, state)`,
  so there is one source per fact.
- Add `sendSupplierPayment(request)`. It records the transaction with `state: "pending"` (on its way) and does
  **not** touch `APPROVAL_QUEUE`. It returns `{ transaction }`.
- `submitSupplierPayment` keeps its behaviour and signature.
- Update the file docblock: makers submit for approval; a sole proprietor's payment goes straight out after the code.

`src/components/corporate/payments/SupplierPaymentFlow.tsx`: branch on `paysWithoutApproval(actor.role)`
(`const direct = actor ? paysWithoutApproval(actor.role) : false`). Every payment still goes through the one-time
code (`TransactionOtpModal`, CONSTITUTION §2). Only the approval leg disappears.

| Place | Maker (unchanged) | Sole proprietor |
|---|---|---|
| Review total line (~l.209) | `… leaves {account} once approved, fee included.` | `{total} leaves {account}, fee included.` |
| Review note (~l.223) | approval note | Remove the note entirely. Nothing needs saying. |
| Review button (~l.228) | `Submit for Approval` | `Pay Supplier` |
| OTP modal summary (~l.244) | `Submit {amount} to {supplier} from {account} for approval.` | `Pay {amount} to {supplier} from {account}.` |
| Confirm call | `submitSupplierPayment(...)` | `sendSupplierPayment(...)` |
| Done title | `Submitted for approval` | `Payment on its way` |
| Done body | unchanged | `{amount} to {supplier} has left {account}. You'll see it settle in Transactions.` |
| File docblock | — | Add one sentence: a sole proprietor's payment goes straight out after the code. |

Then:
- `src/app/business/(app)/payments/page.tsx`: the Pay a Supplier tile description becomes
  `One bank transfer to a supplier` for a sole proprietor and stays `One bank transfer, sent for approval` for
  everyone else. Read the role with `useSession`, and add `"use client"` only if the file isn't client already.
- Run `grep -rn -i "approv" "src/app/business/(app)" src/components/corporate`. For every customer-visible line a
  sole proprietor could see, make it honest for them, or confirm it is already role-gated (`isApprover`,
  `isCorporateAdmin` and the nav are). Leave trade screens alone (`[NOT IN v2]`, held), and since a sole
  proprietor is `tradeEligible: false` they never reach them.

---

## 4. Phases

### Phase 1: data and roles
1. §3.1: role, predicate, profile, actor, accounts, transactions, `explainMandate`, data scoping.
2. §3.2: `src/lib/corporate/onboarding.ts`.
3. §3.3: payments lib and `SupplierPaymentFlow`, then the payments hub tile and the approval-copy sweep.

**Check:** `npx tsc --noEmit` is clean, ignoring stale `.next/types` errors for deleted routes. Then
`npx eslint src/lib src/components/corporate "src/app/business" --max-warnings=0`.

### Phase 2: the door, `/business/signup`
1. Replace `src/app/business/(entry)/signup/page.tsx` entirely with §2.1. Keep the `Suspense` wrapper pattern
   from `/signup` because of `useSearchParams`.
2. Create `src/components/corporate/FindBranchDialog.tsx`.
3. `src/app/login/page.tsx:196`: the business link text becomes `New to Business Internet Banking? Register`,
   mirroring the personal `New to Internet Banking? Register`.
4. Leave the existing `loading.tsx` convention alone. If `signup/` has no `loading.tsx`, add one that renders the
   same skeleton the deleted `enrol/loading.tsx` did (read it before deleting in Phase 5).

### Phase 3: sole proprietor flow
1. Create `src/app/business/(entry)/signup/sole-proprietor/page.tsx` per §2.2 and a `loading.tsx` beside it.
   Base the structure on `src/app/signup/page.tsx`: same state shape, handlers, OTP countdown, PIN rules and
   miss handling. Copy rather than import from the page; pages don't share code. If a block is copied a third
   time, note it as a `Candidate pattern` in the log rather than abstracting now.
2. Outcomes per §2.2's table, driven by `soleProprietorOutcome()` on step 1 and by `?outcome=`.
3. `src/lib/nav-history.ts` `surfaceOf`: `/business/signup` is already public, so nothing to do. Confirm it.

### Phase 4: invited user flow, and the clean-up of `/activate`
1. Create `src/app/business/(entry)/activate/page.tsx` per §2.3, with a `loading.tsx`. Its Ghana Card mismatch
   counter lives in component state; the third miss shows Locked.
2. `src/lib/nav-history.ts` `surfaceOf`: add `if (pathname.startsWith("/business/activate")) return "public";`
   **before** the generic `/business/` line. Otherwise Back would treat activation as an app page.
3. Remove every corporate branch from `src/app/activate/page.tsx`:
   - `inviteParam`, `scenarioParam`'s `corp-` use, `isCorpInvite` and `isCorpExpired`
   - the invitation JSX block and its expired block (which has the hardcoded `amber-*` colours)
   - the corp titles and descriptions, the corp stepProgress (back to `stepNumberMap[step]` of 7), and the corp
     actor choice in `handleConfirmPinSubmit` (keep `setPendingReferral(true)`)
   - the corp case in `handleBackStep` (`otp` goes back to `review_details`)
   - imports that are now unused (`Building2`, `AlertTriangle`, `Link` and so on, whatever tsc and eslint flag)
4. `src/lib/activation.ts`: delete the five `corp-*` entries in `ACTIVATION_SCENARIOS`, then follow tsc and grep
   for any `"corporate"` `ActivationMode` or `"inviteExpired"` variant that is now unused, and remove it.
   - Rewrite the docblock lines that describe "corporate — invite issued by a Corporate Admin". Business users
     now activate at `/business/activate` after the bank sets them up.
   - Only remove what grep proves unused.

### Phase 5: delete the old flows
1. Before deleting, read `src/app/admin/enrolments/page.tsx`, `src/app/admin/enrolments/[id]/page.tsx`,
   `src/app/business/(app)/administration/page.tsx` and `src/lib/enrolment-store.ts`, and list which exports of
   `src/lib/corporate-enrolment.ts` they use. **Those stay.** The admin queue and Administration keep working
   on seeded data until workstream 7.
2. Delete:
   - `src/app/business/(entry)/signup/enrol/` (the whole folder)
   - `src/app/business/(entry)/signup/status/` (the whole folder)
   - `src/lib/signup-business.ts`
   - `src/components/auth/BusinessFormShared.tsx`, only if `grep -rn BusinessFormShared src` returns nothing
     after the step above
   - from `src/lib/corporate-enrolment.ts`, only the exports used solely by the deleted pages: the scenario list,
     labels and ids, `findCorporateEnrolmentScenario`, `CorporateEnrolmentStep`, `CorporateEnrolmentVariant`,
     and `lookupCorporateAccount` / `MOCK_CORPORATE_COMPANIES` / `cleanAccountNumber` if nothing else uses
     them. Prove each with grep. Update its docblock.
3. Demo hub:
   - Rewrite `src/components/dev/BusinessFlowSections.tsx` into three sections that link the new flows:
     - **Sole proprietor**: the 7 steps (`/business/signup/sole-proprietor?step=…`), then three rows,
       `ID not verified`, `No business account` and `Registered as a company` (`?outcome=…`).
     - **Company**: `Choose business type` (`/business/signup`), `Set up at your branch`
       (`/business/signup?type=company`), and `Bank setup queue`, which signs in as `u-rm` and opens
       `/admin/enrolments` (the existing `signInAs` row).
     - **Business users**: the 6 steps (`/business/activate?step=…`), `Invitation expired` (`?expired=1`),
       and `Identity not confirmed` (`?outcome=locked`).
   - Keep the component's props and row styles. Drop the imports of the deleted modules and any props that are
     now unused (`scenario`, `reference`), and update its caller.
   - `src/components/dev/PersonaFlowSwitcher.tsx`:
     - add `{ id: "u-sole", label: "Sole Proprietor" }` to `BUSINESS_USERS`
     - add `/business/signup/sole-proprietor` and `/business/activate` to `ONBOARDING_PATHS`
     - remove `/business/signup/enrol` or `/status` if they are listed anywhere
4. Sweep for dead references. Each of these must return nothing outside `agents/`, `docs/` and this plan:
   ```bash
   grep -rn -E "signup-business|signup/enrol|signup/status|invite=1|corp-invite|isCorpInvite|BUSINESS_SIGNUP_SCENARIO|CORPORATE_ENROLMENT_SCENARIO" src
   ```

**Check:** `tsc` clean; `npx eslint . --max-warnings=0`.

### Phase 6: copy, translations and memory
1. Translations: run `npx tsx scripts/i18n-coverage.mts --all`.
   - Every new customer-facing string from §2 and §3.3 gets an FR, ES and ZH row. Onboarding strings go in
     `src/lib/i18n/catalog/onboarding.ts`; business payment strings go in `src/lib/i18n/catalog/business.ts`.
     Follow the existing `[en, fr, es, zh]` tuple format and tone.
   - Customer data (names, company names, account numbers) is never translated.
   - Remove catalog rows whose English text no longer appears anywhere in `src` because their screen was deleted.
     Check each with `grep -rnF "<english>" src --include=*.tsx --include=*.ts`, and only delete a row when the
     sole remaining hit is the catalog itself.
2. Constitution sweep on every new or rewritten file:
   ```bash
   grep -n -E "uppercase|font-semibold|font-bold|#[0-9a-fA-F]{3,6}\b|(text|bg|border)-(amber|emerald|red|green|blue|gray|slate|zinc)-[0-9]|duration-\[|tracking-\[-|p-1\.5|gap-2\.5|p-7|rounded-md\b|rounded\b" <files>
   ```
   Fix every hit, except `rounded-full`, `rounded-lg` and the like. Every number, account number, reference and
   amount carries `.tabular`. Icons are Lucide at `size` 15 to 18 with `strokeWidth` 1.7 to 1.9 (navigation
   chevrons may be 20 to 22), as on `/get-started`.
3. `agents/PRODUCT.md`:
   - §2 roles table: add `Sole proprietor | Business view | The business's only user: initiates and pays, no approval leg | [CONFIRMED v2] §5.1 self-onboarding; [DECIDED 2026-10-20] no approvals`.
   - §6 *Business*: rewrite the "Onboarding and setup" and "Prototype today" bullets to the three journeys
     (`/business/signup`, `/business/signup/sole-proprietor`, `/business/activate`). Drop the online-enrolment
     clause.
   - §7: replace the `[DECIDED 2026-10-19] Corporate Internet Banking Enrolment` bullet with
     `[DECIDED 2026-10-20] Business onboarding follows BRD v2`: the branch captures companies, sole proprietors
     self-onboard with Ghana Card (passport held), invited users confirm their Ghana Card number then set up
     sign-in, and a sole proprietor's payments need no approval. The old flows are deleted.
   - §9 personas table: add `Akosua Darko | u-sole | Sole proprietor, Akosua Darko Enterprises`.
4. `agents/WORKING_LOG.md`, under a `### 2026-10-20` heading in the Inbox (create it if missing). One label each,
   one to three lines:
   - `Override`: online enrolment and new-business application deleted on the designer's instruction, reversing
     the same-day "held until the bank answers" entry. Git has them (pre-change commit `7fad563`).
   - `Decision`: the three journeys, their routes, and that `/activate` is personal-only again.
   - `Decision`: a sole proprietor's payments go straight out after the code (`paysWithoutApproval`). Ask the
     bank to confirm against BRL-04.
   - `Decision`: an invited user confirms their Ghana Card number against the bank's record. A third miss locks
     out to the branch.
   - `Discovery`: business screens were showing every company's accounts (Volta River, Gold Coast). They are now
     scoped to the signed-in business's profile.
   - `Gap`: passport onboarding is on hold for both personal and sole proprietor (BRL-01, FR-RET-07); the
     passport framework is undefined.
   - `Gap`: `/admin/enrolments` still reviews online applications. Workstream 7 turns it into the branch
     officer's capture and submit screen (FR-ADM-05).
   - `Gap`: Inputter, Reviewer and Authoriser appear only on the invitation. Workstream 1 renames Maker and
     Approver across the app.
   - `Question`: what a company brings to the branch, the exact Ghana Card linkage URL, and an RM contact for
     expired invitations. None is in the BRD.
   - `Question`: D-10. Do existing corporate internet-banking users migrate (a business `/migrate`), or are they
     re-invited?
   - Tick or delete the existing `Conflict` line about in-branch corporate onboarding (the one beginning
     "Conflict: **corporate onboarding is in-branch**") and the 2026-10-19 `Conflict` about enrolment, noting
     they are resolved by this change.

**Final check:**
```bash
npx tsc --noEmit
npx eslint . --max-warnings=0
npx tsx scripts/i18n-coverage.mts
```
- `tsc` and `eslint` must be clean.
- The coverage script's gap count must not go up compared with a run before Phase 1. Run it once at the start
  and note the number. Any remaining gaps from these files must be customer data only.

---

## 5. Gap review (standing rule, AGENTS.md step 3)

Walk this list after Phase 6 and state the result of each item in the reply.

- **Every place that leads into business onboarding** points at the new routes:
  - the login business link
  - `/business/signup` tiles
  - the Demo hub
  - `PersonaFlowSwitcher`
  - the expired and locked screens
  - `nav-history`
- **Every persona and state:**
  - sole proprietor: happy path plus 3 outcomes
  - invitee: happy path, mismatch, locked, expired
  - existing Maker, Approver and Admin users still sign in and see only Adinkra's accounts
  - the sole proprietor signs in from the Demo hub and sees only Akosua Darko Enterprises' accounts, no
    Approvals and no Administration, and pays a supplier straight through
- **Honest status:**
  - the `Verified` pill shows only after the selfie step
  - the sole proprietor's paid supplier shows as `pending`, never `awaiting-approval`
  - nothing says "approval" to a sole proprietor
- **Light and dark:** token-only classes, no `dark:` overrides.
- **Things left out on purpose** (list them in the reply): passport, the document checklist, a status tracker,
  a business `/migrate`, and admin branch capture.

## 6. Reply to the designer

Short and plain:
- what changed, by journey
- which checks ran, and that nothing was viewed in a browser
- the gaps and questions from Phase 6
- the one named trade-off: the invitee's extra Ghana Card step
