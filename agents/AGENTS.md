# NIBS: start here

Every agent reads this file first: Claude Code, Codex, Antigravity, Cursor, or anything else.
It explains where project memory lives, which file wins when they disagree, and how to keep
memory current without bloating it.

## What this project is

NIBS (New Internet Banking Solution) is GCB Bank PLC's replacement internet-banking platform
for Ghana. This repo is the **live design prototype**: Next.js 15 (App Router), React 19,
TypeScript, Tailwind CSS v4 and Base UI, running on mock data with no real backend. Screens are
explored, tested and refined here before the production system is built. Product context is in
[PRODUCT.md](PRODUCT.md).

## Where memory lives

Memory lives in this folder and nowhere else. If something matters, it goes in these files.
It must not live only in a chat, an agent's private memory, or one tool's config.

| File | What it holds | How often it changes |
|---|---|---|
| [AGENTS.md](AGENTS.md) | How to work here (this file) | Rarely |
| [CONSTITUTION.md](CONSTITUTION.md) | Permanent design, product and engineering rules | Rarely, and deliberately |
| [PRODUCT.md](PRODUCT.md) | What the product is, who it serves, entities, journeys, business rules, scope | When knowledge is confirmed |
| [PATTERNS.md](PATTERNS.md) | Reusable solutions and the code that implements them | When a solution repeats |
| [WORKING_LOG.md](WORKING_LOG.md) | Inbox: discoveries, decisions in flight, open questions, known gaps | Every working session |

- **Tool entry points** (`/CLAUDE.md`, `/AGENTS.md`, `/.cursorrules`) only point here. Never put rules in them.
- **Reference documents are inputs, not memory.** These are the BRD and screen spec (`src/lib/*.docx`),
  `DESIGN-TIMELINE.md` (the Figma plan), `DESIGN-PLAN.md` (written before decision D1 and partly
  outdated), `docs/STATES.md` (the illustration brief) and `phase-1-features-readiness.*`.
  What they establish has been pulled into PRODUCT.md.
- **`docs/archive/`** holds the memory files this system replaced (`.ai/*`, `DESIGN-LANGUAGE.md`).
  They are history only. Never read them as current.

## Reading order

Before any non-trivial change:

1. **CONSTITUTION.md**: always.
2. **PATTERNS.md**: before building a screen, flow or component. Use the pattern if one exists.
3. **PRODUCT.md**: before touching a journey or domain object you haven't worked on this session.
4. **WORKING_LOG.md**: scan the open questions and known gaps for the area you're touching.
5. **The reference implementation** a pattern points to. Copy its structure rather than inventing one.

For a typo or a one-line fix, CONSTITUTION.md is enough.

## Authority: which source wins

1. The user's explicit instruction in the current session
2. CONSTITUTION.md
3. PRODUCT.md (items marked confirmed or decided)
4. PATTERNS.md
5. Existing code
6. WORKING_LOG.md (provisional)
7. Reference documents, then the archive

Don't apply this list blindly:

- **A new request that conflicts with a rule:** say so, name the rule, and resolve it deliberately with
  the user. If they override it, log an `Override` in WORKING_LOG. If the override should become
  permanent, propose the constitution change rather than making it silently.
- **Code that contradicts memory about a fact** (a token value, a file path, a component name): the code
  is right. Fix the memory file.
- **Code that breaks a rule:** either the code is a bug or the rule is stale. Flag it. Don't quietly
  copy the violation.
- **A team decision that contradicts the BRD** (for example D1, Personal and Business as separate
  views): the decision wins inside this prototype. The conflict stays an open question in
  WORKING_LOG until the bank confirms it.

## Before you build: the consistency check

Answer these to yourself before creating any screen or feature:

