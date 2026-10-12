# Internet Banking Redesign — Design Delivery Proposal

**Project Period:** 05 October – 18 December 2026 (11 Weeks)  
*(Extended design hypercare through 24 December 2026)*  
**Scope:** Retail, Corporate, Bank Administration  
**Design Team:** 2 Product Designers (Parallel Workstreams)  
**Status:** Clean Proposal — Ready for Stakeholder Distribution  

---

## 1. Executive Summary & Delivery Strategy

We propose an **11-week design delivery programme** running from **October through December 2026**. The plan balances high-velocity journey design with strict delivery rigor, ensuring full design readiness, active UAT support, and enterprise design system consolidation ahead of the **15 December 2026** production target.

### Core Delivery Principles

1. **Leverage Existing Assets:** For Retail, we translate and adapt established mobile journeys and patterns rather than designing from a blank slate.
2. **Parallel Workstreams:** Two designers operate in parallel streams:
   - **Stream 1 (Retail & Shared Experience):** Moves rapidly through core customer journeys.
   - **Stream 2 (Corporate & Administration):** Resolves complex role hierarchies, multi-level approval workflows, host-to-host APIs, and business rules early.
3. **Dedicated December Window:** December is explicitly reserved for **UAT Testing Support** (triage, edge-case resolution, and design QA) and **Design System Add-ons** (harvesting, documenting, and packaging UI components, tokens, and patterns created for Internet Banking into the centralized GCB design system for cross-channel reuse).

---

## 2. Scope & Design Effort Calibration

| Domain | Functional Area | Baseline / Starting Point | Design Action | Effort Level |
|---|---|---|---|---|
| **Shared** | Onboarding & Auth | Mobile & KYC specs | Web self-service, Ghana Card/Passport verification, password reset | Medium |
| **Shared** | Dashboard & Shell | Prototype foundation | Responsive navigation, consolidated balances, quick actions | Low–Medium |
| **Retail** | Accounts & Transactions | Mobile patterns | Account detail, transaction search/filter, centralized statements | Low–Medium |
| **Retail** | GCB Pay & Transfers | Mobile flows | Instant rails (GIP, ACH, NRT, Express), proxy pay, wallet-to-bank | Medium |
| **Retail** | Card Center & Services | Mobile journeys | Debit/prepaid management, virtual cards, utility & bill payments | Medium |
| **Retail** | Wealth & Servicing | Product requirements | Term deposits, in-house investments, salary advance/loans | Medium |
| **Corporate** | Structure & Mandates | Account mandates | Multi-company/subsidiary hierarchy, role-based access, limit matrices | High |
| **Corporate** | Mixed-Rail Bulk Payments | Business rules | Single upload file routing across MoMo, ACH, GIP, OBVAM, and GCB | High |
| **Corporate** | Approvals & Mobile App | Multi-user workflow | Maker-checker queues, limits, companion Approval mobile app flows | High |
| **Corporate** | Host-to-Host (ERP) | API specifications | ERP batch ingestion, status reconciliation, GCB review gates | High |
| **Internal** | Bank Operations / Admin | Service requirements | Corporate onboarding, mandate setup, audit trail, fee concessions | High |
| **Platform** | Design System Add-ons | Project design outputs | Component library, semantic tokens, tabular primitives, icon assets | High (Dec focus) |

---

## 3. Master 11-Week Delivery Schedule

```
OCTOBER                          NOVEMBER                         DECEMBER
[W1 — W4: Retail & Foundations]  [W5 — W8: Corporate & Operations] [W9 — W11: UAT & Design System]
```

| Week | Dates | Focus | Core Outputs & Milestone Deliverables |
|:---:|---|---|---|
| **01** | 05 – 09 Oct | **Onboarding, Shell & Accounts** | Self-onboarding flows (Ghana Card / Passport), login & self-reset UX, primary navigation shell, accounts overview & balances. |
| **02** | 12 – 16 Oct | **GCB Pay, Transfers & Wallets** | Interbank transfers (GIP, ACH, NRT, Express), mobile wallets (MTN, Telecel, AirtelTigo, GhanaPay), beneficiary hub & name verification. |
| **03** | 19 – 23 Oct | **Cards, Everyday Services & Receipts** | Card Center (virtual, prepaid, debit), cardless withdrawal tokens, bill payments, airtime/data, unified receipt standard. |
| **04** | 26 – 30 Oct | **Wealth, Servicing & Retail Wrap** | Term deposits, in-house investments, loans overview/advances, retail profile settings, spend insights (*My Spends*). **Retail Design Sign-Off.** |
| **05** | 02 – 06 Nov | **Corporate Foundation & Navigation** | Subsidiary & multi-company structure, mandate definition, role-based visibility, corporate account dashboards & FX accounts. |
| **06** | 09 – 13 Nov | **Bulk Payments & Approvals Engine** | Mixed-rail bulk payment upload & validation, maker-checker authorization queues, companion **Corporate Approval Mobile App** flows. |
| **07** | 16 – 20 Nov | **Host-to-Host & Bank Administration** | Host-to-host ERP batch processing & reconciliation, Ghana.gov/SSNIT, bank-side corporate onboarding portal, fee concession setup. |
| **08** | 23 – 27 Nov | **Cross-Platform Freeze & Design QA** | 5-state list audit (loaded, empty, filtered, error, loading), microcopy refinement, prototype validation, **Complete Design Freeze & Dev Handoff**. |
| **09** | 30 Nov – 04 Dec | **UAT Testing Support & UX Triage** | Embedded design support for business UAT, defect triage, UI inconsistency fixes, validation of edge cases with QA & stakeholders. |
| **10** | 07 Dec – 11 Dec | **Design System Add-ons (Consolidation)** | Harvesting net-new web components into the central Figma library: multi-user tables, batch builders, approval steppers, tabular data tokens. |
| **11** | 14 – 18 Dec | **Go-Live Support & DS Handoff** | **Target Production Go-Live (15 Dec)**. Delivery of completed Design System Add-ons package, asset specs, and cross-channel documentation. |

