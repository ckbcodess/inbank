# NIBS — Figma Design Completion Timeline

> Delivery plan for finishing **every screen in the retail internet-banking IA** as
> production-ready Figma frames.
>
> Companion to [`DESIGN-PLAN.md`](DESIGN-PLAN.md) (phasing of the coded prototype),
> [`.ai/INTERFACE.md`](.ai/INTERFACE.md) (design system rules) and
> [`.ai/EXECUTION.md`](.ai/EXECUTION.md) (living tracker).
>
> **Baseline date:** 2026-08-26 · **Target completion:** 2026-12-04 (single designer)
> or 2026-10-30 (two designers)

---

## 1. What this plan covers

The agreed IA is **7 parent hubs**, 19 menu nodes, ~60 named products and services.
This document turns that into a countable set of Figma frames, a definition of "done",
and a week-by-week calendar.

**Unit of work = one Figma frame** at the desktop-web breakpoint, in Light mode, with
its Dark-mode variant produced by the token layer rather than drawn twice. A "screen"
in the IA (e.g. *Buy Airtime & Data*) is almost never one frame — a money-moving action
is normally **four**: entry form → review → authorisation → outcome.

**Not covered here:** brand/visual identity exploration, marketing pages, the Admin
Portal shell, and the two items the IA marks *Not included* (Cardless Withdrawal,
QR / Scan and Pay) — see Decision **D3**.

---

## 2. Screen inventory & frame count

| # | Hub | Node | Source | Frames | Reuse from built prototype |
|---|---|---|---|---:|---|
| 1 | Dashboard | S05 Overview | Both | 6 | **High** — `/overview` is built |
| 2 | Accounts | My Accounts | Both | 9 | **High** — `/accounts`, `[id]`, `/statement` built |
| 2 | Accounts | Card Center | Mobile | 16 | **Medium** — `/cards` + `[id]` built; funding / virtual / card payments net-new |
| 3 | Send & Pay | Send Money | Both | 37 | **Low** — 7 rails; only bank transfer is wired today |
| 3 | Send & Pay | Pay Bills | Mobile | 18 | **None** — net-new |
| 3 | Send & Pay | Standing Orders | Both | 12 | **Medium** — `/payments/standing` built |
| 3 | Send & Pay | Beneficiaries | Both | 9 | **High** — `/payments/payees` built |
| 4 | Invest | Portfolio View | Mobile | 11 | **None** |
| 4 | Invest | Treasury Bills | Mobile | 9 | **None** |
| 4 | Invest | Fixed Income | Both | 14 | **None** |
| 4 | Invest | Early Liquidation | Mobile | 6 | **None** |
| 5 | Insure | Get a Quote | Mobile | 4 | **None** |
| 5 | Insure | Buy a Policy | Mobile | 19 | **None** — 6 products + provider selector |
| 5 | Insure | Policy Mgmt | Mobile | 11 | **None** |
| 5 | Insure | Beneficiary Center | Mobile | 5 | **None** |
| 6 | Loans | Apply for Loan | Mobile | 19 | **None** |
| 6 | Loans | Servicing | Both | 9 | **None** |
| 7 | Settings | User Profile | Both | 7 | **Low** |
| 7 | Settings | Value-Adds | Mobile | 6 | **None** |
| | | **Product subtotal** | | **227** | |
| 0 | Foundations | Library & flow chassis | — | 27 | Derived from `globals.css` + built components |
| 0 | Foundations | Entry & segmentation (§4a) | — | 9 | Two doors, chosen before sign-in |
| | | **Total** | | **≈263** | |

> The corporate surfaces (Trade, Approvals, Administration) are **not** in this
> count. Per D1 they belong to a separate Business view with its own timeline.

### How the counts are built

Every money-moving service is costed on the same chassis, so the numbers are auditable
rather than guessed:

- **Action flow** = entry → review → authorise (OTP / soft token) → success. **4 frames.**
  Failure and pending are drawn **once** in Foundations and reused.
- **List surface** = loaded + true-empty + filtered-empty + error + loading. **5 frames**
  (the mandatory 5 states from `.ai/INTERFACE.md`).
- **Detail surface** = 1–2 frames.
- Rails or products that add a genuinely different decision carry **+1 or +2** — PAPSS adds
  a country and FX-disclosure step, Group Transfers adds a recipient builder, Loans add an
  eligibility / offer step.

### Foundations block (27 frames)

