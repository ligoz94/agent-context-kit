# Architecture Decision Records (ADRs)

Use this folder for **decisions** that should outlive chat and PR descriptions: tradeoffs, rejected options, and where the implementation lives.

## Conventions

- **`_template.md`** — duplicate and rename to `NNN-short-title.md` (e.g. `001-use-postgres-for-events.md`). Do not treat `_template` as a real ADR.
- **Numbering** — sequential `NNN` prefix keeps history and cross-links stable (`Superseded by ADR-012`).
- **Status** — keep the header honest: move to `Deprecated` or `Superseded` when the decision changes; add a short note at the top pointing to the replacing ADR.

## Relationship to agent-context-kit

ADRs are **human-first** documentation. They are not loaded by the Toolshed MCP server unless you add paths under `rules.standards` or reference them from `key-learnings.md` / feature specs. Link ADRs from `architecture-primer.md` when they define system-wide boundaries agents must respect.
