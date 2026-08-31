# NIBS MVP — Agent & Developer Instructions

## Repository Overview
NIBS (New Internet Banking Solution) is a Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 banking application prototype. It features a strict dual-shell architecture separating customer-facing flows from internal bank administration.

---

## Commands & Development Workflow

```bash
# Development (Turbopack)
npm run dev

# Type Checking
npx tsc --noEmit

# Linting
npx eslint . --max-warnings=0

# Production Build
npm run build
```

---

## AI Context & Architecture Protocol

Before making changes or implementing new screens, load and follow our persistent context files:

### 1. UI & Design System ([`.ai/INTERFACE.md`](file:///.ai/INTERFACE.md))
- **Semantic Tokens Only**: Never use raw colors or ad-hoc hex codes (e.g. `bg-gray-100`, `#2a78d6`). Always use tokens (`bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `var(--active-bg)`, `var(--active-border)`).
- **Strict Zero-Bold Rule**: `globals.css` caps font weights (`font-weight: inherit`). Use size, letter-spacing (`tracking-[-0.01em]`), and whitespace for hierarchy — never `font-bold` or `font-semibold`.
- **Strict Minimalism by Default (Anti-Fluff & Zero-Redundancy)**: Always choose the most minimal, straightforward design thinking. Never reintroduce redundant descriptor subtitles, paragraph fluff under self-explanatory buttons/cards, or nested border clutter.
- **Zero Repeated Selectors / No Duplicate Functional Controls**: If a choice or parameter was already selected on a leading screen (e.g., choosing "To Bank" on the selection hub), **NEVER** re-render a dropdown or selector on the next screen to change what was just chosen. Trust the prior decision; use a simple back button (`< Back`) to return if needed.
- **Automatic Resolution Over Manual Entry**: Never render manual inputs for information the banking directory or system can automatically fetch (e.g., recipient names are auto-resolved from account numbers).
- **Mandatory Pre-Ship Distillation Audit**: Before shipping any screen or flow, trace the flow end-to-end and ruthlessly eliminate all duplicate controls, redundant options, and unearned fields.
- **Mandatory Tabular Numbers**: All numbers, currency amounts, dates, and reference codes must have the `.tabular` class.
- **Lucide Icons Only**: Use `size={15}` to `{18}` and `strokeWidth={1.7}` to `{1.9}`.
- **Radius System**: Panels are `rounded-2xl`, insets are `rounded-xl`, controls and tiles are `rounded-lg`.
- **Mobile-Aligned Action Hub Cards**: 2-column grid (`gap-4`), `rounded-[16px]`, with dedicated `surface/on-card` fills (`#f6f6f5` light / `#1e1e1e` dark) and amber badge accents.
- **Standard Page Skeleton**: Root container with `flex flex-col gap-5`, `<PageHeader>`, `<StateSwitcher>`, and content panel `rounded-2xl border border-border bg-card`.
- **5 Mandatory List States**: Always import and handle `ListSkeleton`, `TrueEmptyState`, `FilteredEmptyState`, `ListErrorState`, and `PartialLoadFooter` from `@/components/states/ListStates`.

### 2. Learnings & Architectural Invariants ([`.ai/LEARNINGS.md`](file:///.ai/LEARNINGS.md))
- **Dual-Shell Firewall**: `(customer)` and `admin` shells share ONLY `/login` and `/mfa`. Never cross-import components between them.
- **Zustand Hydration Protection**: Use `useSessionHydrated()` from `@/lib/session-store` before evaluating `actor === null` to prevent false redirects to `/login`.
- **Float-Safe Financial Math**: Never use raw JS `+` or `*` on money. Always use `roundMoney()`, `sumMoney()`, or `multiplyMoney()` from `@/lib/money`.
- **Dynamic Role Navigation**: Sidebar items must be registered in `src/lib/navigation.ts` (`NAV_ITEMS` and `ICON_MAP`) — never hardcode links in shell layouts.
- **Base UI Buttons**: For navigation buttons, use `<Button nativeButton={false} render={<Link href="..." />}>` — never wrap `<Button>` inside `<Link>`.

### 3. Task Execution & Decision Logging ([`.ai/EXECUTION.md`](file:///.ai/EXECUTION.md))
- Check [`.ai/EXECUTION.md`](file:///.ai/EXECUTION.md) at the beginning of each session to align on the current milestone and open tasks.
- Keep [`.ai/EXECUTION.md`](file:///.ai/EXECUTION.md) updated with completed checklist items, architectural decisions, and next steps before concluding any work session.
- Append any new framework quirks, API constraints, or gotchas discovered during development directly into [`.ai/LEARNINGS.md`](file:///.ai/LEARNINGS.md).
