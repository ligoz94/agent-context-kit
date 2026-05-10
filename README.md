# agent-context-kit

A toolkit for making coding agents useful on real projects.

It gives agents a structured way to load project context, follow team rules, use MCP tools, and optionally run work through a persistent mission loop.

Inspired by Stripe’s Developer Toolshed pattern. Language-agnostic, editor-agnostic, and model-agnostic.

---

## What this library does

`agent-context-kit` solves a simple problem:

> coding agents are unreliable when every session starts from scratch

This repo gives you a standard project structure so an agent can understand:

- what the project is,
- how the team works,
- which rules and guardrails apply,
- which feature spec matters,
- and, optionally, how to execute a task through a tracked mission state.

In practice, the kit gives you four things:

1. a `manifest.yaml` that acts as the source of truth for context and tools
2. a docs structure under `docs/` for identity, rules, learnings, prompts, and feature specs
3. a CLI to scaffold and maintain that structure
4. an MCP/LangChain tool surface so agents can pull only the context they need

## What this library is not

It is not:

- a general-purpose agent framework,
- a hosted orchestration service,
- or a magic autonomous coding system out of the box.

The core product is still:

> structured context + rules + tooling for agentic development

The mission runtime is an optional layer on top, not the default identity of the project.

## Two workflows

This repo now supports two distinct ways of working.

### 1. Classic agent-context-kit workflow

This is the default workflow.

You use the kit to:

- scaffold project docs,
- define feature specs,
- expose project context through MCP or LangChain,
- and run a normal spec-driven agent workflow.

Think:

> docs + prompts + guardrails + tools

### 2. Optional mission workflow

This is an opt-in runtime for larger or iterative tasks.

You use it when you want:

- persistent mission state,
- tracked slices,
- validator findings,
- repair/revalidate loops,
- and a simple planner -> worker -> validator execution model.

Think:

> classic workflow + persistent execution state machine

If you never enable mission mode, the library still works exactly as a classic context kit.

## The problem

Agents start cold: either you paste too much (noisy, expensive) or too little (generic or wrong architecture). There is no shared convention for _what this project is_, _how we work_, and _what must never happen_.

## The solution

**agent-context-kit** splits knowledge into **layers** and exposes it through **tools** (MCP and LangChain) so the model pulls only what the task needs.

The shipped stack today looks like this:

- `@agent-context-kit/cli` scaffolds and maintains the project structure
- `@agent-context-kit/toolshed-server` exposes MCP tools over stdio
- `@agent-context-kit/langchain` exposes the same surface as LangChain tools
- `packages/missions` provides the optional local mission runtime

### Context layers

| Layer              | Role                    | Typical content                            |
| ------------------ | ----------------------- | ------------------------------------------ |
| **L0 — Identity**  | Baseline orientation    | Values, architecture primer, glossary      |
| **L1 — Rules**     | How we build and review | Context policy, team standards             |
| **L2 — Knowledge** | On-demand depth         | Feature specs, learnings, extra doc trees  |
| **L3 — Task**      | Immediate work          | Chat, open files, terminal (you / the IDE) |

The **manifest** (`manifest.yaml`) is the single source of truth: paths, registry, prompts, optional **guardrails**, and optional **profiles** for different agents or sub-teams.

### Why it helps

- **One source of truth** — Rules live in markdown and YAML, not copy-pasted prompts.
- **Validated config** — The manifest is checked so broken paths fail fast.
- **Flexible delivery** — Same tools over **stdio MCP** (Cursor, Claude Desktop, …) or **LangChain** in Node.
- **Token discipline** — CLI checks encourage keeping L0/L1/L2 files within sensible sizes.

## What you get after `init`

After `init`, a project has a clear structure for both humans and agents:

- `manifest.yaml` — source of truth for context paths, registry, prompts, tools, and optional mission config
- `docs/agent/` — machine-oriented context: values, glossary, architecture, learnings, prompts
- `docs/human/` — human-oriented guides: testing, way of working, MCP setup, optional mission guide
- `docs/features/` — feature specs and registry entries
- `docs/decisions/` — ADRs

That means a fresh agent session no longer depends on you re-explaining the whole project every time.

---

## Quickstart

### 1. Scaffold

From your repository root:

```bash
npx @agent-context-kit/cli init
```

This adds `manifest.yaml`, `docs/agent/*`, `docs/features/`, `docs/human/`, `docs/decisions/`, optional editor files, and asks whether you want the optional mission workflow.

### 2. Fill in your project (interactive)

Run the setup wizard to auto-detect your stack and pre-fill the project-specific sections:

```bash
npx @agent-context-kit/cli setup
```

The wizard will:

