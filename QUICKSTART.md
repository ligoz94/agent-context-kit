# Quickstart — agent-context-kit

How to set up agent-context-kit in a new project from scratch.

---

## Prerequisites

- Node.js 18+
- A project directory with at least a `package.json` (or any codebase)
- Cursor, Claude Code, or Codex as your AI editor

---

## Step 1 — Scaffold

From your project root:

```bash
npx @agent-context-kit/cli init
```

You will be asked two questions:

**Which AI editor(s) do you use?**

```
1) Claude Code  →  writes CLAUDE.md + .mcp.json
2) Cursor       →  writes .cursor/rules/*.mdc + .cursor/hooks.json
3) Codex        →  writes AGENTS.md
4) All
```

**Enable token-saving tools?**  
`y` — recommended. Installs:

- **caveman** (~65% fewer output tokens, full technical accuracy kept)
- **RTK** (compressed terminal output, fewer tokens injected back into context)

For Cursor these are wired in automatically via `.cursor/rules/`. For Claude Code you will be shown a one-time install command to run.

What `init` creates:

```
manifest.yaml                  ← source of truth for the MCP server
docs/
  README.md                    ← agent entry point (start here every session)
  agent/
    values.md                  ← project principles (L0, always loaded)
    architecture-primer.md     ← stack, layers, data flow (L2)
    glossary.md                ← domain terms (L0)
    context-policy.md          ← loading rules (L1)
    key-learnings.md           ← past bugs and gotchas (L2)
    app-config.md              ← paths, commands, MCP config (L0)
    product-context.md         ← who uses this, on what device (L0)
    prompts/                   ← workflow prompts (implement, review, fix…)
    templates/                 ← PR body, commit message
    evals/                     ← agent quality metrics
  features/
    _template.md               ← copy for every new feature
  decisions/                   ← architecture decision records
  human/
    agentic-development.md     ← this guide, human-readable
    way-of-working.md          ← team conventions
    testing.md                 ← test conventions
    toolshed-mcp-setup.md      ← MCP server setup details
```

---

## Step 2 — Auto-fill

```bash
npx @agent-context-kit/cli setup
```

This command:

- Detects your language and stack from `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, etc.
- Writes your project name, commands (`dev`, `test`, `lint`, `typecheck`), and key paths into the docs
- Generates `.mcp.json` (Claude Code) and/or `.cursor/mcp.json` (Cursor) with the **absolute path** to `manifest.yaml`
- If those files already exist (e.g. you have Supabase configured), it **merges** the Toolshed entry in without overwriting your existing servers

---

## Step 3 — Activate the MCP server in your editor

The MCP server is **not a command you run manually**. Your editor launches it automatically when it reads the config file.

**Cursor:**

1. `Cmd+Shift+P` → "Cursor Settings" → "MCP"
2. Find `toolshed` in the list and enable it
3. Restart Cursor

**Claude Code:**

1. Restart the app — it detects `.mcp.json` automatically
2. The Toolshed tools (`get_project_identity`, `get_spec`, etc.) will appear in the tool list

> **Why does `npx @agent-context-kit/toolshed-server` hang in the terminal?**  
> That is expected. It is a stdio MCP server — it stays alive waiting for JSON-RPC messages from the editor. You never run it manually. Close it with `Ctrl+C`.

---

## Step 4 — Populate your docs (once per project)

Open a chat with your AI agent and send:

```
Read docs/agent/prompts/populate-project.md and populate all project docs.
```

The agent will:

1. Autonomously scan your codebase (`package.json`, `src/`, routes, schemas, tests, etc.)
2. Write concrete content into all template files using `<!-- TODO: … -->` for anything it can't infer
3. Ask you exactly **4 questions** about what it could not determine from code
4. Run `context-kit check` and report the result

---

## Step 5 — Validate

```bash
npx @agent-context-kit/cli check
```

Checks that all required files exist and L0 files are within token budget.

---

## Step 6 — Test that MCP works

In your editor chat:

```
Call get_project_identity
```

Expected: the agent returns your project's values, architecture overview, and glossary.

If you get `"No identity files found"` → `manifest.yaml` is missing the `identity` section. Run `setup` again or check the file manually.

---

## Troubleshooting

| Symptom                                   | Likely cause                              | Fix                                                                                                 |
| ----------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `get_spec` returns nothing                | `registry: []` empty in manifest          | Add entries under `registry:` in `manifest.yaml`                                                    |
| MCP tools not visible in Cursor           | Server not enabled                        | Settings → MCP → enable `toolshed` → restart                                                        |
| `manifest.yaml not found` on server start | Old `.mcp.json` used `cwd: "."`           | Re-run `npx @agent-context-kit/cli setup` — it rewrites with absolute path                          |
| caveman not activating in Claude Code     | Plugin not installed                      | Run: `claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman` |
| caveman not activating in Cursor          | Rules not enabled or editor not restarted | Check `.cursor/rules/caveman.mdc` exists, then restart Cursor                                       |

---

## Day-to-day usage

Once set up, every agent session starts with:

```
Read docs/README.md. My task is: [describe your task]
```

The agent reads the hub, picks the right prompt, and tells you what it will open next.

For a full guide to the agentic development workflow, see `docs/human/agentic-development.md`.

---

## CLI reference

| Command                                      | What it does                                    |
| -------------------------------------------- | ----------------------------------------------- |
| `npx @agent-context-kit/cli init`            | Scaffold docs structure (skips existing files)  |
| `npx @agent-context-kit/cli setup`           | Auto-detect stack, fill docs, write MCP configs |
| `npx @agent-context-kit/cli check`           | Validate required files + L0 token budgets      |
| `npx @agent-context-kit/cli sync`            | Update engine regions after a kit upgrade       |
| `npx @agent-context-kit/cli list`            | List available prompts and registered features  |
| `npx @agent-context-kit/cli new-spec <name>` | Create a feature spec + add it to the registry  |