- Does an existing pattern already solve this? Does this interaction exist elsewhere in the app?
- Can an existing component be reused or extended rather than duplicated?
- Does this contradict a rule in CONSTITUTION.md?
- Does it introduce a new visual language? Novelty that only looks attractive is not a reason.
- Is this being designed in isolation? Trace the whole lifecycle: creation, management, and use mid-flow.
- Where else would this capability be useful? Record it, but don't build it unasked.

Product coherence beats novelty. Make the smallest addition to the system that does the job.

## Working with the designer

The designer and product owner on this project is Ransford Gyasi.

- **Never run `npm run build` or start a dev server** (`npm run dev`, browser preview tools) unless asked.
  Ransford keeps a dev server running, and `next build` writes into the same `.next` folder, which
  breaks it. Verify with `npx tsc --noEmit` and `npx eslint <changed paths> --max-warnings=0`. Then say
  which checks ran and that the change was not viewed in a browser. Ignore stale `.next/types` errors
  for deleted routes; the dev server regenerates them.
- **Think holistically.** Build every feature as if the app were made for one specific customer. Extend
  the experience around the ask (what would they want to filter, compare or understand next?). Cut
  redundant UI rather than shipping it. Don't silently expand into unrelated areas.
- **Keep notes short and plain.** Dense logs and all-caps headers are disliked. Write what changed, why,
  and what's still open, in a few lines.
- **Don't commit, push or open PRs unless asked.**

## Per-task workflow

1. **Read** (see the reading order above), then run the consistency check.
2. **Build** using existing patterns, tokens and components.
3. **Gap review (standing rule).** Features built at different times drift apart. After adding or
   changing any capability (a source of funds, a payee type, an account type, a persona, a device
   state):
   - List every flow that creates, reads or acts on that kind of thing: Send & Pay rails, top-ups,
     standing orders, dashboard pickers, onboarding, Settings, the Demo hub. Check that each one uses
     it, or record why it deliberately doesn't.
   - Check the "for myself" paths. Wallets, airtime and data, cardless and own accounts must list
     *all* of the customer's own destinations, not only the registered default.
   - Check that status is honest. Ticks, "verified", "confirmed" and badges must reflect real state,
     never decorate.
   - Check every persona and state: single, multi, joint and business; new, returning and migrated;
     trusted and new device; empty, loading and error.
   - Fix what's in scope. Log the rest as `Gap` in WORKING_LOG and **say them in your reply**.
4. **Verify** with tsc and eslint (see above).
5. **Record** anything that passes the memory test (next section) in WORKING_LOG.
6. **Reply** with what changed, which checks ran, and the gaps you found.

## The memory test

Record something only if, without it, a competent designer or developer would make the **wrong
decision**.

Don't record:

- individual code changes (git has them)
- conversations
- spacing nudges
- experiments that failed with no lesson for later
- anything obvious from reading the code

## Writing to WORKING_LOG

Append under today's date heading in the *Inbox* section, creating the heading if needed. Use one
label per item: `Decision` · `Discovery` · `Question` · `Gap` · `Reuse` · `Candidate pattern` ·
`Conflict` · `Override`. Keep each item to one to four lines, and name files or routes when they help.
Speed matters more than tidiness here, so don't reorganise the log while working. When you resolve an
open question or gap, delete it or tick it, and promote the outcome if it passes the memory test.

## Consolidation (`/consolidate-memory`)

Run this when the user asks ("consolidate memory", `/consolidate-memory`) or when the log's inbox goes
past roughly 300 lines.

1. Read all five files.
2. Classify every WORKING_LOG item as one of:
   - temporary: delete it
   - already documented: delete it
   - product knowledge: move it to PRODUCT.md
   - a permanent rule: move it to CONSTITUTION.md
   - a reusable solution: move it to PATTERNS.md
   - still unresolved: leave it in the log
3. Look for duplicates and contradictions across all five files, not just the log.
4. Promote by **rewriting the relevant section**, not by appending. Permanent files should stay smaller
   and denser than the log.
