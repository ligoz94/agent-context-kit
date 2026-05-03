# Human docs

Guides written primarily for **people** on the team: how you test, review, release, and work day to day. They complement `docs/agent/`, which is tuned for machines and agents.

## How agents use this folder

Paths listed under `rules.standards` in `manifest.yaml` (for example `docs/human/testing.md`) are returned by the Toolshed `get_rules` tool when agents need your standards alongside `context-policy.md`.

## Conventions

- Prefer clear prose and examples over terse bullet-only pages.
- Keep agent-specific “always do X” rules in `docs/agent/context-policy.md` or `values.md` if they must be loaded every time; use this folder for deeper, optional context.

## Files in this template

- **`toolshed-mcp-setup.md`** — how to register `@agent-context-kit/toolshed-server` in Cursor, Claude Desktop, and related clients (`cwd`, `--manifest`, `--profile`, aliases, troubleshooting).
- **`agent-context-power-user-stack.md`** — layered stack (short root memory, path rules, Plan mode, few MCPs, hooks, worktrees) with a **Cursor-first** table and `.mdc` `globs` example; Claude Code maps to `.claude/` where relevant.

## Related

- Machine-oriented rules: `docs/agent/context-policy.md`
- Manifest: `manifest.yaml`
- ADR template: `docs/decisions/`
