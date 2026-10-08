# NIBS product context

What the product is, who it's for, and the rules it runs on. Read it to understand a domain without
re-reading the BRD or old chats.

**Labels**
- `[CONFIRMED]`: stated in the BRD or bank documents (cited by ID)
- `[DECIDED]`: a product or design decision made by the team, with its date
- `[ASSUMPTION]`: believed but not confirmed
- `[UNKNOWN]`: not known

Open questions live in [WORKING_LOG.md](WORKING_LOG.md), not here.

---

## 1. What NIBS is

- `[CONFIRMED]` NIBS (New Internet Banking Solution) is **GCB Bank PLC's** new, standalone
  internet-banking platform. It **replaces and re-platforms** the existing one rather than enhancing it
  (BO-01, ASM-01).
- `[CONFIRMED]` One unified platform for Retail, SME, Commercial, Corporate and Wholesale & Investment
  Banking customers (ASM-03). The BRD's primary targets are **CBB** (Commercial Business Banking) and
  **WIB** (Wholesale & Investment Banking).
- `[CONFIRMED]` The BRD's main driver is digitising transaction and trade banking that today depends on
  branch visits. The trade types are Letters of Credit, Open Account, Documentary Collections, Advance
  Payments and PAPSS (BO-04 to BO-06).
- `[CONFIRMED]` It must keep the proven features of the old internet banking (BO-15, FR-26), with a new,
  modern interface clearly different from the old one (ASM-17).
- `[DECIDED]` The Personal view's information architecture brings the **GCB mobile app's retail
  services to the web**: 11 of its 19 nodes come from the mobile app. Keep parity with the app's
  *flow shape*, but re-lay it out for web (decision D2 is still open; see WORKING_LOG).
- **This repo is the design prototype.** The vendor builds production (BRD roadmap, Phase 3). The
  prototype is the UX design work of Phase 2. All data is mocked; nothing calls a real API.

## 2. Who uses it

| Actor | Where | What they need | Source |
|---|---|---|---|
| Retail customer | Personal view | Balances, history, statements, transfers, bills, standing orders, cards, FX rates | `[CONFIRMED]` FR-04, FR-05, FR-30, FR-33, FR-34 |
| Joint account holder | Personal view | The same, on a jointly held account | `[DECIDED]` prototype persona |
| Wallet or card onboarder | Personal view | New to GCB, onboarded with MoMo or a card. Their main account is the GCB Wallet | `[DECIDED]` 2026-09-23 |
| Migrating customer | Personal view | Moving from the old internet banking with their payees, standing orders and PIN | `[CONFIRMED]` FR-26; `[DECIDED]` the flow |
| Corporate Maker, Checker/Approver, Admin, Viewer | Business view | Single and bulk payments, approvals, trade, user administration | `[CONFIRMED]` corporate user management, FR-06 to FR-18 |
| Bank Admin, Operations User, Trade Officer | Admin portal | Customers, users, roles, limits, approval rules, monitoring, exceptions, audit, fee concessions | `[CONFIRMED]` ADM-1 to ADM-18 |
| Compliance and audit users | Admin portal, reports | Immutable, searchable audit trails | `[CONFIRMED]` FR-21, NFR-05, NFR-06 |

## 3. Segmentation and shells

- `[DECIDED 2026-08-26, D1]` **Personal and Business are two separate views, and the customer chooses
  one before signing in.** Each has its own door and its own sign-in. There is no in-session switch;
  a customer with both relationships signs out and back in through the other door.
  - The header always names the current view.
  - The wrong-door state names the right door and links straight to it. Never show "invalid credentials".
  - Signing out remembers which door was used.
  - Named trade-off: a sole trader pays a daily sign-out tax. This fails the "lighter" gate and was
    accepted deliberately. Watch for that segment dropping one of the two views.
- **This conflicts with the BRD.** FR-01, FR-02, BO-03 and ASM-04 ask for one login with profile
  switching inside the session. See the open question in WORKING_LOG.
- `[CONFIRMED]` Internal staff use a **separate, firewalled admin portal**. A staff member who is also a
  customer has two separate identities (screen spec §12.1; ADM-2, ADM-16, NFR-03).
