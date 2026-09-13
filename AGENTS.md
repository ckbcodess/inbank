# NIBS MVP — Antigravity Agent Instructions & Design Principles

This file is automatically loaded by Antigravity in every session and chat within this project. Follow these non-negotiable design principles, architectural rules, and development standards.

---

## 1. UI & Design Intent: Clean, Minimal & Restrained

### A. "It Communicates Enough" — Eliminate Redundant Labels & Containers
- **Let the data speak for itself**: If a string or number format already communicates its meaning clearly (e.g., `1 USD = 11.4200 GHS`), **never** add an `"Exchange rate"` label, subtitle, or info icon next to it.
- **Stop over-boxing**: Not every piece of text needs an enclosing card, pill, border, or background fill. Strip the container and let the typography breathe.
- **Rule of thumb**: If a user immediately understands what a piece of text or data means without a label, delete the label and delete the container box.

### B. True Restraint Over "AI Decoration"
- **"Interesting" does not mean more elements**: When asked to make a screen or component look better, more modern, or more interesting, **NEVER** add:
  - Ambient gradient glow flares, radial blurs, or colored backdrop blobs.
  - Redundant preset amount chips (`100`, `500`, `1,000`) unless explicitly requested.
  - Multi-box secondary analytics grids (e.g., Day Change, Spread, Inverse Rate).
  - Status badges that state the obvious (e.g., `"Today's fixing"`, `"Live"`, `"Active"`).
- **Where visual quality actually comes from**: Generous whitespace, disciplined alignment, natural proportions, and fluid motion.

### C. Natural Container Alignment (No Artificial Shrink-Wrapping)
- **Fill the container**: Components should naturally stretch to `w-full` and align with sibling cards and tables on the page.
- **Avoid arbitrary constraints**: Do not wrap functional components in arbitrary narrow boxes (`max-w-sm`, `max-w-lg`) unless the design is a dedicated single-column modal or auth flow.

### D. Generous Breathing Room & Tactile Hit Targets
- **Spacious over cramped**: Connected input fields must have distinct vertical separation. Never cram inputs so close that they touch or feel merged.
- **Comfortable touch targets**: Interactive nodes (swap buttons, toggles, icon triggers) must be comfortably sized (`size-10` / 40px minimum) with clear, weighted icons (`18px–20px`) that feel confident and tactile to click or tap.

### E. Defensive Interaction Over Error Validation
- **Prevent mistakes before they happen**: If a selection is invalid in another context (e.g., selecting the same currency in both "From" and "To"), **filter it out of the dropdown** so the user cannot select it in the first place.
- **Zero error states when avoidable**: Good UX eliminates the possibility of invalid input rather than relying on red error messages.

### F. Kinetic Polish Over Static Ornaments
- **Animate the data, not the decorations**: Polish comes from micro-interactions that respond directly to user input:
  - Live thousands-formatting as the user types (`formatValueForDisplay` from `numora`).
  - Smooth digit-morphing transitions (`TextMorph` from `torph/react` with spring easing `stiffness: 400, damping: 30`) when values change.
  - Tabular numbers (`tabular-nums .numorainput`) to prevent layout jumpiness.

---

## 2. Core Architectural & Codebase Standards

- **Semantic Tokens Only**: Never use raw hex colors or arbitrary utility colors. Use semantic tokens: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`.
- **Strict Zero-Bold Rule**: `globals.css` caps font weights (`font-weight: inherit`). Use size, letter-spacing (`tracking-[-0.01em]`), and whitespace for hierarchy — never `font-bold` or `font-semibold`.
- **Dual-Shell Firewall**: `(customer)` and `admin` shells share ONLY `/login` and `/mfa`. Never cross-import components between them.
- **Float-Safe Financial Math**: Never use raw JS `+` or `*` on money. Always use `roundMoney()`, `sumMoney()`, or `multiplyMoney()` from `@/lib/money`.
- **Base UI Buttons**: For navigation buttons, use `<Button nativeButton={false} render={<Link href="..." />}>` — never wrap `<Button>` inside `<Link>`.

---

## 3. Verification Commands

Always verify changes with the project type checker before completing tasks:
```bash
npx tsc --noEmit
```
