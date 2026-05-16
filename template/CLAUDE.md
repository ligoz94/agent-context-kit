# Claude — agent-context-kit

Instructions for Claude (Claude Code, Desktop, or any agent with access to this repo and optional MCP).

**MANDATORY FIRST ACTION — DO NOT SKIP:**
Call `get_session_bootstrap()` immediately.
This loads project identity, context policy, architecture, glossary, and active gates.
Do nothing else — no code, no answers, no questions — until you've called it.

If `get_session_bootstrap` is not available (no Toolshed MCP), manually read in order:
`docs/README.md` → `docs/agent/values.md` → `docs/agent/context-policy.md` → `docs/agent/app-config.md`.

Keep this file **small and imperative**: session routing and non-negotiables only. Push long conventions into **`docs/human/`** (and path-scoped **`.cursor/rules`** if you use them), and project facts into **Toolshed** / `docs/agent/`. Teams often aim for a **few hundred tokens** of always-on root text so the rest of the window stays available for code and tool output. In **Cursor**, also follow **`.cursor/rules/agent-context-kit.mdc`** and **`docs/human/agent-context-power-user-stack.md`** (*Cursor alignment*).

## Toolshed MCP (when enabled)

If the **Toolshed** server is configured for this project (`manifest.yaml` at the project root), use the MCP tools as the primary way to pull context:

| When | Tool |
|------|------|
| Session start / orientation | `get_project_identity`, **`get_guardrails`**, **`get_session_bootstrap`** |
| After packages update | `get_prompt("review-sync")` — check new features and decide what to enable |
| Before coding or review | `get_rules` (optionally `standard`: e.g. `testing`) |
| Feature work | `list_registry` → `get_spec` with `name` — lazy L2, not all specs |
| Spec / plan review | `review_spec`, `review_plan` |
| Naming / domain terms | `lookup_glossary` |
| Prompt files | `list_prompts`, `get_prompt` |
| Avoid repeating past mistakes | `get_learnings` |
| Find text across docs | `search_context` |
| Sanity-check paths | `validate_context` |
| Debugging | `start_debugging` (use after `finish_work` fails) |
| Gate chain | `check_gate` → `advance_gate` |
| Task handoff | `dispatch_subagent` (produces structured prompt for sub-agent) |
| Finish work | `finish_work` (run before push/PR) |
| Rule testing | `test_rule` (validate custom rules against examples) |

**Write tools** (only when the user wants the repo updated): `add_learning`, `add_glossary_term`, `update_feature_status`.

**Safety / verification**: use `request_human_approval` when guardrails say so; use `verify_action` after critical changes (pass check type `"tdd_compliance"` to verify test-first ordering).

Do **not** fetch every feature spec; only the one needed for the current task.

## Without MCP

Start from **`docs/README.md`** — it has the numbered reading order, task→prompt table, and feature register.
Minimum L0: `docs/agent/values.md` → `docs/agent/app-config.md` → `docs/README.md` (feature register + pick prompt).
Then open **one** feature file under `docs/features/` for the area you’re working in. If `manifest.yaml` defines `guardrails`, read that section manually.

## Source of truth

- **`manifest.yaml`** — paths, registry, prompts, `toolshed` options (`tool_aliases`), optional `guardrails` and `profiles`
- **L0** — identity files; **L1** — `context-policy.md` + human standards from `rules.standards`; **L2** — learnings, feature specs, prompts, optional knowledge directories

## Tone

Follow the loading and token rules in `docs/agent/context-policy.md`. Ask one focused question if the task is ambiguous.