- Prototype state:
  - Personas are single-view, except Samuel Quartey, who switches between his personal and joint
    profiles.
  - `src/lib/navigation.ts` still adds Trade, Approvals and Administration to the customer nav based on
    role, so the D1 split isn't finished. See WORKING_LOG.

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

**Send & Pay rails** (one state machine, `PaymentFlow`):

- **Send**
  - To Bank: own accounts, another GCB account, other local banks via ACH or instant
  - To Wallet: MTN MoMo, Telecel Cash, AT Money and GCB Wallet
  - Wallet to Bank
  - Proxy Pay: to a phone number or Ghana Card alias
  - Group transfer
  - PAPSS: Nigeria, Kenya, South Africa, Côte d'Ivoire, Egypt, Rwanda and Zambia
  - Outside Ghana: the SWIFT rail. Every country; the code type is Swift, Sort code or IBAN; charges are
    SHA, OUR or BEN
  - Cardless withdrawal
  - Scan & Pay (QR)
- **Pay**
  - GCB Pay: utilities, subscriptions and Pay TV, education, Ghana.gov
  - ECG prepaid
  - Airtime
  - Internet (data bundles)
  - Prepaid card top-up
- **Scheduled:** standing orders

**Business view** (screen spec §12.4, without the profile switcher):
- Overview, Accounts, Payments (single and bulk)
- Trade, if the customer is eligible
- Approvals, for approvers
- Administration, for corporate admins

**Admin portal:** Overview, Transactions, Exceptions, Trade, Customers, Fee concessions, Audit log.

## 5. Entities and terminology

| Term | Meaning |
|---|---|
| **Account** | Where money lives: a GCB current, savings or joint account. Status is active or dormant. One account is the **default**. |
| **Source of funds** (shown as "Sources of Funds" or "Linked Wallets & Cards") | A way money gets *in*: a linked MoMo wallet or an external card. It never shows a balance and never counts in totals. |
| **GCB Wallet** | A bank-controlled wallet. For GCB account holders it is hidden plumbing (an auto-sweep pass-through). Only MoMo or card onboarders see it, as their main account. |
| **Add Account** | Brings on an account the customer *already holds* under their Ghana Card (confirm → selfie → pick → done). It does not open a new account. |
| **Rail** | A payment type inside `PaymentFlow` (bank, wallet, proxy, papss, swift and so on). |
| **Beneficiary / payee** | A saved recipient. `/beneficiaries` has tabs for People (bank, MoMo, proxy), Billers and Groups. |
| **Payment group** | A saved set of several recipients, such as a susu circle or a family pool. |
| **Proxy ID** | A phone number or Ghana Card alias linked to an account. Customers can create, update and deregister their own. |
| **Standing order** | A recurring or one-off scheduled instruction. Its **Short name** is the main label. Frequencies: Once, Daily, Weekly, Every X days, Monthly, Quarterly, Half Yearly, Yearly. It has an optional narration. |
| **Transaction PIN** | A 4-digit PIN. It authorises payments. |
| **One-time code (OTP)** | A 6-digit SMS code used for new-device sign-in, onboarding, and as the alternative way to authorise a payment. There is a USSD shortcode fallback. |
| **Ghana Card** | The national ID. Onboarding and recovery match a selfie against it (the NIA service). |
| **Card types** | **Debit** cards spend from a linked account and have no balance of their own. **Prepaid** and **virtual** cards hold a balance. Cards are **blocked or unblocked** (never "frozen"). |
| **My Spends** | The spending breakdown for one account, by category or by transaction type. |
| **Place a request** | Statement (free, emailed), cheque book, or bank letter, raised from Account Details. |
| **GCB Pay** | The bills and merchants category hub. |
| **PAPSS** | The Pan-African Payment and Settlement System. |
| **Needs attention** | A dashboard band that only appears when real items need action: failed payments, expiring or blocked cards, dormant accounts, bills due. |
| **Maker, checker, approval matrix** | The business-view controls: someone initiates, someone else approves, within configured limits. |
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
- **GCB account holder activating** (`/activate`): a Ghana Card match against existing accounts, then
  code, password and PIN. There is no funding step.
