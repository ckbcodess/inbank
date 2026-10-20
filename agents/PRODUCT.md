# NIBS product context

What the product is, who it's for, and the rules it runs on. Read it to understand a domain without
re-reading the BRD or old chats.

**Labels**
- `[CONFIRMED]`: stated in the BRD or bank documents (cited by ID)
- `[DECIDED]`: a product or design decision made by the team, with its date
- `[ASSUMPTION]`: believed but not confirmed
- `[UNKNOWN]`: not known
- `[CONFLICT]`: the BRD and a team decision (or the prototype) disagree. The decision stands in the prototype
  until the bank confirms; the item is in WORKING_LOG
- `[NOT IN v2]`: something BRD v1 asked for that BRD v2 does not mention. Kept until the bank says otherwise

**Two BRDs.** The IDs tell you which one is cited.
- **BRD v1**: the NIBS BRD, January 2026 (`src/lib/BRD New Internet Banking Solution 10JUL26.docx`).
  IDs: BO-, FR-01 to FR-38, NFR-, ADM-, ASM-. Trade-driven, one login with profile switching.
- **BRD v2**: "Internet Banking Revamp, Phase 1" (GCB/DT/BRD/IB-REVAMP/P1), 59 pages, cover says v0.2 and
  document control says 1.0, a consolidated draft for stakeholder validation dated 2026-09-09. IDs: BR-,
  FR-RET-, FR-COR-, FR-ADM-, FR-SHR-, NFR-, BRL-, SEC-, UAR-, RPT-, INT-, OS-, OI-. **It is the current
  baseline.** Where the two differ, v2 wins and the difference is in WORKING_LOG. v2 says it reduced a prior
  corporate requirements document of about eighty pages to a Phase 1 subset (OS-08, §7.1); `[ASSUMPTION]`
  that document is v1. The v2 PDF is not in the repo.

Open questions live in [WORKING_LOG.md](WORKING_LOG.md), not here.

---

## 1. What NIBS is

- `[CONFIRMED v2]` GCB Bank PLC is replacing its Internet Banking with a purpose-built, responsive,
  device-agnostic web application for Retail and Corporate customers. The bank owns and changes it without
  core-banking vendor dependency (BR-01, BR-02, NFR-26). **Phase 1 go-live is 2026-12-15**, hypercare to
  2026-12-24 (§5.3, Appendix A).
- `[CONFIRMED v2]` Why: the old platform is rigid and tied to core banking; the web channel lags the mobile
  app; cardless withdrawal, statements, receipts, references and name checks are built in silos; and
  service friction (bank-assisted password resets, OTPs that do not arrive) (§2, PP-01 to PP-14). Phase 1 also
  builds a reusable service base for the 2027 mobile app revamp (BR-03, OBJ-02).
- `[CONFIRMED v2]` Retail and Corporate are served by one application base with distinct feature sets,
  authentication models and control frameworks (BR-04, §8.1). Corporate means CBB and WIB customers. A
  narrow companion **Corporate Transaction Approval** mobile app handles approvals away from the desk
  (FR-COR-02, BR-26).
- `[CONFIRMED v1]` NIBS (New Internet Banking Solution) was first described as a standalone platform for
  Retail, SME, Commercial, Corporate and Wholesale & Investment Banking, primarily CBB and WIB (BO-01,
  ASM-01, ASM-03).
- `[NOT IN v2]` v1's main driver was digitising trade banking: Letters of Credit, Open Account, Documentary
  Collections, Advance Payments (BO-04 to BO-06, FR-10 to FR-16). v2 does not mention trade, and OS-08 defers
  unprioritised corporate features. v1 also required keeping the old platform's proven features (BO-15,
  FR-26) and a clearly different interface (ASM-17); v2 restates neither. See WORKING_LOG.
- `[DECIDED]` The Personal view's information architecture brings the **GCB mobile app's retail
  services to the web**: 11 of its 19 nodes come from the mobile app. Keep parity with the app's
  *flow shape*, but re-lay it out for web (decision D2 is still open; see WORKING_LOG).
- **This repo is the design prototype.** v1's roadmap had a vendor build production; v2 says the bank's
  Digital Transformation team builds and releases in-house (BR-01, NFR-26) and validates designs against the
  prototype (§13). Either way this is the UX reference. All data is mocked; nothing calls a real API.

## 2. Who uses it

| Actor | Where | What they need | Source |
|---|---|---|---|
| Retail customer | Personal view | Self-onboarding, balances, statements, transfers, bills, standing orders, cards, FX rates | `[CONFIRMED v2]` FR-RET-01 to FR-RET-50 |
| Joint account holder | Personal view | The same, on a jointly held account | `[DECIDED]` prototype persona |
| Wallet or card onboarder | Personal view | New to GCB, onboarded with MoMo or a card. Their main account is the GCB Wallet | `[DECIDED]` 2026-09-23 |
| Migrating customer | Personal view | Moving from the old internet banking with their payees, standing orders and PIN | `[CONFIRMED v1]` FR-26; `[DECIDED]` the flow |
| Sole proprietor | Business view | The business's only user: initiates and pays, no approval leg | `[CONFIRMED v2]` §5.1 self-onboarding; `[DECIDED 2026-10-20]` no approvals |
| Corporate inputter | Business view | Initiates single and bulk payments and uploads files within an assigned limit. Cannot approve or release. Need not be on the mandate | `[CONFIRMED v2]` §17, BRL-03, FR-COR-04 |
| Corporate reviewer | Business view | Reviews submitted transactions and batches within a limit; approves to the next level or rejects with a comment. Any number of levels. Must be named on the mandate | `[CONFIRMED v2]` FR-COR-05, BRL-03, BRL-07 |
| Corporate authoriser | Business view, approval app | Final authorisation within a limit, from the portal or the approval app. Must be named on the mandate | `[CONFIRMED v2]` FR-COR-06, FR-COR-02, BRL-03 |
| Corporate administrator (customer-side) | Business view | Views, and where the bank permits maintains, user configuration within the mandate | `[CONFIRMED v2]` §17; `[OPEN QUESTION]` scope to be confirmed |
| Corporate group administrator | Business view | Oversees subsidiaries and consolidated reporting for the parent | `[CONFIRMED v2]` §17, FR-COR-13 (Should), RPT-07 |
| System / API principal | API only | An authenticated corporate ERP that submits instructions and retrieves status. Revocable independently of users | `[CONFIRMED v2]` §17, UAR-10, SEC-07 |
| Corporate Maker, Approver, Admin, Viewer (prototype roles) | Business view | Single and bulk payments, approvals, trade, user administration | `[CONFLICT]` v1 FR-06 to FR-18; v2 uses inputter, reviewer, authoriser |
| Bank administrator | Admin portal | Configures companies, subsidiaries, users, roles, mandates, limits, approval workflows and host-to-host. Under maker-checker | `[CONFIRMED v2]` §17, FR-ADM-01 to FR-ADM-07, UAR-06 |
| Branch officer | Branch / admin portal | Captures and submits corporate applications, completes verification | `[CONFIRMED v2]` §17, FR-ADM-05 |
| Operations / support user | Admin portal | Read-only access to transactions, batches and audit for investigation. No initiation or approval | `[CONFIRMED v2]` §17 |
| Risk, compliance and audit users | Admin portal, reports | Read-only access to audit trails, exception and access reports. Tamper-evident audit | `[CONFIRMED v2]` §17, SEC-11 |
| Bank Admin, Operations User, Trade Officer (prototype admin roles) | Admin portal | Customers, users, roles, limits, approval rules, monitoring, exceptions, audit, fee concessions | `[CONFIRMED v1]` ADM-1 to ADM-18; `[NOT IN v2]` Trade Officer |

