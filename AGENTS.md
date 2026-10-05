# NIBS: agent entry point

All project memory lives in [`agents/`](agents/AGENTS.md). Every agent shares it: Codex,
Antigravity, Claude Code, Cursor and any other.

Before doing anything:

1. Read **`agents/AGENTS.md`**. It covers how to work here, which file wins when sources disagree, and
   how to record what you learn.
2. Read **`agents/CONSTITUTION.md`** before any change. It holds the permanent design, product and
   engineering rules.
3. Follow the reading order in `agents/AGENTS.md` for patterns (`PATTERNS.md`), product context
   (`PRODUCT.md`) and open items (`WORKING_LOG.md`).

Don't add rules to this file; it only points to `agents/`. Record discoveries in
`agents/WORKING_LOG.md`.