- **Migrating from the old internet banking** (`/migrate`): welcome → confirm code → "your details came
  with you" → new password → finish. Accounts, payees, standing orders and the PIN carry over; only the
  password is new.
- **Signing in:**
  - The full form is mobile number + password, then a code on a new device.
  - On a trusted device, a returning customer is greeted by name and enters their password. No one-time code.
  - Forgot password: mobile → selfie → new password. After 3 selfie misses, the customer is sent to a
    branch.
- **Send & Pay:** hub → chooser (a question) → progressive form → review → authorise → receipt, with
  an option to save the beneficiary. Dashboard pickers deep-link into the flow with the choice already
  made (`?rail=`, `?category=`, `?from=`).
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
- **Business:**
  - Single payments, and bulk upload → validation → review.
  - Approval queue → payment or trade approval.
  - Trade initiation and lifecycle tracking.
  - User administration: Profile → Roles & Services → Limits → Approval matrices → Review.
- **Admin portal:** transaction monitoring and exceptions, trade monitoring, customers, fee
  concessions, audit log.

## 7. Business rules

**Confirmed (BRD)**
- MFA at login and for high-risk actions: payments, trade initiation, approvals, profile switching and
  user administration (FR-03, NFR-01).
- Maker–checker and multi-level approvals. **Segregation of duties:** the same user can never both
  initiate and approve a transaction (FR-08, NFR-03).
- Limits apply at user, role, account and entity level. Corporate admins configure them within the
  bank's parameters (FR-09, FR-35).
- Bulk payments come in as ACH, GIP or MoMo files with record-level validation. Invalid records can
  be fixed or removed without re-uploading the file (FR-07).
- **A failed transaction shows its reason** (FR-32).
- Statements cover a chosen date range of up to 1 year, filterable by beneficiary name or amount
  (FR-04, FR-38).
- The bank's published daily FX rates are visible (FR-30).
- Self-service password reset uses an OTP or another method the bank approves (FR-31).
- Customers can fund prepaid cards from linked accounts and block or unblock their cards (FR-33,
  FR-34).
- Fee concessions are applied automatically (FR-37). Defining prices and tariffs is out of scope.
- Rejected Documentary Collections can be amended and resubmitted, with version history kept (FR-13).
- Trade status shows a timestamp for every stage (FR-16).
- Customers are notified on submission, approval, rejection and status change (FR-22).
- Contextual guidance during journeys (FR-27). In-product feedback (FR-29).
- Duplicate transactions are detected and blocked (NFR-19).
- Admin access to a customer is read-only and can never execute a transaction (ADM-2, ADM-16).
- Audit logs are immutable (NFR-05). The retention period needs confirming (see WORKING_LOG).

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
  staff). This conflicts with ASM-06; see WORKING_LOG.
- `[DECIDED 2026-10-01]` Passwords need at least 8 characters with upper, lower, number and symbol
  (`PASSWORD_RULES`, shared by sign-up, activation and reset). It was 12; see WORKING_LOG.
- `[DECIDED 2026-09-24]` Statements are free and emailed only. Cheque books and bank letters carry fees
  (the amounts are placeholders).
- `[DECIDED]` Referral codes are branch codes, and the branch name shows before *Apply*. Referral is
  offered once, after onboarding, and never gates sign-up.
- `[DECIDED 2026-08-26]` PAPSS replaced the generic international wire in Send Money. SWIFT came back
  on 2026-10-01 as **Outside Ghana**. If a country is PAPSS-eligible, the customer is offered PAPSS.
- `[DECIDED 2026-10-08]` **Invest rails separation (Term Deposits vs Treasury).** Term Deposits are
  direct bank fixed deposits (no CSD securities account required, instant creation). Treasury Bills &
  Bonds are government securities held at the CSD and require an active securities account (7-day setup).

## 8. Scope

**In scope** `[CONFIRMED]`:
- customer access and profiles
- user onboarding and lifecycle
- corporate self-service user management
- the admin portal
- retail account enquiry, payments and alerts
- corporate payments, file uploads and reporting
- trade initiation and tracking
- security, approvals and audit
- integration with core banking, trade, payments, PAPSS and NIA
- continuity of legacy features

