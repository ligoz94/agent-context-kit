# Power-user agent stack (and how agent-context-kit maps to it)

This page relates a **layered agent setup** (short root memory, path rules, plan mode, isolated review, repeatable workflows, hooks, a small MCP set, worktrees) to **agent-context-kit**. **Cursor is a first-class target:** use the [Cursor alignment](#cursor-alignment) section with [`.cursor/rules/`](../../.cursor/rules/) and Cursor’s MCP, Plan mode, and Hooks. Claude Code maps the same ideas to `.claude/` and its own settings.

## Cursor alignment

| Power-user idea | What you do in **Cursor** |
|-----------------|---------------------------|
| Short always-on memory | Keep **[`CLAUDE.md`](../../CLAUDE.md)** (and optional `AGENTS.md`) **small and imperative**. Put depth in **`docs/human/`** and Toolshed, not in an ever-growing catch-all rule file. |
| Path-scoped rules (low ambient cost) | Add **`.cursor/rules/*.mdc`**. Use frontmatter **`globs`** (e.g. `globs: src/api/**/*.ts`) and **`alwaysApply: false`** so the rule applies when those paths are in play, not every chat. Keep **`alwaysApply: true`** for repo-wide workflow rules (e.g. this kit’s Toolshed rule). |
| Plan before risky edits | Use **[Plan mode](https://www.cursor.com/docs/agent/modes)** (Shift+Tab in the agent input, or the mode picker), or Ask mode for exploration-only; pair with [`context-policy.md`](../agent/context-policy.md) for L1/L2 loading. |
| Few MCP servers | **Cursor Settings → MCP**: enable **Toolshed** plus only servers you need. Each server adds tool schemas to context — same trade-off as “many MCPs” in any client. |
| Repeatable workflows | **Repo**: `docs/agent/prompts/` + Toolshed `get_prompt` / slash commands. **Cursor**: [Agent Skills](https://docs.cursor.com/context/skills) for personal or cross-repo shortcuts. |
| Deterministic gates | **Manifest** `guardrails` + Toolshed. **Cursor**: [Hooks](https://docs.cursor.com/agent/hooks) — **`.cursor/hooks.json`** at repo root and scripts under **`.cursor/hooks/`**. **`context-kit init`** creates a valid **`hooks.json`** with an empty `hooks` object plus **`hooks/README.md`**; add events when you are ready. |
| Parallel / isolated git work | **Git worktrees** + [`checkout-pr.md`](../agent/prompts/checkout-pr.md); separate Cursor windows per worktree if you want. |
| Isolated “reviewer” pass | Cursor has no `.claude/agents/*.md`. Use a **fresh chat**, **Plan mode**, or a **narrow `.mdc` + globs** so review criteria do not bloat the main session. |

### Example: path-scoped `.mdc` (adapt paths)

```yaml
---
description: API route conventions — only when touching backend routes
globs:
  - "src/routes/**/*.ts"
alwaysApply: false
---

# API routes

- …short team bullets; link to `docs/human/…` for full prose…
```

Prefer **`docs/human/<topic>.md`** as canonical; in `.mdc` either summarize or link one line to that file to avoid drift.

## The idea in one sentence

**Ambient context is expensive.** Keep always-on text small and imperative; load depth **just in time** via tools or path-scoped rules; use **deterministic guardrails** (manifest + hooks where your product supports them) so the model does not have to “remember” everything.

## Mapping: common stack → this repo

| Layer (typical “power user” stack) | In agent-context-kit |
|-----------------------------------|----------------------|
| Short root memory file (`CLAUDE.md`) | [`CLAUDE.md`](../../CLAUDE.md) at repo root — session instructions + pointer to Toolshed / file fallback |
| Project identity + glossary + architecture | **L0** — `docs/agent/values.md`, `glossary.md`, `architecture-primer.md`; Toolshed: `get_project_identity` |
| Path-scoped conventions (only when editing matching paths) | **L1** — `docs/human/*.md` listed in `manifest.yaml` → `rules.standards`; Cursor [`.cursor/rules/*.mdc`](../../.cursor/rules/) with **`globs`**; optional Claude Code `.claude/rules/*.md` (see below) |
| Guardrails (“never do X without Y”) | `manifest.yaml` → **`guardrails`** + Toolshed `get_guardrails`; literal bullets in `CLAUDE.md` / `values.md` where they must always apply |
| Repeatable workflows (skills) | **`docs/agent/prompts/*.md`** + `list_prompts` / `get_prompt`; global Cursor/Claude **skills** are complementary when you want progressive disclosure outside this tree |
| Plan before risky edits | **[Cursor Plan mode](https://www.cursor.com/docs/agent/modes)** (Shift+Tab in the agent input, or mode picker) + [`context-policy.md`](../agent/context-policy.md) (L1/L2) and task-specific prompts |
| Isolated review / parallel work | Prompt [`checkout-pr.md`](../agent/prompts/checkout-pr.md) (git worktree); parallel panes are a workflow choice |
| Hooks (format on save, defer dangerous git) | **Product-specific** (e.g. Claude Code `settings.json`, Cursor hooks). See [Hooks vs manifest guardrails](#hooks-vs-manifest-guardrails) |

## Where the Toolshed sits in a multi-server setup

Many teams run **several** MCP servers (GitHub, filesystem, web search, library docs, optional code graph / memory). Each server exposes **tool schemas** that usually occupy context on **every** turn unless your client does **lazy tool loading** (“tool search”). Even with lazy loading, **fewer, well-motivated servers** tend to behave better than a long list.

**`@agent-context-kit/toolshed-server` is your project-context server:** it serves L0/L1/L2 from `manifest.yaml` and `docs/` (`get_project_identity`, `get_guardrails`, `get_rules`, `get_spec`, …). It does **not** replace Git hosting, web search, or arbitrary filesystem roots by itself — combine it with a **small** set of other servers you actually use, and treat each addition as a **token and complexity** decision.

## Path-scoped rules: avoid drift

**Cursor** — In `.cursor/rules/*.mdc`, use frontmatter **`globs`** so a rule loads only when files under those paths matter.

**Claude Code** — Convention is `.claude/rules/*.md` with YAML frontmatter; **`globs`** is the reliable key for “load when touching these paths”. (Some docs use `paths:`; if rules seem ignored, try `globs:` or the CSV-style variants described in current Claude Code docs.)

**Single source of truth** — Prefer **one** canonical place for a convention (e.g. `docs/human/testing.md`). If you also maintain `.claude/rules/testing.md` or a `.mdc` for the same team, keep them aligned (or generate one from the other) so they do not diverge.

## Plan mode and “read-only exploration”

In **Cursor**, prefer **Plan mode** for multi-file or high-risk work so exploration stays out of the execution pass until you accept a plan (see [Cursor alignment](#cursor-alignment)). In this kit, **prompts** encode checklists and “do not proceed until …” gates; [`context-policy.md`](../agent/context-policy.md) tells the agent **which** L1/L2 artifacts to open per task type.

## Subagents vs `profiles` in `manifest.yaml`

Claude Code **subagents** can carry their own tool allowlists and cheaper models. **Cursor** has no equivalent file format: use a **fresh chat**, **Plan mode**, or **path-scoped `.mdc` rules** for a focused reviewer pass. This kit’s **`profiles.<name>`** merges manifest slices for Toolshed — same *idea* (variant context per role) at the **context** layer. Use profiles for policy surfaced via MCP; use Cursor patterns above for **session isolation**.

## “Skills” vs repo prompts

**Skills** (Cursor global or `.claude/skills/`) often use metadata + body loaded on trigger, sometimes with bundled scripts.

**Repo prompts** here are markdown workflows under `docs/agent/prompts/`: same spirit (named workflow, steps, “do not” section), without a separate skill runtime. Use **skills** for cross-repo personal workflows; use **prompts** for project-specific flows you want in `list_prompts` / version control.

## Hooks vs manifest guardrails

| Mechanism | What it does |
|-----------|----------------|
| **Hooks** (client-specific) | **Claude Code:** `settings.json` hooks. **Cursor:** [Hooks](https://docs.cursor.com/agent/hooks) — **`.cursor/hooks.json`** + **`.cursor/hooks/`** (see `README` there). **`context-kit init`** scaffolds a valid empty config. Deterministic steps: format after edit, log denials, optional gates on shell/MCP (product-dependent). |
| **`guardrails` in manifest.yaml`** | Declarative rules the Toolshed exposes (`get_guardrails`); pair with agent instructions to call **`request_human_approval`** / **`verify_action`** when your manifest defines those flows. |

Hooks and guardrails **complement** each other: hooks enforce at the shell/tool boundary; the manifest documents what the team expects agents to respect.

## Further reading

- [toolshed-mcp-setup.md](toolshed-mcp-setup.md) — wire the Toolshed MCP client
- [README.md](README.md) — how `docs/human` ties to `get_rules`
- [../agent/prompts/README.md](../agent/prompts/README.md) — prompt catalog and “skills-like” usage
- [Cursor Rules](https://docs.cursor.com/context/rules-for-ai) — `.mdc` frontmatter, `globs`, `alwaysApply`
- [Cursor Hooks](https://docs.cursor.com/agent/hooks) — project **`.cursor/hooks.json`** (scaffolded on `init`)

Inspired in part by public write-ups on tuning agent setups (short root memory, path rules, few MCP servers, hooks, worktrees). Your stack should match **your** repo — this page is a map, not a mandate. **In Cursor:** follow [Cursor alignment](#cursor-alignment) and [`.cursor/rules/agent-context-kit.mdc`](../../.cursor/rules/agent-context-kit.mdc) as the default wiring for this template.