5. **Never silently change an established rule.** Any promotion that alters or removes a rule goes in
   the report with its reason.
6. Remove the promoted items from the log. Open questions and gaps stay.
7. Add one line to *Consolidation history* at the bottom of WORKING_LOG: the date and what moved where.
8. Report what was promoted, which rules changed and why, which contradictions were found, and what
   is still open.

To keep this safe and reversible, run it on a clean git tree, or tell the user which files changed so
they can review the diff. Git is the undo.

## Bootstrapping from a BRD

When given a BRD, whether a new version for this project or the first one for a new project using this
system, do the extraction yourself. Don't ask the user to fill anything in.

1. Read the entire BRD, plus any specs that come with it.
2. Extract the product context, actors, entities, journeys, features, business rules, terminology,
   constraints, assumptions, explicit design requirements, unresolved questions, and anything missing.
3. Populate the files:
   - PRODUCT.md: confirmed product knowledge
   - CONSTITUTION.md: only explicit or strongly established design principles
   - PATTERNS.md: only patterns the BRD actually supports
   - WORKING_LOG.md: assumptions, ambiguities, open questions and things that need design exploration
   - AGENTS.md: project-specific instructions
4. Label every claim `[CONFIRMED]`, `[DECIDED]` (a team decision), `[ASSUMPTION]`, `[UNKNOWN]` or
   `[OPEN QUESTION]`. Cite requirement IDs (`FR-07`, `NFR-03`). **Never fabricate.** A gap stays a gap.
5. **For a new version of an existing BRD,** diff it against PRODUCT.md. Changed requirements go to
   WORKING_LOG as `Conflict` items first. Never overwrite PRODUCT.md silently.

## Design and code workflow

The flow is: idea → explore in Figma or in code → test in the live prototype → evaluate the interaction,
how it scales, and whether it fits the rest of the app → refine → implement → capture what was learned →
consolidate.

- The prototype is a real design environment. Figma is not the only source of truth.
- Keep the prototype from drifting, though:
  - Explorations live behind Dev Mode switches (layout variants, look toggles) until one is chosen.
  - Then delete the others. Track the cleanup in WORKING_LOG until it's done.
- When implementing from Figma, follow the frame. If it conflicts with the constitution (for example,
  Material icons versus Lucide only), the constitution wins. Note the deviation in your reply.
- After shipping a capability, record where else it could be reused as a `Reuse` item. Don't build
  speculative reuse without the user.

## Commands

```bash
npx tsc --noEmit                       # type check (always)
npx eslint . --max-warnings=0          # lint, kept at zero (or pass the changed paths)
npx tsx scripts/i18n-coverage.mts      # after adding or changing any customer-facing copy
npm run dev                            # the designer runs this, not agents
npm run build                          # only when explicitly asked
```

## Repo map (only the non-obvious parts)

- `src/app/(customer)/` is the customer shell and `src/app/admin/` is the bank's internal portal. They share nothing but `/login` and `/mfa`.
- Onboarding and auth routes sit outside both shells: `/signup`, `/activate`, `/migrate`, `/forgot-password`, `/get-started`, `/card-verification`.
- `src/lib/navigation.ts` builds the nav for each actor (`getNavigation`). Its icons map in `components/layout/Sidebar.tsx` (`ICON_MAP`).
- `src/lib/mock-data.ts` holds the demo personas, accounts, ledger and standing orders.
- `src/components/payments/PaymentFlow.tsx` is the single payment state machine for Send & Pay.
- `src/components/states/` holds list states, route skeletons and the Dev Mode state tools.
- `src/lib/demo-tools.ts` (`SHOW_DEMO_TOOLS`) keeps prototype scaffolding out of production builds.
- `prototype/`, `.design/` and `account-details-prototypes.html` are older HTML explorations. They use the old persona names.
- `.claude/skills/` and `.agents/skills/` hold mirrored agent skills (animation, design, `consolidate-memory`).
