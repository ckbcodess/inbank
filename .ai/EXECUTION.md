# Active Task Execution & Tracking

> **Session Continuity Log**: This file tracks the active milestone, task breakdown, architectural decisions, and next steps across AI coding sessions.

---

## Current Goal / Active Milestone

**Milestone**: NIBS Banking Prototype MVP — Screen Implementation & State Switcher Fidelity
- **Objective**: Ensure comprehensive coverage of all customer & admin prototype screens according to the Screen Consolidation specification, with zero-drift styling, 5-state coverage, and strict Light/Dark mode validation.

---

## Checklist & Progress

- [x] **Repository Foundation & Setup**
  - [x] Next.js 15 + React 19 + Tailwind v4 + Base UI configuration
  - [x] Design token definition in `src/app/globals.css` with OKLCH variables
  - [x] Session store persistence with `useSessionHydrated` protection
  - [x] Dual-shell architecture separation (`(customer)` and `admin`)
  - [x] Persistent AI context files created in `.ai/` (`INTERFACE.md`, `LEARNINGS.md`, `EXECUTION.md`)

- [ ] **Core Customer Shell Screens**
  - [x] Overview / Dashboard (Liquidity, Quick Actions, FX, Insights)
  - [x] Accounts List & Account Detail views
  - [x] Cards List & Card Details (limits, controls, freeze/unfreeze)
  - [x] Send & Pay (Send Money, Pay Bills, Standing Orders, Hub) — Figma 498:3460
  - [ ] FX Rates & Currency Exchange Conversion
  - [ ] Statements, Documents & Compliance Audit log

- [ ] **Admin Portal Shell Screens**
  - [x] Fee Concessions Table & Management
  - [ ] User Access & Role Administration
  - [ ] Maker-Checker Approval Queue & Dialogs
  - [ ] Operations & System Audit Logs

- [ ] **Quality & Verification Checks**
  - [x] `npx tsc --noEmit` validation (zero type errors)
  - [x] `npm run build` verification (37 routes generated successfully)
  - [ ] Dual-theme visual check (Light and Dark mode fidelity)
  - [ ] Every screen has functional `StateSwitcher` with all 5 states

---

## Recent Decisions / Audit Log

| Date / Session | Decision / Change | Rationale |
|---|---|---|
| Initial | Strict Semantic Token Enforcment | Guarantees instant dark mode compatibility and zero visual drift. |
| Initial | Font Weight Cap (`font-weight: inherit`) | Typography uses size and letter-spacing for hierarchy instead of heavy bolding. |
| Initial | Floating-point Money Utility Module | Eliminates JavaScript floating-point rounding bugs across monetary aggregates. |
| Initial | Asynchronous Hydration Gate | Prevents hydration race condition in Zustand session store on route guards. |
| Initial | AI Context System Initialized | Standardized `.ai/INTERFACE.md`, `.ai/LEARNINGS.md`, and `.ai/EXECUTION.md` for consistent agent pair-programming. |
| 2026-08-26 | Figma design timeline authored — [`DESIGN-TIMELINE.md`](../DESIGN-TIMELINE.md) | Retail IA (7 hubs / 19 nodes) costed at ~263 frames; 14-week single-designer or 9-week two-designer track. Decisions D2, D3, D5 still open before W1. |
| 2026-08-26 | **D1 decided — Personal and Business are two separate views, segmented pre-login** | The customer picks Personal or Business *before* signing in; each door has its own sign-in and there is no in-session profile switcher. Dual-relationship customers sign out and re-enter. Drops `/profile-selection` and profile-conditional nav from the Personal view; adds a 9-frame Entry & segmentation block. Trade / Approvals / Administration leave this plan for a separate Business-view timeline. **Not yet implemented** — `src/lib/navigation.ts` still carries the old conditional model. |
| 2026-08-26 | **One-time-code authorisation before every issued transaction** | `railSteps()` appends a universal `authorise` step to every rail (immediate, scheduled and repeating alike), and standing instructions created from `/payments/standing` pass the same gate. Logic lives once in `useAuthorisation` with a shared `AuthorisePanel`; `OtpInput` is reused from the MFA screen. Unlike sign-in MFA a completed code does **not** auto-submit — a payment is not recoverable — and stepping back discards the code. Pause/cancel are deliberately NOT gated (no asymmetric friction on stopping a payment). Receipts now carry an "Authorised" row. |
| 2026-08-26 | **D4 decided and built — one Send Money hub, one rail picker** | `/payments/new` and `UniversalTransferSheet` **deleted**. One machine (`src/components/payments/PaymentFlow.tsx`) now serves `/payments/send` (bank, ACH, wallet, proxy, group, mobile money, PAPSS) and `/payments/bills` (airtime, ECG, bills & merchants, Ghana.gov), matching the IA. Fee and arrival copy come from a single `RAIL_FACTS` table so the quote can't drift between picker, amount, review and receipt. Old deep links survive as `?source=` / `?duplicate=` / `?rail=`. PAPSS replaced the generic SWIFT wire. |
| 2026-08-30 | **Send & Pay Module Overhaul — Figma node 498:3460 Alignment** | Rebranded navigation to **Send & Pay**. Implemented 3-category hub layout (*Send*, *Pay*, *Scheduled*). Aligned Send Money and Pay Bill to 4-step wizard (*Recipient* with live lookup -> *Amount* with source card & *When?* control -> *Review* -> *Authorise* & *Receipt*). Rebuilt Standing Orders hub with cards and 4-step creation modal. |
| 2026-09-03 | **Beneficiaries Directory Standalone Tab & Dual-Journey Payment Groups** | Promoted Beneficiaries to a first-class Level-1 nav tab under Move Money (`/beneficiaries`) with full CRUD. Unified Payment Groups (Susu circles, family pools) into a shared Zustand store (`src/lib/groups-store.ts`). Implemented in-flow contextual group creation in `PaymentFlow.tsx` (`+ Create new group`) with immediate auto-selection, eliminating phantom lists and preventing flow abandonment. |

---

## Next Steps

1. **Implement Remaining Customer Flow Screens**: Complete the Transfer Between Accounts flow and FX Conversion interface.
2. **Implement Admin Maker-Checker Workflow**: Wire up `ComplianceActionDialog` and role-gated approval triggers.
3. **Verify All 13.1 States Across Routes**: Test `ListSkeleton`, `TrueEmptyState`, `FilteredEmptyState`, `ListErrorState`, and `PartialLoadFooter` on all data tables and lists.
4. **Answer the remaining decisions D2, D3, D5** in [`DESIGN-TIMELINE.md`](../DESIGN-TIMELINE.md) §4 before Figma Week 1 (Mon 31 Aug 2026). D1 and D4 are settled.
5. **Implement D1 in the prototype** — pre-login Personal/Business chooser, two sign-in doors, remove the post-login profile switcher, and split `src/lib/navigation.ts` into a Personal model (hubs 1–7) and a Business model (Trade / Approvals / Administration).
6. **Build out the remaining Send Money rails** — proxy, group and PAPSS have real step sets but representative logic only (proxy resolves against a fixture directory, group has no per-recipient validation, PAPSS rates are fixtures).