## 3. Segmentation and shells

- `[DECIDED 2026-08-26, D1]` **Personal and Business are two separate views, and the customer chooses
  one before signing in.** Each has its own door and its own sign-in. There is no in-session switch;
  a customer with both relationships signs out and back in through the other door.
  - The header always names the current view.
  - The wrong-door state names the right door and links straight to it. Never show "invalid credentials".
  - Signing out remembers which door was used.
  - Named trade-off: a sole trader pays a daily sign-out tax. This fails the "lighter" gate and was
    accepted deliberately. Watch for that segment dropping one of the two views.
- `[CONFIRMED v2]` **v2 matches D1.** It drops profile switching and one login (v1 FR-01, FR-02, BO-03, ASM-04
  asked for them) and says Retail and Corporate have distinct authentication models (BR-04), with a Web
  and a Mobile authentication model for corporate (§5.1). The old BRD conflict is closed. What stays open:
  whether existing corporate users keep their login credentials (D-10, R-05).
- `[CONFIRMED]` Internal staff use a **separate, firewalled admin portal**. A staff member who is also a
  customer has two separate identities (screen spec §12.1; v1 ADM-2, ADM-16, NFR-03). v2 keeps bank
  administration separate and read-only for operations and support (§17).
- Prototype state:
  - Personas are single-view, except Samuel Quartey, who switches between his personal and joint
    profiles.
  - The split is done at the surface level: business banking lives under `/business` with its own
    navigation (`lib/corporate/navigation.ts`), home (`/business/overview`) and data (`lib/corporate/`).
    A business sign-in lands on `/business/overview`; a personal one on `/overview`. A signed-in customer
    is held to their own relationship's surface.
  - The two apps are fully separate: a business relationship never rests on a personal URL, Back never
    crosses apps, and business code cannot write a personal path (lint). Business has screens for Accounts,
    Send & Pay, Transactions, Trade, Approvals and Administration; the rest of the personal app has no
    business version yet. See WORKING_LOG.

## 4. Information architecture

**Personal view**, as it stands in `navigation.ts`:
- Primary: Home (`/overview`), Accounts, Cards
- Move money: Send & Pay (`/payments`), Insure, Invest, Loans
- More services: Transactions, Beneficiaries, FX rates, Locate us, Settings, Lifestyle

**The agreed retail IA** (`DESIGN-TIMELINE.md`) is 7 hubs, 19 nodes and roughly 60 products:

| Hub | Nodes |
|---|---|
| Dashboard | Overview |
| Accounts | My Accounts, Card Center |
| Send & Pay | Send Money, Pay Bills, Standing Orders, Beneficiaries |
| Invest | Portfolio (CSD), Treasury Bills, Fixed Income, Early Liquidation |
| Insure | Get a Quote, Buy a Policy, Policy Management, Beneficiary Center |
| Loans | Apply for Loan, Servicing |
| Settings | User Profile, Value-Adds (Referral and Rewards) |