| Group | Contents | Frames |
|---|---|---:|
| Variables & tokens | Colour (Light/Dark), type ramp, spacing, radius, elevation — documented | 3 |
| Core controls | Button set, input, select, toggle, checkbox / radio, chip | 6 |
| Money primitives | Amount input, currency selector, balance-masking pattern, tabular-numeral spec | 4 |
| List & table | Row, table, and the 5 mandatory states | 5 |
| **Flow chassis** | Review sheet, authorisation (OTP), success receipt, failure, pending / in-flight | 5 |
| Shell | Side nav (expanded + collapsed), hub landing template, page header + breadcrumb | 4 |

The **flow chassis is the highest-leverage artefact in the plan**: 15 of the 19 nodes end
in a money movement, so those 5 frames are inherited roughly 40 times. Getting them right
in Week 1 is worth more than any individual screen later.

---

## 3. Definition of "design complete" (per frame)

A frame is not done until every line holds. This is the acceptance checklist used at each
weekly review — not a suggestion.

**System compliance**
- [ ] Built from library components; no detached instances, no local styles.
- [ ] Colour, type, spacing and radius bound to **variables** — zero raw hex.
- [ ] Zero bold: hierarchy from size, letter-spacing and whitespace only (`font-weight: inherit` cap).
- [ ] All amounts, dates and reference codes set in **tabular numerals**.
- [ ] Lucide icons only, 15–18px, stroke 1.7–1.9.
- [ ] Radius system respected: panels `2xl`, insets `xl`, controls / tiles `lg`.
- [ ] Auto-layout throughout; resizes correctly at the desktop breakpoint.

**Coverage**
- [ ] **Dark mode** renders correctly via the variable mode switch.
- [ ] Any list or table carries all **5 states**.
- [ ] Any flow carries **review → authorise → success → failure → pending**.
- [ ] Error, limit-exceeded, insufficient-funds and cut-off states drawn, not implied.

**Behaviour & content**
- [ ] Real copy — no lorem, no `[placeholder]`. Microcopy is the design.
- [ ] Realistic Ghanaian data: GHS amounts, local names, GhIPSS / mobile-money networks, actual biller names.
- [ ] Every undefined finance term (rediscount, tenor, coupon, APR, premium, PAPSS) glossed **in place**.
- [ ] Prototype links wired for the primary path.

**Handoff**
- [ ] Named to the convention `Hub / Node / Screen — State`.
- [ ] Dev annotations for anything the frame cannot show: limits, validation rules, timing, permissions.
- [ ] Passes the **fintech-UX gate** in §6.

---

## 4. Decisions needed before Week 1

These block or reshape the plan. Each needs an owner and an answer by **Fri 28 Aug**.

| # | Decision | Why it blocks | Recommendation |
|---|---|---|---|
| **D1** | ~~This retail IA vs. the corporate IA already in code.~~ | — | **DECIDED 2026-08-26 — two separate views, segmented before sign-in.** See §4a. |
| **D2** | **Mobile-app screens → web.** 11 of 19 nodes are sourced from the mobile app only. | A phone flow ported 1:1 onto a 1440px canvas wastes the canvas and reads as a broken port. | Re-lay-out for web — side nav plus two-column where the mobile app stacked — but keep the flow's *step count* identical, so parity with the app stays defensible. |
| **D3** | **Cardless Withdrawal and QR / Scan and Pay** are marked *Not included*. | If the answer is "not included **yet**", frames must be reserved in Card Center and Pay Bills. | Confirm as permanently out of web scope (both are inherently physical or phone-camera). If merely deferred, add ~7 frames and one week. |
| **D4** | ~~Send Money already diverges in the prototype.~~ | — | **DECIDED 2026-08-26 — one hub, one rail picker.** Built in the prototype; see §4b. |
| **D5** | **Source-of-truth conflicts** between the Mobile App and the BRD across the 8 nodes marked *Both*. | Unresolved conflicts surface mid-week and stall a screen. | Reconcile in W0 and log each conflict. Suggested tie-break: BRD wins on rules and limits, mobile app wins on flow shape. |

---

## 4a. D1 — Personal and Business are two separate views

**Decided 2026-08-26.** Retail and corporate are no longer one product with a
profile switcher. They are **two views, and the customer is funnelled into one of
them before they sign in.**

