# NIBS Design Completion Plan — Retail & Corporate

> A simple, phased plan for finishing the internet-banking design across the two
> customer segments. Companion to [`.ai/EXECUTION.md`](.ai/EXECUTION.md) (living
> tracker), [`.ai/INTERFACE.md`](.ai/INTERFACE.md) (design system), and
> [`DESIGN-LANGUAGE.md`](DESIGN-LANGUAGE.md).
>
> **Last updated:** 2026-08-25

---

## 1. How Retail and Corporate relate

They are **not two apps**. Both segments run inside the same customer shell and
share the same screens, tokens, and components. The difference is the **active
profile**:

- `activeProfile.kind === "RETAIL"` → an individual's banking.
- `activeProfile.kind === "CORPORATE"` → a business relationship, which unlocks
  extra navigation and controls (`src/lib/navigation.ts`).

| Area | Retail | Corporate |
|---|---|---|
| Overview, Accounts, Transactions, Cards, Payments, Reports, FX rates, Notifications | ✅ shared | ✅ shared |
| **Trade** (finance) | hidden | shown when `tradeEligible` |
| **Approvals** (maker-checker) | hidden | shown for Approver role |
| **Administration** (users/roles) | hidden | shown for Corporate Admin role |
| Onboarding | `/signup`, `/activate` (retail mode) | `/signup/business`, `/activate` (corporate invite) |

**Design implication:** finish the *shared* surfaces once, at a quality that
serves both, then finish the *corporate-only* surfaces (Trade, Approvals,
Administration) which carry the heavier control and multi-user logic.

---

## 2. Definition of "design complete" (per screen)

A screen is done only when all of these hold — this is the acceptance checklist,
not a suggestion:

- [ ] Uses the standard page skeleton (`PageHeader` + content panel) from `.ai/INTERFACE.md §5`.
- [ ] Semantic tokens only — no raw hex, no ad-hoc Tailwind colors, no `font-bold`/`font-semibold`.
- [ ] All numbers, dates, refs carry `.tabular`.
- [ ] Lucide icons at `size 15–18`, `strokeWidth 1.7–1.9`.
- [ ] Renders correctly in **Light and Dark** mode.
- [ ] For any list/table: all **5 states** wired via `StateSwitcher` — loaded, empty, filtered-empty, error, loading.
- [ ] Retail *and* Corporate profile variants both render correctly (right data, right nav, right controls).
- [ ] Permission-gated elements are **hidden, not disabled**; state-disabled controls show the reason inline.
- [ ] Passes the quality gate: `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npx next build`.

---

## 3. Current state snapshot

**Done / substantially built**
- Auth & entry: `/login`, `/mfa`, `/forgot-password`, `/profile-selection`, `/get-started`
- Onboarding: `/signup` (retail), `/signup/business` (corporate), `/activate` (both modes)
- Shared banking: `/overview`, `/accounts` + `/accounts/[id]` (+ statement), `/transactions` + `[id]`, `/cards` + `[id]`, `/fx-rates`, `/reports`, `/notifications`
- Payments: `/payments`, `/payments/send`, `/payments/new`, `/payments/payees`, `/payments/standing`, `/payments/bulk` + `[id]`
- Corporate: `/trade` + `new` + `[id]`, `/approvals` + payment/trade detail, `/administration` + `[id]`
- Admin portal (separate shell): overview, transactions, exceptions, trade, customers, fee-concessions, audit

**Gaps / thin spots to resolve**
- `/statements` route directory exists but **has no page** — top-level Statements & Documents surface is missing.
- FX **conversion / exchange** action flow (not just the rates table) is unconfirmed.
- Payments variety (Internal / ACH / Wire / Instant) needs an audit — is each rail represented and distinct?
- Cross-segment QA: several shared screens have not been verified under a *retail* profile as well as corporate.
- Full 5-state + Light/Dark sweep not yet run across all routes (per EXECUTION.md quality checklist).

---

## 4. Phased plan

### Phase 0 — Baseline & audit (0.5–1 day)
- Run `tsc` / `eslint` / `next build` to get a clean starting line.
- Walk every route in **both** a retail and a corporate profile; log per-screen gaps against the §2 checklist.
- Produce a short gap list; fold it into `.ai/EXECUTION.md`.

### Phase 1 — Finish the shared retail surfaces (they also serve corporate)
1. **Statements & Documents** — build the missing `/statements` page (list + download, 5 states).
2. **Payments audit** — confirm Internal / ACH / Wire / Instant are each expressed with the right fields, limits, and confirmations; unify the two send entry points if they diverge.
3. **FX conversion flow** — the actual "convert / exchange" action, not just the rates view.
4. **Retail-profile pass** — verify Overview, Accounts, Cards, Transactions all read correctly with retail data and hide corporate-only nav.

### Phase 2 — Finish corporate-only surfaces
1. **Approvals (maker-checker)** — queue + payment/trade approval detail, with explicit consequence confirmations and audit-trail messaging.
2. **Administration** — user access & role management; invite → activate handshake with `/activate` corporate mode.
3. **Trade** — trade list/new/detail polished to the §2 checklist.

### Phase 3 — Cross-cutting quality sweep
1. **5-state coverage** on every list/table via `StateSwitcher`.
2. **Light/Dark** visual pass on every route.
3. **Empty/error microcopy** — plain-language, reassuring, action-first.
4. Final quality gate green across `tsc` / `eslint` / `next build`.

### Phase 4 — Onboarding & edge polish
1. Retail signup + activation end-to-end.
2. Corporate signup + admin-invite + activation end-to-end.
3. Profile-selection and multi-relationship switching.

---

## 5. Fintech-UX gate (apply to every screen decision)

From the `fintech-ux` lens — answer these out loud per surface, and name any "no":

- **In control?** Does the person always see what will happen to their money before they commit, and can they undo or cancel? (Especially payments, FX conversion, corporate approvals.)
- **Without judgment?** Do empty/error/low-balance states inform rather than scold?
- **Lighter?** Can a step, field, or confirmation be removed without losing safety? Corporate flows carry real control needs — keep those; cut ceremony everywhere else.

---

## 6. Suggested sequencing summary

```
Phase 0  Audit both profiles ─┐
Phase 1  Shared retail (Statements, Payments, FX)  ← highest reuse
Phase 2  Corporate-only (Approvals, Administration, Trade)
Phase 3  Quality sweep (5 states, Light/Dark, copy)
Phase 4  Onboarding end-to-end
```

Update `.ai/EXECUTION.md` checkboxes as each item lands; append any new quirks to
`.ai/LEARNINGS.md`.