- Phase 1 readiness (2026-09-15): 25 features built.
- Invest, Loans and Lifestyle are placeholders for the next milestone.
- `[CONFLICT v2]` Treasury Bills in Invest and Insure (not in v2's retail scope), and Fixed Income if it means
  treasury securities. Term deposits and in-house investment products stay (OS-05, FR-RET-43, FR-RET-44).

**Send & Pay rails** (one state machine, `PaymentFlow`):

- **Send**
  - To Bank: own accounts, another GCB account, other local banks via ACH or instant
  - To Wallet: MTN MoMo, Telecel Cash, AT Money and GCB Wallet
  - Wallet to Bank
  - Proxy Pay: to a phone number or Ghana Card alias
  - Group transfer
  - PAPSS: Nigeria, Kenya, South Africa, Côte d'Ivoire, Egypt, Rwanda and Zambia
  - Outside Ghana: the SWIFT rail. Every country; the code type is Swift, Sort code or IBAN; charges are
    SHA, OUR or BEN `[CONFLICT v2]` (OS-01, BRL-25: SWIFT is not permitted in Phase 1)
  - Cardless withdrawal
  - Scan & Pay (QR)
- **Pay**
  - GCB Pay: utilities, subscriptions and Pay TV, education, Ghana.gov
  - ECG prepaid
  - Airtime
  - Internet (data bundles)
  - Prepaid card top-up
- **Scheduled:** standing orders
- `[CONFIRMED v2]` Retail rails in v2 are GIP, ACH, NRT and Express with rail selection (FR-RET-21). Express is
  not in the prototype.

**Business view** (screen spec §12.4, without the profile switcher), as it stands in
`lib/corporate/navigation.ts`:
- Home (`/business/overview`): total available cash, what is waiting for the person's approval
  (approvers only), the company's accounts, and the two payment doors (Send a Payment, Pay in Bulk)
- Accounts (`/business/accounts`): the company's accounts with balances; details show the available balance,
  recent activity, the mandate explained in place, signatories and the bank contact; statement
- Send & Pay (`/business/payments`): Pay a Supplier, Pay in Bulk, Standing Orders
  - **Pay a Supplier:** a maker picks the account and supplier (the name is looked up from the account number),
    enters the amount and an invoice reference, reviews, and confirms with a one-time code. The payment is
    **submitted for approval**: it shows in the approvers' queue and on the ledger as "awaiting approval", and
    nothing leaves the account until an approver decides. `[DECIDED 2026-10-20]` v2 keeps single transfers
    beside bulk (FR-COR-25).
  - Standing orders (list, new, detail with pause and cancel) and bulk payments sit under the same hub.
    `[CONFLICT v2]` v2's corporate scope has scheduling (FR-COR-31), not standing orders. Bulk is still the
    original stub; v2 needs mixed-rail bulk (§7, §8).
- Transactions (`/business/transactions`): the company's ledger; the receipt also carries the failures only a
  company has (a record that failed in a batch, a trade returned by operations)
- Trade (`/business/trade`), if the customer is eligible `[NOT IN v2]`
- Approvals (`/business/approvals`), for approvers: an approver's decision settles the same transaction
- Administration (`/business/administration`), for corporate admins `[CONFLICT v2]` (setup is the bank's, BRL-05)

**Admin portal:** Overview, Transactions, Exceptions, Trade, Customers, Fee concessions, Audit log.
`[CONFIRMED v2]` v2's bank-side capability is corporate setup (FR-ADM-01 to FR-ADM-10) and the reports in RPT-08
to RPT-17; Trade monitoring is `[NOT IN v2]`.

## 5. Entities and terminology

| Term | Meaning |
|---|---|
| **Account** | Where money lives: a GCB current, savings or joint account. Status is active or dormant. One account is the **default**. |
| **Source of funds** (shown as "Sources of Funds" or "Linked Wallets & Cards") | A way money gets *in*: a linked MoMo wallet or an external card. It never shows a balance and never counts in totals. |
| **GCB Wallet** | A bank-controlled wallet. For GCB account holders it is hidden plumbing (an auto-sweep pass-through). Only MoMo or card onboarders see it, as their main account. |
| **Add Account** | Brings on an account the customer *already holds* under their Ghana Card (confirm → selfie → pick → done). It does not open a new account. |
| **Rail** | A payment type inside `PaymentFlow` (bank, wallet, proxy, papss, swift and so on). |
| **GIP, ACH, NRT, Express** | GhIPSS rails. GIP is instant. ACH is batch. NRT is near real-time. Express has a daily cut-off, understood to be 13:00 (BRL-13). |
| **Beneficiary / payee** | A saved recipient. `/beneficiaries` has tabs for People (bank, MoMo, proxy), Billers and Groups. v2: validated through the name query service before it is saved (BRL-17). |
| **Payment group** | A saved set of several recipients, such as a susu circle or a family pool. v2: members can mix bank, wallet and biller instruments, with an amount each; the total is computed and confirmed (BRL-19, BRL-20). |
| **Proxy ID** | A phone number or Ghana Card alias linked to an account. Customers can create, update and deregister their own. |
| **Standing order** | A recurring or one-off scheduled instruction. Its **Short name** is the main label. Frequencies: Once, Daily, Weekly, Every X days, Monthly, Quarterly, Half Yearly, Yearly. It has an optional narration. |
| **Transaction PIN** | A 4-digit PIN. It authorises payments. `[CONFLICT]` CONSTITUTION §2 says payments are authorised with a one-time code, with no transaction PIN. |
| **One-time code (OTP)** | A 6-digit SMS code used for new-device sign-in, onboarding, and as the alternative way to authorise a payment. There is a USSD shortcode fallback. v2 delivers OTPs through a dedicated Internet Banking short code (BR-32, SEC-03). |
| **Ghana Card** | The national ID. Onboarding and recovery match a selfie against it (the NIA service). v2 adds passport for diaspora (BRL-01). |
| **Card types** | **Debit** cards spend from a linked account and have no balance of their own. **Prepaid** and **virtual** cards hold a balance. Cards are **blocked or unblocked** (never "frozen"). |
| **My Spends** | The spending breakdown for one account, by category or by transaction type. v2 adds business spend analysis, comparable in concept (BR-38, FR-COR-45). |
| **Place a request** | Statement (free, emailed), cheque book, or bank letter, raised from Account Details. |
| **GCB Pay** | The bills and merchants category hub. v2 also means the GCB closed-loop QR (INT-17). |
| **PAPSS** | The Pan-African Payment and Settlement System. v2: only for supported markets and currencies, after compliance screening (BRL-26). |
| **Needs attention** | A dashboard band that only appears when real items need action: failed payments, expiring or blocked cards, dormant accounts, bills due. |
| **Mandate** | The customer's approved account mandate held by the bank. Corporate rights trace to it: reviewers and authorisers must be named on it, inputters need not (BR-10, BRL-03, BRL-05). |
| **Inputter, reviewer, authoriser** | The v2 corporate roles: initiate, review through any number of levels, finally authorise. Segregation of duties: nobody both initiates and finally authorises the same transaction (BRL-04, UAR-03). Replaces maker, checker and approver. |
| **Approval matrix** | The configured approval rules by mandate, transaction type, amount or account (FR-ADM-04). |
| **Batch / Batch ID** | A bulk file, or an ERP submission treated as one. It has a unique batch ID, per-line payment type and per-line status (§14, FR-COR-39). |
| **Host-to-host (H2H)** | Direct system-to-system API integration between a corporate ERP and the bank, in XML or JSON. API only, no VPN or file drop, never released straight through (BRL-32 to BRL-34). |
| **OBVAM** | A digital wallet supported for payment and bulk payment. Name and interface to be confirmed (OI-07). |
| **Cardless token** | A single-use, value-bound, time-bound code for an ATM cash withdrawal without a card, issued by a central service (BRL-27, BRL-28, SEC-17). |
| **Name query service** | The bank's own service that stores verified beneficiary names and serves repeat lookups (FR-SHR-05). |
| **Standard transaction reference** | A reference holding channel, date, time and a uniqueness part, so support can see the source at a glance (FR-SHR-04, BRL-16). |
| **Concession pricing** | Pricing set against a user by transaction type, for retail and corporate (§5.1). |
| **Dev Mode / Demo hub / persona** | Prototype scaffolding: switch states and layouts, jump to an onboarding step, change customer. |

**Formats:**
- Money is always `GHS 1,234.56`, in every language.
- Ghana mobile numbers have a fixed `+233` prefix and 9 digits, typed as `24 123 4567`. The stored local
  form is `0241234567`.

## 6. Major journeys

- **New to GCB** (`/signup`), 7 steps: Ghana Card → selfie → review details (title, email, mobile) →
  code → password → set PIN → confirm PIN → dashboard.
  - A post-onboarding card follows: account ready → fund → save wallet → referral → tips.
  - The new customer gets a virtual account and funds it afterwards.
  - `[CONFIRMED v2]` v2's retail onboarding asks for Ghana Card or passport, matches an existing account
    record, and on failure sends the customer to the Ghana Card linkage page on the GCB website (§13).
- **GCB account holder activating** (`/activate`): a Ghana Card match against existing accounts, then
  code, password and PIN. There is no funding step.
- **Migrating from the old internet banking** (`/migrate`): welcome → confirm code → "your details came
  with you" → new password → finish. Accounts, payees, standing orders and the PIN carry over; only the
  password is new.
- **Signing in:**
  - The full form is mobile number + password, then a code on a new device.
  - On a trusted device, a returning customer is greeted by name and enters their password. No one-time code.
  - Forgot password: mobile → selfie → new password. After 3 selfie misses, the customer is sent to a
    branch. `[CONFIRMED v2]` v2 lets the bank choose the method: Ghana Card verification, security question,
    or OTP with PIN (OI-01 is open), with a lockout rule and in-branch recovery after repeated failure.
- **Send & Pay:** hub → chooser (a question) → progressive form → review → authorise → receipt, with
  an option to save the beneficiary. Dashboard pickers deep-link into the flow with the choice already
  made (`?rail=`, `?category=`, `?from=`).
- **Retail group transfer** `[CONFIRMED v2]` (§13): create or select a group of mixed beneficiaries with an
  amount each → each is validated through the name query service → the total, per-member breakdown and charges
  are shown for confirmation → balance and limits checked → the customer authenticates → each member payment
  routes to its rail with its own charge. A failed member is reported alone and offered a retry; the group is
  not failed as a whole.
- **Standing orders:** list (Coming up, Paused) → detail (Pause, Cancel) → create (recipient →
  amount → details → frequency → review → authorise).
- **Accounts:**
  - The list shows no balances.
  - Account Details: balance card, Top up, Share details, My Spends, last 10 transactions, standing
    orders, Place a request, Set as default.
  - Linking a source: MoMo needs approval on the phone; a card goes through a 3-D Secure stand-in
    at `/card-verification`.
- **Cards:**
  - The list shows no balances.
  - Details: a Card details sheet (number, expiry, CVV, tap to copy), Show PIN, Block, daily limit, edit, reset PIN, replace, track
    delivery, activity. A balance shows for prepaid and virtual cards only.
  - Requesting a card.
- **Business** `[CONFIRMED v2]` (§13):
  - **Portal bulk payment:** an inputter uploads a file or enters lines on screen → the platform validates
    structure, mandatory fields, beneficiaries, each line's payment type and duplicates → invalid lines come
    back in a downloadable error report for correction and resubmission → the inputter's and the corporate's
    limits are checked → the batch goes to the first review level → reviewers comment and approve through
    every level → an authoriser approves within their limit, in the portal or the approval app → a rejection
    at any level returns the batch to the inputter with the comment → balance and daily limit are checked at
    release → each line routes to its rail with its own status → batch and line status reach dashboards,
    reports and the ERP status interface.
  - **ERP host-to-host:** bank-side setup activates H2H and issues API documentation and credentials → the
    ERP calls the API in XML or JSON → the platform authenticates, validates, and rejects a malformed or
    unauthorised call with a structured error → it creates a batch with a batch ID → the batch follows the
    same review and authorisation as an uploaded file → an authoriser releases it → the platform returns batch
    and line status for reconciliation. There is no straight-through release.
  - **Scheduled payment:** approved in advance and held; at execution the platform checks funds and releases
    it, subject to cut-off. An unapproved scheduled payment never runs (BRL-11, BRL-12).
  - **Cardless disbursement:** single token or CSV batch; a corporate batch completes review and
    authorisation first; the token goes to the recipient and is redeemed once at a GCB ATM; unredeemed tokens
    expire (BRL-27, BRL-28; what happens to the funds is OI-10).
  - **Corporate password reset:** the bank-approved method (OI-01), a lockout rule, then in-branch recovery.
  - **Onboarding and setup:**
    - Companies apply online at `/business/signup/enrol` `[DECIDED 2026-10-20]`, following the bank's real process
      (Esther, 2026-10-16): account number → a signatory proves it with a code to their number on file → users and roles
      (signatories pre-filled from the mandate) → review → we write the request letter, they sign it on letterhead and
      upload it, or email, post or bring it in. Staff check signatures against Flexcube, call, then approve at
      `/admin/enrolments`; letters that arrive outside the app are recorded there, so branch capture (FR-ADM-05) and online
      share one queue. Status at `/business/signup/status`. On approval each user activates at `/business/activate`
      (Ghana Card number match, OTP, password, PIN; 3 mismatches lock out to branch).
    - Sole proprietors self-onboard online at `/business/signup/sole-proprietor` (Ghana Card verification, liveness
      selfie, account discovery, OTP, password, PIN) and land directly on `/business/overview`.
  - **Prototype today:** sole proprietor payments send directly without an approval leg (`paysWithoutApproval`);
    company payments submit for approval; approvals and administration as built before v2; bulk is the original stub;
    online account opening is deleted (out of Phase 1); trade initiation and lifecycle
    tracking `[NOT IN v2]`; user administration is Profile → Roles & Services → Limits → Approval matrices → Review `[CONFLICT v2]`.
- **Admin portal:** transaction monitoring and exceptions, trade monitoring, customers, fee
  concessions, audit log.

## 7. Business rules

**Confirmed (BRD v2, the current baseline)**

*Access and identity*
- A retail customer self-onboards only where identity verifies against Ghana Card (resident) or passport
  (diaspora) (BRL-01).
- Password reset is done by the customer without bank intervention. The method is one of Ghana Card
  verification, security question, or OTP with PIN, as finally decided with the control functions (BRL-02,
  SEC-04, OI-01). Repeated failure locks out and sends the user in-branch (SEC-05, §13).
- Corporate reviewers and authorisers must be named on the account mandate; inputters need not be (BRL-03). A
  user may hold more than one role only if segregation of duties holds (BRL-04). Rights come from bank
  administrators at setup and change only through an authorised change to the mandate or setup (BRL-05).
- MFA applies at login and on financial transactions (SEC-02). OTPs go through the dedicated Internet Banking
  short code and are single-use, time-limited and bound to the transaction (SEC-03, BR-32).

*Transactions, limits and approvals*
- A transaction starts only within the initiator's limit; a reviewer or authoriser acts only within theirs
  (BRL-06, BRL-07). A corporate daily limit at entity and account level caps what is released in a day,
  whatever the user limits (BRL-08). Limits apply at user, role, account, channel and transaction type and are
  configurable without code change (FR-COR-08, FR-COR-09, BR-22, UAR-04).
- A transaction reaches the payment rail only after every configured review and authorisation level has
  approved (BRL-09). A rejection at any level returns it to the initiator with the rejecting user's comment
  (BRL-10).
- Balance must cover the amount at release. For scheduled payments the check runs at execution, not at
  approval (BRL-11). A scheduled payment must be fully approved before it runs (BRL-12).
- GhIPSS Express has a daily cut-off, understood to be 13:00. Later instructions follow the rule in OI-08
  (BRL-13).
- Charges and commissions apply per underlying transaction, also inside a group or bulk instruction, and show
  on the statement (BRL-14). Rates change without code (BRL-15, BR-20, FR-SHR-10). Charges are shown before
  confirmation (SEC-24).
- Every Internet Banking transaction gets a reference with channel, date, time and a uniqueness part
  (BRL-16, FR-SHR-04).

*Beneficiaries, payments and currency*
- A beneficiary is validated through the name query service before it can be saved (BRL-17). A verified name is
  reused rather than looked up again (BRL-18). Groups can mix instrument types (BRL-19).
- A corporate bulk file may mix payment types. Each line routes to the rail given for that line and reports its
  own status (BRL-21). Bulk files are validated for structure, encoding, duplicates, line payment type and
  total value, with a downloadable error report (§14).
- Corporate foreign-currency transfer in Phase 1 is only between the company's own FX and local accounts, at
  the rate the bank sets at the time (BRL-22, BRL-23). Retail FX rates are indicative for the business day
  (BRL-24).
- SWIFT outward transfers are not permitted in Phase 1 (BRL-25). PAPSS is allowed only for supported markets and
  currencies, after compliance screening (BRL-26, SEC-18).

*Cards, cardless and integration*
- A cardless token is valid only for its period and value, can be redeemed once, and is recorded centrally with
  its source (BRL-27, BRL-28). It carries the configured charge (BRL-29).
- Virtual cards issue instantly, and details go only to the designated recipients (BRL-30). Card services need
  an eligible account (BRL-31).
- A host-to-host instruction is an initiation only and completes the full workflow (BRL-32). H2H is API-only,
  with no VPN or file drop (BRL-33), and is activated only if chosen at bank-side setup (BRL-34).

*Controls and audit*
- Access is role-based and checked server-side, with corporate role assignment validated against the mandate
  (UAR-01, UAR-02, SEC-06). Segregation of duties is enforced by the system (UAR-03). Account visibility is per
  user (UAR-05). Bank administrator functions are themselves under maker-checker (UAR-06). Provisioning is
  logged, there is a periodic access review report, and dormant users are identified (UAR-07 to UAR-09). The
  approval app enforces the same roles, limits and mandate rules as the portal (UAR-11).
- Duplicate submission of a file or instruction is detected and blocked (SEC-19). A downstream failure never
  causes a partial or duplicated posting, and a reconciliation position is available (SEC-20, NFR-13). Core
  banking stays the source of truth for balances (§14).
- The audit trail is tamper-evident and records actor, action, before and after values and timestamp
  (SEC-11, NFR-22). Retention is not set (NFR-23, OI-11).
- The customer is notified on beneficiary, limit, credential and device changes (SEC-16). Fraud monitoring can
  hold, flag or block (SEC-14, SEC-15). Cross-border payments are sanctions and AML screened (SEC-18).
- Personal data follows the Data Protection Act, 2012 (Act 843) (SEC-08). Card numbers are masked everywhere
  (SEC-10).

**Carried from BRD v1 and not restated in v2** (`[NOT IN v2]`, kept unless the bank says otherwise)
- Rejected Documentary Collections can be amended and resubmitted with version history (FR-13), and trade
  status shows a timestamp for every stage (FR-16). Trade is not in v2.
- Contextual guidance during journeys (FR-27) and in-product feedback (FR-29).
- A failed transaction shows its reason (FR-32). v2 asks only for reason codes in operational reports
  (RPT-12).
- Statements cover a chosen range of up to one year (FR-04, FR-38). v2 says any customer-selected range, PDF by
  default with Excel as the alternative (FR-RET-10), and does not restate the cap.
- MFA for profile switching (FR-03). There is no switching in v2.
- Corporate administrators create, suspend and deactivate users, assign roles, services and limits, and reset
  their users' passwords (FR-17, FR-18, FR-35, FR-36). `[CONFLICT]` v2 gives setup to bank administrators
  (BRL-05, FR-ADM-01, FR-ADM-02, FR-ADM-07).
- Audit logs kept "at least five days" (FR-21). v2 leaves retention open.
- Defining prices and tariffs is out of scope (v1 §Scope). `[CONFLICT]` v2 makes charges, commissions and
  concession pricing configurable (BR-20, FR-SHR-10). The prices themselves stay the bank's (D-12).

**Carried from BRD v1 and still true in v2**
- Customers are notified on submission, approval, rejection and status change (v1 FR-22; v2 FR-SHR-08,
  SEC-16). v2 adds WhatsApp and push by preference (Should).
- The bank's published daily FX rates are visible (v1 FR-30; v2 FR-RET-13).
- Customers can fund prepaid cards from linked accounts and block or unblock cards (v1 FR-33, FR-34; v2
  FR-RET-39, FR-RET-40).
- Fee concessions are applied automatically (v1 FR-37); v2 phrases it as concession pricing set per user and
  transaction type.
- Duplicate transactions are detected and blocked (v1 NFR-19; v2 SEC-19).
- Admin and support access to a customer is read-only and can never execute a transaction (v1 ADM-2, ADM-16;
  v2 §17).

**Decided by the team** (the rules themselves are in CONSTITUTION.md §2)
- `[DECIDED 2026-08-26, D4]` **One Send Money hub and one payment state machine.**
  - `/payments/new` and the orphaned `UniversalTransferSheet` were deleted.
  - Fees and arrival times come from one table, `RAIL_FACTS`.
  - Deep links survive: `?source=`, `?duplicate=`, `?rail=`.
- `[DECIDED 2026-08-26]` Every payment is authorised. Pausing or cancelling never is.
- `[DECIDED 2026-09-23]` **Accounts and sources of funds are separate model objects.**
  - The "hop" rule: money from outside must land in a bank wallet first. For GCB holders that wallet
    is a hidden pass-through that sweeps automatically. A delay reads "on its way to GCB Savings",
    never as a wallet balance.
  - A wallet onboarder who adds a GCB account sees an explicit "your wallet balance moves" step. That
    account becomes their default, and the wallet becomes hidden plumbing.
  - No GCB account under their Ghana Card means they're sent to a branch.
  - The dashboard shows the selected or default account's balance with a switcher. Totals never
    include sources.
- `[DECIDED 2026-09-24]` **Balances appear only on Account Details and on prepaid or virtual card
  details.** The Accounts and Cards lists show none. A debit card has no balance of its own.
- `[DECIDED 2026-09-24]` **Spending insights count money out only.** Transfers between the customer's
  own accounts carry no category and never count as spend. Spending is measured per account (My
  Spends); there is no global "all accounts" spending hub.
- `[DECIDED 2026-10-03]` **Sign-in is mobile number + password** for everyone (personal, business and
  staff). This conflicts with v1 ASM-06; see WORKING_LOG. v2 does not name the credential, and asks whether
  existing corporate credentials continue (D-10).
- `[DECIDED 2026-10-01]` Passwords need at least 8 characters with upper, lower, number and symbol
  (`PASSWORD_RULES`, shared by sign-up, activation and reset). It was 12; see WORKING_LOG.
- `[DECIDED 2026-09-24]` Statements are free and emailed only. Cheque books and bank letters carry fees
  (the amounts are placeholders).
- `[DECIDED]` Referral codes are branch codes, and the branch name shows before *Apply*. Referral is
  offered once, after onboarding, and never gates sign-up.
- `[DECIDED 2026-08-26]` PAPSS replaced the generic international wire in Send Money. SWIFT came back
  on 2026-10-01 as **Outside Ghana**. If a country is PAPSS-eligible, the customer is offered PAPSS.
  `[CONFLICT v2]` OS-01 and BRL-25 exclude SWIFT from Phase 1.
- `[DECIDED 2026-10-08]` **Invest rails separation (Term Deposits vs Treasury).** Term Deposits are
  direct bank fixed deposits (no CSD securities account required, instant creation). Treasury Bills &
  Bonds are government securities held at the CSD and require an active securities account (7-day setup).
  `[CONFLICT v2]` OS-05 excludes a standalone treasury bill service; term deposits stay.
- `[DECIDED 2026-10-20]` **Business onboarding.** Companies apply online with a letter we write; sole proprietors self-onboard.
  - Companies: the online application above replaces "set up at your branch" (designer, after the Esther call). It
    deviates from a strict reading of FR-ADM-05 (branch capture) but feeds the same bank review; the bank still checks
    signatures and approves everything. Branch staff record letters that arrive by email, post or at the counter.
  - Roles on the application: Inputter, Authoriser, Viewer (the bank's form says Initiator, Authorizer, Viewer). Only
    mandate signatories can be Authorisers (BRL-03); an application needs at least one Inputter and one Authoriser.
  - Users added by the applicant give a Ghana Card number, because activation matches it; signatories' come from Flexcube.
  - Invited users activate at `/business/activate` by confirming that Ghana Card number, an OTP, password and PIN.
  - Sole proprietors self-onboard at `/business/signup/sole-proprietor` (Ghana Card, liveness selfie, account discovery
    without balances, OTP, password, PIN) and land on `/business/overview`. Passport is held (BRL-01).
  - Sole proprietor payments need no approval leg (`paysWithoutApproval`) and leave after the OTP.
  - Online account opening is removed. `/activate` is personal activation only.
- `[DECIDED 2026-10-20]` **A business payment is submitted, not sent.** A maker confirms with a one-time code;
  it lands in the approvers' queue and on the ledger as awaiting approval; an approver's decision settles it.
  Recent suppliers come from the ledger; there is no saved-suppliers list yet.

## 8. Scope

**In scope, BRD v2 Phase 1** `[CONFIRMED v2]` (Must unless marked S for Should or C for Could)

*Retail (FR-RET-01 to FR-RET-50)*
- Self-onboarding with Ghana Card or passport; password reset; credential and session management; profile with
  a personal QR; notification preferences across SMS, email, WhatsApp and push (S); transaction OTP through the
  dedicated short code.
- Accounts with available and ledger balances; statements through the central service (PDF by default,
  Excel); one standard receipt; indicative FX rates; loans and advances through the existing loan system,
  defaulting to salary advance; branch, ATM and service-point locator; bank letters; cheque books.
- Transfers: own and third-party GCB accounts; GIP, ACH, NRT and Express; bank-to-wallet (MTN, Telecel,
  AirtelTigo, G-Money, OBVAM) and wallet-to-bank; mobile money; beneficiary groups of mixed instruments and
  group transfer; retail bulk by CSV; Proxy Pay; Scan and Pay (GhQR and GCB Pay) and QR peer-to-peer (S);
  standing orders; PAPSS; beneficiaries with name validation.
- Purchases: airtime, data, ECG prepaid, bills.
- Cards and cash: virtual cards, prepaid top-up, debit card management (S), cardless tokens singly or by CSV.
- Investments: term deposits and in-house investment products.
- Insight and engagement: My Spends with graphs, savings suggestions (S), save-on-transaction (C); Lifestyle
  merchant feed (S) with merchant-side QR payment (S); Phase 1 spend analysis.

*Corporate (FR-COR-01 to FR-COR-45)*
- Secure responsive web access; the approval mobile app; self-service password reset.
- Multiple inputters, reviewers (no fixed upper level) and authorisers; segregation of duties; limits by user,
  role, account, channel and type, and daily limits at entity and account level.
- Account balances with per-user visibility; multiple local-currency accounts; foreign-currency accounts with
  own-FX to local transfers at the bank's rate; multi-company and subsidiary structures (S); approved logo and
  colour customisation from a bank palette (C).
- Bulk payments by upload or on-screen entry over MoMo (MTN, Telecel, AirtelTigo), ACH, NRT, Express, GCB
  account, GIP, GhanaPay wallet and OBVAM, mixed in one file with per-line routing and status; single
  transfers retained; Ghana.gov; SSNIT; PAPSS outward; beneficiaries and groups under maker-checker;
  scheduling.
- Cardless tokens (single or CSV, delivered to recipients); virtual cards (create, top up singly or in bulk,
  details delivered to designated recipients); PDF statements.
- Host-to-host API (XML and JSON, batch ID, status return, documentation, bank-side support); business spend
  analysis; dashboards and reporting; concession pricing.

*Bank corporate setup (FR-ADM-01 to FR-ADM-10)*
- Mandate-based user setup; validating reviewers and authorisers against the mandate; companies and
  subsidiaries; maker-checker and multi-level workflows by mandate, type, amount or account; in-branch
  application handling; host-to-host setup; limits at corporate, account, role and user level;
  administrative reports; usage dashboards (S); a full administrative audit trail with before and after values.

*Shared services (FR-SHR-01 to FR-SHR-11)*
- One responsive application; a central statement service; one receipt standard across Internet Banking,
  mobile and USSD; the standard transaction reference; a bank-maintained name query service; a central cardless
  service exposed to MNOs and fintechs through the API marketplace; WhatsApp and push notifications (S); the
  dedicated OTP short code; configurable charges; language options (see §10).

**Out of scope or deferred** `[CONFIRMED v2]` (§5.2, Appendix D)
- OS-01 SWIFT and outward international transfers, including diaspora transfers abroad (Phase 2).
- OS-02 Corporate foreign-currency transfer to a third party's foreign-currency account.
- OS-03 Credit card statement and repayment.
- OS-04 AI-driven Lifestyle and merchant recommendations.
- OS-05 Standalone treasury bill investment service.
- OS-06 The mobile application revamp (from 2027).
- OS-07 VPN or file-drop host-to-host.
- OS-08 Corporate features of the prior requirements document that were not prioritised.
- BR-40 Viewing balances held at other banks (Won't, backlog).
- Also candidates for later: card management for customers without Internet Banking, extending the standard
  reference to USSD and mobile, savings recommendations from savings patterns.

**Timeline** `[CONFIRMED v2]` (§5.3, Appendix A, §23)
- Planning 1 Sep to 24 Dec 2026. Development 14 Sep to 10 Nov (five sprints: foundation, retail, corporate
  core, corporate payments, advanced and integration). SIT 2 to 20 Nov. UAT 23 Nov to 4 Dec. Go-live 15 Dec.
  Hypercare to 24 Dec.
- Go-live rule: no go-live without formal UAT acceptance, no open Sev-1 defect, critical Sev-2 defects
  resolved or accepted, and Steering Committee approval.

**BRD v1 scope** `[CONFIRMED v1]`, superseded in part by v2
- In scope: customer access and profiles; user onboarding and lifecycle; corporate self-service user
  management; the admin portal; retail account enquiry, payments and alerts; corporate payments, file uploads
  and reporting; trade initiation and tracking; security, approvals and audit; integration with core
  banking, trade, payments, PAPSS and NIA; continuity of legacy features.
- Out of scope: credit origination and underwriting; changes to core banking; branch, paper or manual
  processing; pricing and tariffs; non-banking services (marketplaces, lifestyle); AI advisory and advanced
  analytics; retail product redesign; external regulatory change.
- Where v2 differs: pricing and tariffs (configurable charges are now in scope), non-banking services (a
  Lifestyle merchant feed is Should), analytics (spend analysis is in, AI recommendations are out), and trade
  and legacy continuity (no longer mentioned). Profile switching and customer-side user management are gone
  or reduced (§2, §3).

The Loans, Lifestyle, Cardless and QR scope conflicts are listed in WORKING_LOG.

## 9. Demo personas and conventions (prototype only)

| Persona | Id | Who |
|---|---|---|
| Ransford Gyasi | `u-retail` | Main retail customer, several accounts (`024 412 3821`) |
| Samuel Quartey | `u-clean` / `u-joint` | Clean zero-setup persona (`u-clean`), plus joint account with Esther Appiah (`u-joint`) |
| Ishmael Gyan | `u-single` | Single-account retail customer (1 account, 1 card, 2 payees) |
| Elias Ayettey | `u-joint-either` | Retail joint account holder (either-to-sign) |
| Abena Osei | `u-abena` | Mobile app user |
| Kofi Mensah | `u-kofi` | COOS persona |
| Yaw Oppong | `u-yaw` | Retail customer on a new device |
| Justice Oduro | `u-legacy` | Migrating from the old internet banking |
| Akosua Darko | `u-sole` | Sole proprietor, Akosua Darko Enterprises |
| Kwame Boateng | `u-dual` | Corporate maker (v2: inputter), Adinkra Textiles (the id is a leftover name) |
| Esther Appiah | `u-approver` | Corporate approver (v2: authoriser), Adinkra Textiles |
| Yaw Oppong (Corporate Admin) | `u-corpadmin` | Corporate admin |
| Nana Addo, Abena Owusu, Kofi Asante | `u-tradeofficer`, `u-ops`, `u-bankadmin` | Admin portal: trade officer, operations, bank admin |

- v2 has no reviewer persona yet. One is needed when the control model is built.
- Dev Mode customers on `/accounts` come from `src/lib/accounts-scenarios.ts`.
- Demo triggers:
  - `000000` is always a wrong code.
  - `0000` is always a wrong PIN.
  - A mobile number ending in `0000` always fails the selfie match.
- Older files (`prototype/`, `.design/`, root HTML) still use pre-2026-10-01 names: Ama Serwaa,
  Kwame Mensah, Kojo Appiah, Efua Mensah, Esi Quaye.

## 10. Assumptions and unknowns

- `[UNKNOWN]` Real integrations: core banking, NIA (Ghana Card), MoMo networks, GhIPSS, PAPSS, card
  3-D Secure. Every lookup, approval and settlement is simulated. v2 lists 38 integrations (INT-01 to INT-38),
  and says a complete interface inventory is still to be baselined (§15).
- `[ASSUMPTION]` Fees, turnaround times and FX rates for added currencies are **placeholders**.
  Pricing belongs to the bank (v2: the pricing matrix is due by Sprint 4, D-12, R-12).
- `[ASSUMPTION]` Picker option order ("most used first") is a guess until real usage data exists.
- `[ASSUMPTION]` Some backend behaviour is still waiting on answers:
  - the wallet auto-sweep
  - the system-wallet flag
  - KYC tier limits on pass-through wallets
- `[ASSUMPTION]` v1's "five (5) days" audit retention (FR-21) is likely a typo. v2 leaves retention to be
  confirmed (NFR-23, OI-11).
- The FR, ES and ZH translations are first drafts that still need a native-speaker review. `[CONFLICT v2]` v2
  asks for French and Chinese (§5.1, A-10); BR-37 and FR-SHR-11 say English and French; NFR-21 says English.
  Spanish is not requested anywhere. Translated content is to be supplied by the owners (A-10).
- `[OPEN QUESTION]` BRD v2 refers to open items it does not list: OI-01 (password reset method), OI-06 (direct
  G-Money interface), OI-07 (OBVAM naming and interface), OI-08 (Express after cut-off), OI-09 (maximum
  records per bulk file), OI-10 (unredeemed cardless tokens), OI-11 (audit and data retention), OI-13
  (accessibility standard), OI-24 (UAT checklist dates).
- `[UNKNOWN]` v2 leaves targets unset: response times (NFR-01, NFR-02), bulk file size and time (NFR-03),
  peak load (NFR-04), statement time (NFR-05), session timeout (NFR-10), availability (NFR-12), RTO and RPO
  (NFR-16), several KPI baselines (the KPI table).
- `[CONFLICT]` v2 assumes the Milo typeface, or one MarCommX approves (A-09). The constitution uses Open Sans
  only.
- `[ASSUMPTION]` v2 assumes stable platform services at the time sprints need them: statement, name query,
  cardless, Ghana Card and passport verification, the OTP short code, and a direct G-Money interface
  (A-02 to A-06, D-01 to D-07). The corporate spend taxonomy is to be confirmed (A-11).
- `[OPEN QUESTION]` The scope of the customer-side corporate administrator, which corporate branding elements
  MarCommX approves (D-11), and whether existing corporate users keep their credentials (D-10, R-05).

## 11. Source documents

| Document | What it is |
|---|---|
| `GCB Internet Banking Phase1 BRD Final 0.pdf` (BRD v2; not in the repo, provided by the designer 2026-10-20) | The current BRD: Phase 1 scope for Retail, Corporate and Bank Corporate Setup, 40 business requirements, functional requirements by area, 34 business rules, 38 integrations, roles, security, risks, KPIs and the delivery plan. Cover v0.2, a draft for stakeholder validation |
| `src/lib/BRD New Internet Banking Solution 10JUL26.docx` (BRD v1) | The earlier NIBS BRD (January 2026): objectives, scope, FR/NFR/ADM requirements, dependencies, risks, KPIs. Trade-driven. Partly superseded by v2 |
| `src/lib/NIBS-MVP-Screen-Consolidation-v2.docx` | About 30 core surfaces, the IA, the shells, the actor-to-nav matrix, and §13 screen states. It predates D1 and v2 |
| `DESIGN-TIMELINE.md` | Figma delivery plan: frame inventory, decisions D1–D5, the flow chassis, timeline to 2026-12-04 |
| `DESIGN-PLAN.md` | Phased prototype plan from 2026-08-25. It predates D1 and treats retail and corporate as one app |
| `phase-1-features-readiness.html` / `.pdf` | Phase 1 readiness report (2026-09-15) |
| `docs/STATES.md` | Brief for the illustrated empty, success and moment states (27 illustrations) |
| [Wallets as Plumbing proposal](https://claude.ai/artifact/QhozkvpUirRJDAGptLQmsC) | The reasoning behind the accounts-vs-sources model (2026-09-23) |
| Figma | Node ids are cited in the code and log: dashboard hero 1945:5108 and 1951:2350; Send & Pay 498:3460 and 916:36785; Account Details 1896:15266; My Spends 1867:4819; auth card 1587:4700 |