```
                    ┌─ Personal ─→ personal sign-in ─→ hubs 1–7 (this plan)
Landing / segment ──┤
                    └─ Business ─→ business sign-in ─→ corporate view (separate plan)
```

- The pre-login chooser is the segmentation point. No post-login profile switcher.
- A customer holding **both** a personal and a business relationship signs out and
  re-enters through the other door. There is no in-session switch.

**What this changes in the plan**

| | |
|---|---|
| **Scope** | This 7-hub IA is now the **complete Personal view**. Trade, Approvals and Administration leave this plan entirely and belong to a separate Business-view timeline. |
| **Removed** | The profile switcher, `/profile-selection` as a post-login step, and every profile-conditional nav variant — roughly **4 frames** and a chunk of shell complexity. |
| **Added** | An **Entry & segmentation** block of **9 frames**, which the original count did not carry at all (see below). |
| **Net** | ≈ **+5 frames** — the timeline in §5 absorbs this inside W1 and needs no date change. |

**Entry & segmentation block (9 frames, built in W1 alongside Foundations)**

1. Segment chooser — Personal / Business, pre-login
2. Personal sign-in
3. Business sign-in
4. MFA / OTP step
5–6. Wrong-door states — business credentials at the personal door, and the reverse
7. Dual-relationship notice — "You also bank with us for business"
8. Signed-out landing that remembers which door they used
9. Session-expired return

**The friction this buys, named honestly.** A sole trader with a personal and a
business account at GCB — a very common Ghanaian customer — now signs out and back
in to move between their own money and their business's. That is a real daily tax
on the customer this IA is otherwise built to serve, and it fails the **lighter**
gate question. It is a deliberate trade: the two views stay genuinely separate, the
shell stops carrying conditional logic, and nobody ever sees business controls on a
personal screen. Two things keep the cost honest, and both are design work in W1:

- **Frames 7 and 8 do the load-bearing work.** The wrong-door state must say which
  door to use and link straight to it — never "invalid credentials". And after
  sign-out the app remembers the segment, so the return trip is one step, not three.
- **Name the door everywhere.** The header states Personal or Business at all times,
  so nobody makes a payment believing they are in the other one.

---

## 4b. D4 — One Send Money hub, one rail picker

**Decided 2026-08-26, and built in the prototype.** There is exactly one way to
start a payment. The two divergent entry points are deleted, not deprecated:

- `/payments/new` — **removed**; its four inbound links now reach the hub, and its
  two intents survive as deep links (`?source=` from an account, `?duplicate=` from
  a failed payment, both landing on the amount step with the destination prefilled).
- `UniversalTransferSheet` — **removed**; the orphaned mobile-wallet modal is gone.

One state machine now serves both sibling nodes under Send & Pay, differing only in
which rails the picker offers:

| Route | Node | Rails |
|---|---|---|
| `/payments/send` | Send Money | Bank transfer · Other bank (ACH) · Mobile money · Wallet transfer · Proxy Pay · Group transfer · PAPSS |
| `/payments/bills` | Pay Bills | Airtime & data · ECG prepaid · Bills & merchants · Ghana.gov |

**Every payment is authorised with a one-time code.** The flow chassis in §2
always assumed an authorise stop; the code now has it. `railSteps()` appends
`authorise` to every rail rather than letting each rail declare it, so a new rail
cannot forget it. It applies to immediate sends, scheduled one-offs and repeating
instructions alike — setting up a standing order commits future money as surely
as sending it now — and to standing instructions created from
`/payments/standing`, which share the same gate via `useAuthorisation`.

Three deliberate calls inside that gate, each of which the Figma frames should
carry rather than re-decide:

- **The payment is restated above the code boxes** — amount, payee, and what
  leaves which account. A code screen that only says "enter your code" is what
  makes one-time codes phishable: people read a text out to a caller without ever
  seeing what they are approving. `AuthorisePanel` makes `summary` a required
  prop so no caller can omit it.
- **A completed code does not auto-submit.** The sign-in MFA screen verifies the
  moment the sixth digit lands, because signing in is recoverable. A payment is
  not, so the final press stays a deliberate act and "Go back" works right up to
  it. Stepping back discards the code — one that survived an edit could authorise
  a payment the customer never saw in that shape.
- **Stopping is not gated.** Pausing or cancelling a standing instruction needs
  no code. Friction in front of stopping a payment while starting one stays easy
  is the asymmetry that traps people.

Three further things the code settles:

- **One fee table.** Every rail's fee and arrival promise lives in a single
  `RAIL_FACTS` map, read by the picker, the amount step, the review and the
  receipt — so the customer is quoted the same number in all four places.
- **Proxy Pay resolves before it asks for money.** The alias is turned into a real
  account name and shown, because a proxy is opaque otherwise and paying the wrong
  one is unrecoverable.
- **PAPSS states what it costs, not just what it sends.** The recipient's local
  amount is the headline; the rate applied and the total GHS debit sit beside it,
  and both carry through to the receipt.

Note: the picker replaced the old generic "international wire" with PAPSS, per the
IA. If SWIFT is still needed for the Business view, it belongs in that plan.

---

## 5. Timeline

### Track A — single designer (14 weeks, ends **Fri 4 Dec 2026**)

| Week | Dates | Focus | Frames | Milestone |
|---|---|---|---:|---|
| **W0** | Thu 27 – Fri 28 Aug | Decisions D1–D5, Figma file and page architecture, source-material inventory | — | **M0** Scope locked |
| **W1** | Mon 31 Aug – Fri 4 Sep | **Foundations** — variables, core controls, money primitives, list states, flow chassis, shell — **plus the 9-frame Entry & segmentation block** (§4a) | 36 | **M1** Library v1 |
| **W2** | Mon 7 – Fri 11 Sep | Dashboard (6) + My Accounts (9) | 15 | **M2** System proven on real screens |
| **W3** | Mon 14 – Fri 18 Sep | Card Center | 16 | |
| **W4** | Mon 21 – Fri 25 Sep | Send Money A — hub and rail picker, Bank, Other Bank / ACH, Wallet | 18 | |
| **W5** | Mon 28 Sep – Fri 2 Oct | Send Money B — Proxy Pay, Group, Mobile Money, PAPSS | 19 | **M3** Send Money complete |
| **W6** | Mon 5 – Fri 9 Oct | Pay Bills — Airtime & Data, ECG Prepaid, Bills & Merchants, Ghana.gov | 18 | |
| **W7** | Mon 12 – Fri 16 Oct | Standing Orders (12) + Beneficiaries (9) | 21 | **M4** Send & Pay hub complete |
| **W8** | Mon 19 – Fri 23 Oct | Portfolio View / CSD (11) + Treasury Bills (9) | 20 | |
| **W9** | Mon 26 – Fri 30 Oct | Fixed Income (14) + Early Liquidation (6) | 20 | **M5** Invest hub complete |
| **W10** | Mon 2 – Fri 6 Nov | Get a Quote (4) + Buy a Policy (19) | 23 | |
| **W11** | Mon 9 – Fri 13 Nov | Policy Mgmt (11) + Beneficiary Center (5) | 16 | **M6** Insure hub complete |
| **W12** | Mon 16 – Fri 20 Nov | Apply for Loan — salary advance, personal loan, migration wizard, offers | 19 | |
| **W13** | Mon 23 – Fri 27 Nov | Loan Servicing (9) + Settings (13) | 22 | **M7** All hubs drawn |
| **W14** | Mon 30 Nov – Fri 4 Dec | **Hardening** — Dark-mode sweep, 5-state sweep, prototype wiring, dev annotations, sign-off | — | **M8** Design complete |

Sustained rate: **~19 frames per week (≈3.8 per day)**. That is a working rate for banking
screens with full state coverage — not a stretch target, and not padded.

### Track B — two designers (9 weeks, ends **Fri 30 Oct 2026**)

W0 and W1 stay shared: one designer leads Foundations, the second reconciles sources and
drafts the copy deck. From W2 the work splits on hub boundaries — the two halves share the
chassis but touch no common frames.

- **Designer A** → Dashboard, Accounts, Send & Pay = **107 frames**
- **Designer B** → Invest, Insure, Loans, Settings = **120 frames**

Parallel build runs **Mon 7 Sep – Fri 23 Oct** (7 weeks); hardening **Mon 26 – Fri 30 Oct**.

> Do **not** parallelise before M1. Two designers drawing screens against an unfinished
> library produces divergence that costs more than the week it saves.

### Calendar assumptions

