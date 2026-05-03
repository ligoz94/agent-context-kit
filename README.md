# agent-context-kit

A framework for giving LLMs the right project context at the right time—without stuffing the whole repo into the prompt.

Inspired by Stripe’s Developer Toolshed pattern. Language-agnostic, editor-agnostic, and model-agnostic.

---

## The problem

Agents start cold: either you paste too much (noisy, expensive) or too little (generic or wrong architecture). There is no shared convention for *what this project is*, *how we work*, and *what must never happen*.

## The solution

**agent-context-kit** splits knowledge into **layers** and exposes it through **tools** (MCP and LangChain) so the model pulls only what the task needs.

### Context layers

| Layer | Role | Typical content |
|-------|------|-----------------|
| **L0 — Identity** | Baseline orientation | Values, architecture primer, glossary |
| **L1 — Rules** | How we build and review | Context policy, team standards |
| **L2 — Knowledge** | On-demand depth | Feature specs, learnings, extra doc trees |
| **L3 — Task** | Immediate work | Chat, open files, terminal (you / the IDE) |

The **manifest** (`manifest.yaml`) is the single source of truth: paths, registry, prompts, optional **guardrails**, and optional **profiles** for different agents or sub-teams.

### Why it helps

- **One source of truth** — Rules live in markdown and YAML, not copy-pasted prompts.
- **Validated config** — The manifest is checked so broken paths fail fast.
- **Flexible delivery** — Same tools over **stdio MCP** (Cursor, Claude Desktop, …) or **LangChain** in Node.
- **Token discipline** — CLI checks encourage keeping L0/L1/L2 files within sensible sizes.

---

## Quickstart

### 1. Scaffold

From your repository root:

```bash
npx @agent-context-kit/cli init
```

This adds `manifest.yaml`, `docs/agent/*`, `docs/features/`, `docs/human/`, `docs/decisions/`, **`.cursor/rules/*.mdc`**, **`.cursor/hooks.json`** (empty hooks + `hooks/README.md`), and `CLAUDE.md`.

### 2. Fill in your project

- `manifest.yaml` — project name, stack, registry entries, optional `guardrails` and `profiles`
- `docs/agent/values.md`, `glossary.md`, `architecture-primer.md` — L0
- `docs/agent/context-policy.md` — L1 loading and tone
- `docs/human/*.md` — standards linked from `rules.standards` in the manifest

### 3. Run checks

```bash
npx @agent-context-kit/cli check
```

### 4. Wire the Toolshed (MCP)

```bash
npx @agent-context-kit/toolshed-server
```

Use `--manifest /path/to/manifest.yaml` if the file is not at the process working directory. Use `--profile <name>` to merge a `profiles.<name>` block from the manifest (e.g. frontend vs backend guardrails).

Full editor setup: after `init`, see `docs/human/toolshed-mcp-setup.md`. For a layered stack (short root memory, few MCPs, path rules, hooks, worktrees) mapped to this kit, see `docs/human/agent-context-power-user-stack.md`.

### 5. Optional: LangChain

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

1. You ask the agent to implement something.
2. It calls **`get_project_identity`** (L0) and **`get_guardrails`** (blocked actions, approval rules, allowed domains).
3. It calls **`get_rules`** (and optionally a single `standard`) before coding.
4. For one feature, it calls **`list_registry`** then **`get_spec`** with that name—not every spec.
5. It uses **`get_learnings`**, **`lookup_glossary`**, **`list_prompts` / `get_prompt`** when relevant.
6. It may **`search_context`** or **`validate_context`** to locate or sanity-check docs.

Write-capable tools (**`add_learning`**, **`add_glossary_term`**, **`update_feature_status`**) change files or the manifest; use them only when the team wants the agent to persist updates.

---

## Tools reference (MCP & LangChain)

Canonical names below; aliases from `manifest.yaml` → `toolshed.tool_aliases` apply everywhere.

### Read context

| Tool | Purpose |
|------|---------|
| `get_project_identity` | L0: values, architecture primer, glossary |
| `get_guardrails` | Blocked actions, `require_approval` list, `allowed_domains` |
| `get_rules` | L1: context policy + standards (`standard` optional) |
| `get_learnings` | L2: `key-learnings.md` |
| `get_spec` | One feature spec from `registry` (`name`) |
| `list_registry` | All registered features and statuses |
| `lookup_glossary` | Term lookup (`term` optional) |
| `get_prompt` | Prompt template + optional `variables` for `{{placeholders}}` |
| `list_prompts` | Available prompt files |
| `search_context` | Search across configured paths for a string/regex |

### Validate & persist

| Tool | Purpose |
|------|---------|
| `validate_context` | Check manifest paths exist |
| `add_learning` | Append a bullet to `key-learnings.md` |
| `add_glossary_term` | Append term + definition to `glossary.md` |
| `update_feature_status` | Update a feature’s `status` in `manifest.yaml` |

### Safety & verification

| Tool | Purpose |
|------|---------|
| `request_human_approval` | Structured pause before risky actions (pair with `require_approval`) |
| `verify_action` | Post-checks: file exists/contains/mtime, command, HTTP status, JSON path, etc. |

---

## CLI reference

| Command | Description |
|---------|-------------|
| `context-kit init` | Scaffold manifest and docs (skips existing files) |
| `context-kit check` | Required files + rough L0 token warnings |
| `context-kit sync` | Refresh **engine** regions in agent markdown; **project** regions stay yours |
| `context-kit list` | Lists prompts and feature markdown files under `docs/features/` |
| `context-kit new-spec <name>` | Creates `docs/features/<name>.md` from the template and adds a `registry` entry (`wip`) |

### Engine vs project regions (sync)

Kit-managed hints live between:

`<!-- agent-context-kit:engine:start -->` … `<!-- agent-context-kit:engine:end -->`

Your content lives between:

`<!-- agent-context-kit:project:start -->` … `<!-- agent-context-kit:project:end -->`

`sync` only updates engine blocks.

### Token budget hints (`check`)

| Layer | Target | Warn above (approx.) |
|-------|--------|------------------------|
| L0 (identity files) | < 800 tokens | ~800 tokens/file check |
| L1 | team choice | — |
| L2 per spec | keep focused | — |

---

## Monorepo packages

| Package | Role |
|---------|------|
| `@agent-context-kit/cli` | `context-kit` commands |
| `@agent-context-kit/toolshed-server` | stdio MCP server |
| `@agent-context-kit/langchain` | LangChain tools + LangSmith helpers |

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

---

## License

MIT