**Out of scope** `[CONFIRMED]`:
- credit origination and underwriting
- changes to core banking
- branch, paper or manual processing
- pricing and tariffs
- non-banking services (marketplaces, lifestyle)
- AI advisory and advanced analytics
- retail product redesign
- external regulatory change

The Loans, Lifestyle, Cardless and QR scope conflicts are listed in WORKING_LOG.

## 9. Demo personas and conventions (prototype only)

| Persona | Id | Who |
|---|---|---|
| Ransford Gyasi | `u-retail` | Main retail customer, several accounts (`024 412 3821`) |
| Samuel Quartey | `u-joint` | Retail, plus a joint account with Esther Appiah. The only persona that switches profiles |
| Elias Ayettey | `u-joint-either` | Retail joint account holder (either-to-sign) |
| Abena Osei | `u-abena` | Mobile app user |
| Kofi Mensah | `u-kofi` | COOS persona |
| Yaw Oppong | `u-yaw` | Retail customer on a new device |
| Justice Oduro | `u-legacy` | Migrating from the old internet banking |
| Kwame Boateng | `u-dual` | Corporate maker, Adinkra Textiles (the id is a leftover name) |
| Esther Appiah | `u-approver` | Corporate approver, Adinkra Textiles |
| Yaw Oppong (Corporate Admin) | `u-corpadmin` | Corporate admin |
| Nana Addo, Abena Owusu, Kofi Asante | `u-tradeofficer`, `u-ops`, `u-bankadmin` | Admin portal: trade officer, operations, bank admin |

- Dev Mode customers on `/accounts` come from `src/lib/accounts-scenarios.ts`.
- Demo triggers:
  - `000000` is always a wrong code.
  - `0000` is always a wrong PIN.
  - A mobile number ending in `0000` always fails the selfie match.
- Older files (`prototype/`, `.design/`, root HTML) still use pre-2026-10-01 names: Ama Serwaa,
  Kwame Mensah, Kojo Appiah, Efua Mensah, Esi Quaye.

## 10. Assumptions and unknowns

- `[UNKNOWN]` Real integrations: core banking, NIA (Ghana Card), MoMo networks, GhIPSS, PAPSS, card
  3-D Secure. Every lookup, approval and settlement is simulated.
- `[ASSUMPTION]` Fees, turnaround times and FX rates for added currencies are **placeholders**.
  Pricing belongs to the bank (out of scope).
- `[ASSUMPTION]` Picker option order ("most used first") is a guess until real usage data exists.
- `[ASSUMPTION]` Some backend behaviour is still waiting on answers:
  - the wallet auto-sweep
  - the system-wallet flag
  - KYC tier limits on pass-through wallets
- `[ASSUMPTION]` FR-21's "five (5) days" audit retention is likely a typo.
- The FR, ES and ZH translations are first drafts that still need a native-speaker review.

## 11. Source documents

| Document | What it is |
|---|---|
| `src/lib/BRD New Internet Banking Solution 10JUL26.docx` | The BRD: objectives, scope, FR/NFR/ADM requirements, dependencies, risks, KPIs |
| `src/lib/NIBS-MVP-Screen-Consolidation-v2.docx` | About 30 core surfaces, the IA, the shells, the actor-to-nav matrix, and §13 screen states. It predates D1 |
| `DESIGN-TIMELINE.md` | Figma delivery plan: frame inventory, decisions D1–D5, the flow chassis, timeline to 2026-12-04 |
| `DESIGN-PLAN.md` | Phased prototype plan from 2026-08-25. It predates D1 and treats retail and corporate as one app |
| `phase-1-features-readiness.html` / `.pdf` | Phase 1 readiness report (2026-09-15) |
| `docs/STATES.md` | Brief for the illustrated empty, success and moment states (27 illustrations) |
| [Wallets as Plumbing proposal](https://claude.ai/artifact/QhozkvpUirRJDAGptLQmsC) | The reasoning behind the accounts-vs-sources model (2026-09-23) |
| Figma | Node ids are cited in the code and log: dashboard hero 1945:5108 and 1951:2350; Send & Pay 498:3460 and 916:36785; Account Details 1896:15266; My Spends 1867:4819; auth card 1587:4700 |
