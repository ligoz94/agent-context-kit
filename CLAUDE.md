# Claude — agent-context-kit

Instructions for Claude (Claude Code, Desktop, or any agent with access to this repo and optional MCP).

Keep this file **small and imperative**: session routing and non-negotiables only. Push long conventions into **`docs/human/`** (and path-scoped **`.cursor/rules`** if you use them), and project facts into **Toolshed** / `docs/agent/`. Teams often aim for a **few hundred tokens** of always-on root text so the rest of the window stays available for code and tool output. In **Cursor**, follow **`.cursor/rules/agent-context-kit.mdc`** and **`template/docs/human/agent-context-power-user-stack.md`** (*Cursor alignment*).

## Toolshed MCP (when enabled)

If the **Toolshed** server is configured for this project (`manifest.yaml` at the project root), use the MCP tools as the primary way to pull context:

| When | Tool |
|------|------|
| Session start / orientation | `get_project_identity`, **`get_guardrails`** |
| Before coding or review | `get_rules` (optionally `standard`: e.g. `testing`) |
| Feature work | `list_registry` → `get_spec` with `name` — lazy L2, not all specs |
| Naming / domain terms | `lookup_glossary` |
| Prompt files | `list_prompts`, `get_prompt` |
| Avoid repeating past mistakes | `get_learnings` |
| Find text across docs | `search_context` |
| Sanity-check paths | `validate_context` |

**Write tools** (only when the user wants the repo updated): `add_learning`, `add_glossary_term`, `update_feature_status`.

**Safety / verification**: use `request_human_approval` when guardrails say so; use `verify_action` after critical changes when appropriate.

Do **not** fetch every feature spec; only the one needed for the current task.

## Without MCP

Read in this order: `docs/agent/values.md`, `docs/agent/architecture-primer.md`, `docs/agent/glossary.md`, then `docs/agent/context-policy.md`, then `docs/agent/key-learnings.md` when relevant. Open **one** feature file under `docs/features/` when working on that feature. If `manifest.yaml` defines `guardrails`, read that section manually.

## Source of truth

- **`manifest.yaml`** — paths, registry, prompts, `toolshed` options (`tool_aliases`), optional `guardrails` and `profiles`
- **L0** — identity files; **L1** — `context-policy.md` + human standards from `rules.standards`; **L2** — learnings, feature specs, prompts, optional knowledge directories

## Tone

Follow the loading and token rules in `docs/agent/context-policy.md`. Ask one focused question if the task is ambiguous.
