# Claude — agent-context-kit

Instructions for Claude (Claude Code, Desktop, or any agent with access to this repo and optional MCP).

## Toolshed MCP (when enabled)

If the **Toolshed** server is configured for this project (`manifest.yaml` at the project root), use the MCP tools as the primary way to pull context:

| When | Tool |
|------|------|
| Session start / orientation | `get_project_identity` |
| Before coding or review | `get_rules` (optionally `standard`: e.g. `testing`) |
| Feature work | `list_registry` → `get_spec` with `name` — lazy L2, not all specs |
| Naming / domain terms | `lookup_glossary` |
| Prompt files | `list_prompts`, `get_prompt` |
| Avoid repeating past mistakes | `get_learnings` |

Do **not** fetch every feature spec; only the one needed for the current task.

## Without MCP

Read in this order: `docs/agent/values.md`, `docs/agent/architecture-primer.md`, `docs/agent/glossary.md`, then `docs/agent/context-policy.md`, then `docs/agent/key-learnings.md` when relevant. Open **one** feature file under `docs/features/` when working on that feature.

## Source of truth

- **`manifest.yaml`** — paths and Toolshed options (including `tool_aliases` if tools collide with other MCP servers).
- **L0** — identity files; **L1** — `context-policy.md` + human standards in `manifest.yaml` → `rules.standards`; **L2** — learnings, feature specs, prompts.

## Tone

Follow the loading and token rules in `docs/agent/context-policy.md`. Ask one focused question if the task is ambiguous.
