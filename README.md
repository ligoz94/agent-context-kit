# agent-context-kit

A framework for perfect LLM context on any project.

Inspired by Stripe's Developer Toolshed pattern. Language-agnostic, editor-agnostic, LLM-agnostic.

---

## The problem

Every LLM starts blind. You either dump too much context (waste tokens, noisy output) or too little (generic, wrong output). There is no standard way to tell an agent *what this project is, how it works, and what not to do*.

## The solution

A 4-layer context structure + a Toolshed MCP server that exposes your knowledge as tools — so agents fetch only what they need, when they need it.

```
L0 Identity   → who the project is       (always loaded, compact)
L1 Rules      → how the project works    (loaded per task)
L2 Knowledge  → what the project knows   (fetched on demand)
L3 Context    → what the task is         (your input)
```

---

## Quickstart (5 minutes)

```bash
# 1. Scaffold the structure in your project
npx @agent-context-kit/cli init

# 2. Fill in the files (see: docs/agent/)
#    values.md → your non-negotiables
#    glossary.md → your project terms
#    architecture-primer.md → your codebase map

# 3. Start the Toolshed MCP server
npx @agent-context-kit/toolshed-server

# 4. Add Toolshed to your MCP client (full guide: docs/human/toolshed-mcp-setup.md after init)
```

**MCP client config** (minimal example — see **`docs/human/toolshed-mcp-setup.md`** in your project for Cursor, Claude Desktop, `--manifest`, and troubleshooting):

```json
{
  "mcpServers": {
    "toolshed": {
      "command": "npx",
      "args": ["-y", "@agent-context-kit/toolshed-server"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

---

## File structure

After `context-kit init`, you get:

```
your-project/
├── CLAUDE.md                      ← Claude Code / Desktop: workflow + MCP tools
├── manifest.yaml                  ← source of truth (edit this)
├── .cursor/
│   └── rules/
│       └── agent-context-kit.mdc  ← Cursor: same workflow (alwaysApply)
└── docs/
    ├── agent/                     ← machine-readable context
    │   ├── values.md              ← L0: non-negotiables
    │   ├── glossary.md            ← L0: project terms
    │   ├── architecture-primer.md ← L0: codebase map
    │   ├── context-policy.md      ← L1: how the LLM should behave
    │   ├── key-learnings.md       ← L2: lessons learned
    │   ├── prompts/               ← named prompt templates
    │   └── evals/                 ← eval cases
    ├── features/                  ← feature specs (one per feature)
    │   └── _template.md
    ├── decisions/                 ← ADRs (copy _template.md per decision)
    │   ├── README.md
    │   └── _template.md
    └── human/                     ← human-readable guides
        ├── testing.md
        ├── way-of-working.md
        └── toolshed-mcp-setup.md  ← MCP setup for Toolshed
```

**LLM entry points:** `CLAUDE.md` and `.cursor/rules/agent-context-kit.mdc` tell agents to call Toolshed tools first (when MCP is on) or read `docs/agent/*` in order. They complement `context-policy.md`.

---

## Toolshed tools

The MCP server exposes these tools to any connected LLM:

| Tool | What it returns |
|------|----------------|
| `get_project_identity` | L0: values + architecture + glossary |
| `get_rules` | L1: context policy + standards |
| `get_learnings` | L2: key learnings |
| `get_spec` | L2: spec for a named feature |
| `list_registry` | All features with status |
| `lookup_glossary` | Definition of a specific term |
| `get_prompt` | A named prompt template |
| `list_prompts` | All available prompts |

Tools can be aliased in `manifest.yaml` to avoid collisions with other MCP servers.

---

## Sync: engine vs project regions

Files contain two kinds of regions:

```markdown
<!-- agent-context-kit:engine:start -->
Framework instructions managed by the kit — updated on sync.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
Your content here — never touched by sync.
<!-- agent-context-kit:project:end -->
```

Run `context-kit sync` to pull the latest engine instructions without losing your project content.

---

## CLI reference

```bash
context-kit init    # scaffold structure
context-kit sync    # update engine regions, preserve project regions  
context-kit check   # validate manifest, links, token budgets
context-kit list    # list prompts and features
```

---

## Token budget guidelines

| Layer | Target | Hard limit |
|-------|--------|-----------|
| L0 (identity) | < 800 tokens | 1500 |
| L1 (rules) | < 600 tokens | 1200 |
| L2 per spec | < 400 tokens | 800 |
| L3 (task) | your call | — |

`context-kit check` warns you when files exceed the target.

---

## manifest.yaml reference

```yaml
project:
  name: "my-project"
  description: "What this project does"
  language: "typescript"
  stack: ["react", "postgres"]

identity:
  values:       docs/agent/values.md
  architecture: docs/agent/architecture-primer.md
  glossary:     docs/agent/glossary.md

rules:
  policy: docs/agent/context-policy.md
  standards:
    - name: testing
      path: docs/human/testing.md

knowledge:
  learnings: docs/agent/key-learnings.md

registry:
  - name: auth-flow
    path: docs/features/auth-flow.md
    status: stable

prompts:
  dir: docs/agent/prompts/

toolshed:
  port: 3742
  tool_aliases:
    get_spec: fetch_feature_brief   # rename to avoid collisions
```

---

## Packages

| Package | Purpose |
|---------|---------|
| `@agent-context-kit/cli` | `context-kit` CLI command |
| `@agent-context-kit/toolshed-server` | MCP server (`npx` runnable) |

---

## License

MIT
# agent-context-kit