- Detect your language and stack from `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, etc.
- Prompt for a project description, architecture overview, key source paths, domain glossary terms, and project-specific rules
- Write your answers directly into `manifest.yaml`, `architecture-primer.md`, `glossary.md`, and `values.md`

Or fill in manually:

- `manifest.yaml` — project name, stack, registry entries, optional `guardrails` and `profiles`
- `docs/agent/values.md`, `glossary.md`, `architecture-primer.md` — L0
- `docs/agent/context-policy.md` — L1 loading and tone
- `docs/human/*.md` — standards linked from `rules.standards` in the manifest

### 3. Choose whether to use mission workflow

Mission mode is optional.

You can enable it during `init`, or later with:

```bash
npx @agent-context-kit/cli enable-mission
```

If enabled, the project gets mission docs/config and the CLI mission commands become part of the intended workflow.

### 4. Run checks

```bash
npx @agent-context-kit/cli check
```

### 5. Wire the Toolshed (MCP)

```bash
npx @agent-context-kit/toolshed-server
```

Use `--manifest /path/to/manifest.yaml` if the file is not at the process working directory. Use `--profile <name>` to merge a `profiles.<name>` block from the manifest (e.g. frontend vs backend guardrails).

Full editor setup: after `init`, see `docs/human/toolshed-mcp-setup.md`. For a layered stack (short root memory, few MCPs, path rules, hooks, worktrees) mapped to this kit, see `docs/human/agent-context-power-user-stack.md`.

### 6. Optional: LangChain

```bash
npm install @agent-context-kit/langchain
```

```typescript
import { createContextKitTools, enableLangSmith } from "@agent-context-kit/langchain";

enableLangSmith({ projectName: "my-agent-demo" });

const tools = createContextKitTools("./manifest.yaml", {
  // optional: profile: "backend"
});
```

Pass `tools` to your agent like any other LangChain tools. Tool names respect `toolshed.tool_aliases` in the manifest.

---

## Example session flow

### Classic workflow

1. You ask the agent to implement something.
2. It calls **`get_project_identity`** (L0) and **`get_guardrails`** (blocked actions, approval rules, allowed domains).
3. It calls **`get_rules`** (and optionally a single `standard`) before coding.
4. For one feature, it calls **`list_registry`** then **`get_spec`** with that name—not every spec.
5. It uses **`get_learnings`**, **`lookup_glossary`**, **`list_prompts` / `get_prompt`** when relevant.
6. It may **`search_context`** or **`validate_context`** to locate or sanity-check docs.

Write-capable tools (**`add_learning`**, **`add_glossary_term`**, **`update_feature_status`**) change files or the manifest; use them only when the team wants the agent to persist updates.

### Mission workflow

If you enable mission mode, a task can also be run as:

1. `context-kit mission start "Goal"`
2. `context-kit mission run`
3. `context-kit mission status`

This creates a persistent mission state, executes slices, records validator findings, and creates repair/revalidate work when needed.

---

## Tools reference (MCP & LangChain)

Canonical names below; aliases from `manifest.yaml` → `toolshed.tool_aliases` apply everywhere.

### Read context

| Tool                   | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `get_project_identity` | L0: values, architecture primer, glossary                     |
| `get_guardrails`       | Blocked actions, `require_approval` list, `allowed_domains`   |
| `get_rules`            | L1: context policy + standards (`standard` optional)          |
| `get_learnings`        | L2: `key-learnings.md`                                        |
| `get_spec`             | One feature spec from `registry` (`name`)                     |
| `list_registry`        | All registered features and statuses                          |
| `lookup_glossary`      | Term lookup (`term` optional)                                 |
| `get_prompt`           | Prompt template + optional `variables` for `{{placeholders}}` |
| `list_prompts`         | Available prompt files                                        |
| `search_context`       | Search across configured paths for a string/regex             |

### Validate & persist

| Tool                    | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `validate_context`      | Check manifest paths exist                     |
| `add_learning`          | Append a bullet to `key-learnings.md`          |
| `add_glossary_term`     | Append term + definition to `glossary.md`      |
| `update_feature_status` | Update a feature’s `status` in `manifest.yaml` |

### Safety & verification

| Tool                     | Purpose                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `request_human_approval` | Structured pause before risky actions (pair with `require_approval`)           |
| `verify_action`          | Post-checks: file exists/contains/mtime, command, HTTP status, JSON path, etc. |

### Mission tools

When mission mode is enabled, the runtime also exposes mission-oriented tools such as:

- `create_mission`
- `create_mission_from_issue`
- `get_mission_state`
- `list_mission_events`
- `submit_mission_handoff`
- `submit_validator_result`
- `run_mission_loop`

---

## CLI reference

| Command                       | Description                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `context-kit init`            | Scaffold manifest and docs (skips existing files)                                       |
| `context-kit enable-mission`  | Enable the optional mission workflow in an existing classic project                     |
| `context-kit setup`           | Interactive wizard: auto-detect stack, fill project sections                            |
| `context-kit check`           | Required files + rough L0 token warnings                                                |
| `context-kit sync`            | Refresh **engine** regions in agent markdown; **project** regions stay yours            |
| `context-kit list`            | Lists prompts and feature markdown files under `docs/features/`                         |
| `context-kit new-spec <name>` | Creates `docs/features/<name>.md` from the template and adds a `registry` entry (`wip`) |

### Mission CLI

These commands are intended only for projects that enabled mission workflow.

| Command                        | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `context-kit mission start`    | Create mission state from a goal or GitHub issue      |
| `context-kit mission run`      | Execute the local planner -> worker -> validator loop |
| `context-kit mission status`   | Show mission summary, findings, and latest handoff    |
| `context-kit mission validate` | Record validator results and create repair slices     |

### Engine vs project regions (sync)

Kit-managed hints live between:

`<!-- agent-context-kit:engine:start -->` … `<!-- agent-context-kit:engine:end -->`

Your content lives between:

`<!-- agent-context-kit:project:start -->` … `<!-- agent-context-kit:project:end -->`

`sync` only updates engine blocks.

### Token budget hints (`check`)

| Layer               | Target       | Warn above (approx.)   |
| ------------------- | ------------ | ---------------------- |
| L0 (identity files) | < 800 tokens | ~800 tokens/file check |
| L1                  | team choice  | —                      |
| L2 per spec         | keep focused | —                      |

---

## Token-saving tools

`context-kit init` asks whether to enable two optional tools that cut token usage without sacrificing accuracy. Answer **y** and they are wired in automatically for your editor.

### caveman — ~65% fewer output tokens

[github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)

Makes agents respond in compressed, fragment-style prose. Technical accuracy is fully preserved; only filler, articles, and hedging are dropped.

| Editor            | What `init` does                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Cursor**        | Writes `.cursor/rules/caveman.mdc` (`alwaysApply: true`) — auto-starts on restart          |
| **Claude Code**   | Prints the one-time install command: `claude plugin marketplace add JuliusBrussee/caveman` |
| **Codex / other** | Prints: `npx skills add JuliusBrussee/caveman`                                             |

Activate mid-session: `/caveman` (or `/caveman lite` / `/caveman ultra`).
Deactivate: "normal mode".

### RTK — compressed terminal output

[github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)

Wraps common CLI tools (`git`, `npm`, `grep`, `find`, …) to emit only the signal, stripping noise from terminal output. Fewer terminal tokens injected back into context.

| Editor          | What `init` does                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Cursor**      | Writes `.cursor/rules/rtk-bash.mdc` (`alwaysApply: true`) — agent prefixes commands with `rtk` automatically |
| **All editors** | RTK binary must be installed separately — see [github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)         |

Usage: `git status` → `rtk git status`. Falls back to raw command when no RTK wrapper exists.

---

## Monorepo packages

| Package                              | Role                                |
| ------------------------------------ | ----------------------------------- |
| `@agent-context-kit/cli`             | `context-kit` commands              |
| `@agent-context-kit/toolshed-server` | stdio MCP server                    |
| `@agent-context-kit/langchain`       | LangChain tools + LangSmith helpers |
| `@agent-context-kit/missions`        | local mission runtime primitives    |

Examples:

- `examples/basic-web-app` — sample manifest and feature specs
- `examples/langchain-agent` — agent that uses `createContextKitTools`

---

## Manifest highlights

- **`identity` / `rules` / `knowledge`** — L0, L1, L2 paths. `knowledge` can include extra directories (e.g. `backend:`) whose `.md` files are indexed for search and context.
- **`registry`** — Features exposed through `get_spec` / `list_registry`
- **`prompts.dir`** — Templates for `get_prompt` / `list_prompts`
- **`toolshed.tool_aliases`** — Rename tools when two MCP servers clash
- **`guardrails`** — `blocked_actions`, `require_approval`, `allowed_domains` (read via `get_guardrails`)
- **`profiles`** — Deep-merge overrides; activate with `toolshed-server --profile <name>` or `createContextKitTools(path, { profile: "<name>" })`
- **`mission`** — Optional mission runtime config: state dir, role hints, validation assertions, execution commands

---

## Which workflow should I use?

Use the classic workflow when:

- you mainly want better project context for agents,
- you work spec-first,
- you do not need persistent execution state.

Use the mission workflow when:

- the task is multi-step,
- validation may fail and require retries,
- you want repair/revalidate loops,
- you want the task tracked in structured state rather than only in chat.

If you are unsure, start with the classic workflow. Mission mode is optional and can be enabled later.

---

## License

MIT