*(15 – 24 Dec: Post-launch design hypercare, monitoring, and transition to BAU).*

---

## 4. Parallel Team Workstreams

To guarantee speed without bottlenecking complex requirements, the team executes in parallel streams:

| Phase | Designer 1 (Retail & Shared Experience) | Designer 2 (Corporate, Integration & Admin) |
|---|---|---|
| **Weeks 1–2** | Onboarding, Account details, GCB Pay, and Wallet rails | Corporate requirements discovery, mandate model, and role IA |
| **Weeks 3–4** | Card Center, Bill payments, Investments, and Loans | Corporate navigation shell, multi-company trees, and account views |
| **Weeks 5–6** | Retail final review, edge states, and developer support | Mixed-rail bulk payments, approval queues, and mobile approval app |
| **Weeks 7–8** | Prototype consistency checks and multi-state audits | Host-to-host workflows, internal admin portal, and fee setup |
| **Weeks 9–10** | **Joint Focus:** UAT defect triage, business feedback fixes, and interactive flow validation | **Joint Focus:** UAT approvals/bulk testing support and corporate edge-case resolution |
| **Weeks 10–11** | **Design System:** Consumer components, forms, and receipt tokens | **Design System:** Corporate data tables, batch uploaders, and system specs |

---

## 5. December Priorities: UAT & Design System Add-ons

December shifts focus from net-new screen authoring to execution quality and long-term asset value:

### 1. Active UAT Testing Support (Weeks 9–10)
- **Direct QA Collaboration:** Daily triage with QA leads and business analysts to review user testing feedback.
- **Rapid Design Iteration:** Immediate resolution of usability friction, missing boundary states (e.g. timeout, limit breach, partial upload failures), and responsive layout bugs.
- **Fidelity Assurance:** Verification that front-end builds match approved design tokens, spacing scales, and accessibility criteria.

### 2. Design System Add-ons & Asset Harvesting (Weeks 10–11)
The Internet Banking project produces numerous high-value components and patterns that expand the bank’s digital asset base. In December, these are formally ingested into the enterprise design system:
- **Component Add-ons:** Reusable multi-rail uploaders, approval timeline steppers, advanced data tables, and transactional receipt sheets.
- **Tokens & Primitives:** Tabular numeral patterns, responsive data grids, status indicators, and multilingual layout wrappers (English/French/Chinese).
- **Asset Packaging:** Centralized iconography, illustrations, and export-ready assets documented in Figma for adoption by the mobile revamp and future digital channels.

---

## 6. Key Governance Checkpoints

| Checkpoint | Target Date | Review Scope & Criteria |
|---|---|---|
| **Gate 1: Retail Core** | 23 Oct 2026 | Sign-off on Onboarding, Dashboard, Accounts, and Retail Payments. |
| **Gate 2: Corporate Core** | 13 Nov 2026 | Sign-off on Mandates, Approvals, Bulk Payments, and Mobile Approval App. |
| **Gate 3: Full Scope Freeze** | 27 Nov 2026 | Complete Figma delivery across all journeys, ready for formal UAT entry. |
| **Gate 4: UAT Design Sign-off** | 04 Dec 2026 | All design-related UAT feedback and defect tickets resolved. |
| **Gate 5: Design System Release** | 11 Dec 2026 | Design System Add-ons documented and published to central library. |
| **Gate 6: Production Go-Live** | 15 Dec 2026 | Final production release and design smoke-test verification. |

---

## 7. Success Factors & Risk Mitigations

- **Unclear Business Rules:** *Mitigation:* Corporate business rules (limits, mandates, host-to-host specs) are tackled in October/early November so no decisions stall December UAT.
- **Scope Creep:** *Mitigation:* Any feature request outside the agreed Phase 1 BRD is routed to the Phase 2 backlog.
- **UAT Bottlenecks:** *Mitigation:* Dedicated design capacity in Weeks 9–10 prevents design fixes from blocking release sign-off.
- **Cross-Channel Consistency:** *Mitigation:* Documenting Design System Add-ons in December ensures zero rework for the upcoming 2027 mobile revamp.
