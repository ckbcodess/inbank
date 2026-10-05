# Archive: superseded memory files (2026-10-03)

These files were the project's agent memory before [`agents/`](../../agents/AGENTS.md) replaced them.
They are kept verbatim as a record. **They are not current. Agents must not read them as rules.**
Everything still true moved into `agents/`, and every open item moved into `agents/WORKING_LOG.md`.

| File | What it was | Where its content went |
|---|---|---|
| `INTERFACE.md` | Design system and tokens | CONSTITUTION.md §3–9, PATTERNS.md |
| `LEARNINGS.md` | Framework quirks and invariants | CONSTITUTION.md §10, PATTERNS.md (engineering notes) |
| `EXECUTION.md` | Task tracker plus the full change log, Aug–Oct 2026 | Open items → WORKING_LOG.md; decisions → PRODUCT.md and CONSTITUTION.md. The history stays here and in git |
| `DESIGN-LANGUAGE.md` | A design brief to paste into prompts | CONSTITUTION.md and PATTERNS.md. Paste CONSTITUTION.md instead |
| `CLAUDE.old.md`, `AGENTS.root.old.md`, `cursorrules.old.txt` | The old tool entry points, renamed so tools don't auto-load them | `agents/` (the live entry points now only point there) |

Some rules in these files contradict each other. The resolutions are listed in `agents/WORKING_LOG.md`
under 2026-10-03.

This folder is safe to delete once the move is committed, because git keeps the history.