- 5-day weeks, no public holidays deducted — confirm Ghanaian holidays falling in the
  window (notably Farmers' Day, first Friday in December, which lands inside W14 of Track A).
- Weekly review is **Friday afternoon**, timeboxed; rework lands in the following week's
  buffer, not the same day.
- Each week's count already includes its own rework. There is no separate catch-up week,
  which is why the daily rate is set at 3.8 rather than 6.

---

## 6. The fintech-UX gate

Applied per screen, and to the sequencing itself.

**Per screen — answer out loud, and name any "no":**

1. **In control?** Does the person see exactly what leaves their account, where it goes,
   what it costs, and when it arrives — *before* they commit? Is there a cancel, an undo,
   or at minimum "we'll tell you when it lands"?
2. **Without judgment?** Do empty, error, declined and insufficient-funds states inform
   rather than scold? Does the bad news ship with a door — the mechanism named and the next
   action in the same breath?
3. **Lighter?** Can a step, field or confirmation be removed without losing safety?
   Regulation and fraud prevention earn their steps; "we might as well collect this" does not.

**Sequencing consequences.** Three groups of screens carry the heaviest emotional load and
get extra review time budgeted inside their week:

- **PAPSS Payments** (W5) — cross-border on an unfamiliar rail; the user cannot judge for
  themselves whether it worked. The receipt must state the FX rate applied, the total
  charged in GHS, and an expected arrival window.
- **Early Liquidation / rediscount** (W9) — the person is breaking an investment early,
  usually because something went wrong. The penalty and the exact net payout must appear
  *before* the confirm, framed as a fact rather than a warning, with no friction asymmetry
  against how easy it was to open the deposit.
- **Apply for Loan** (W12) — arrives with hope, leaves with an answer. A decline must name
  the reason and a route back, and a *Personalized Loan Offer* must never be surfaced at the
  moment a balance hits zero.

Two rules that override any brief on this project:

- **Nothing sits between the user and their balance.** No interstitial, no promo slot above
  the fold on Overview. Balance masking is a privacy control the user owns — never an upsell
  surface.
- **Value-Adds (Referral & Rewards) never borrows a money screen.** It lives in Settings,
  which is exactly where this IA places it. Keep it there.

---

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Dual-relationship customers churn on the sign-out/sign-in trip (D1) | The sole-trader segment quietly stops using one of the two views | Frames 7–8 of the entry block; watch the behaviour, not the clicks — how many dual holders open the second view in a 30-day window |
| Insurance and investment product rules arrive late | W8–W11 is 79 frames, 31% of the plan, and stalls | Request provider matrices, tenor tables and premium rules **now**, in W0 |
| Mobile-only nodes ported without re-layout | Web frames look like stretched phone screens; rework | D2 decided in W0; W2 is the visible proof of the pattern |
| Library churn after W1 | Every downstream frame drifts | Library freezes at M1; changes go through a logged version bump |
| Scope creep from the *Not included* items | +7 frames, +1 week | D3 answered in W0 and recorded |
| Single-designer bus factor (Track A) | The whole timeline stops | Prefer Track B; on Track A, keep the library and copy deck reviewable by a second person |

---

## 8. Tracking

- Progress is measured in **frames accepted against §3**, never frames drawn.
- Update `.ai/EXECUTION.md` at each milestone (M0–M8) with what landed and what slipped.
- Log every new constraint or quirk (Figma variable-mode limits, component API decisions)
  in `.ai/LEARNINGS.md`.
- Weekly status is three numbers: **frames accepted / frames planned / open decisions**.

---

## 9. Sequencing at a glance

```
W0     Decisions D1–D5 ─────────────────── gate  (D1 ✔ and D4 ✔ decided)
W1     Foundations (27) + Entry & segmentation (9)  ← ~40x reuse; highest leverage
W2     Dashboard + My Accounts (15)   ← proves the system on real screens
W3     Card Center (16)
W4–5   Send Money, 7 rails (37)  ← largest node; unify the entry point first
W6     Pay Bills (18)
W7     Standing Orders + Beneficiaries (21)
W8–9   Invest — CSD, T-Bills, Fixed Income, Liquidation (40)
W10–11 Insure — Quote, Buy, Manage, Beneficiaries (39)
W12–13 Loans (28) + Settings (13)
W14    Hardening — dark mode, states, prototype, handoff
```

The order is not arbitrary. **Highest reuse first** (foundations, then the shared banking
surfaces that already exist in code), **largest and most-used node next** (Send & Pay is
where retail customers actually spend their time), then the specialist verticals — Invest,
Insure and Loans — which are self-contained and can be cut or deferred without breaking
anything above them.
