# @agent-context-kit/toolshed-server

**stdio MCP server** for [agent-context-kit](https://www.npmjs.com/search?q=%40agent-context-kit): reads your project’s **`manifest.yaml`** and serves L0/L1/L2 context as **tools** so LLMs fetch only what they need (Stripe-style Toolshed pattern).

**Requirements:** Node.js **18+**. Run from the directory that contains **`manifest.yaml`** (or pass `--manifest`). Optional **`--profile <name>`** merges `profiles.<name>` from the manifest.

## Install

```bash
npm install -g @agent-context-kit/toolshed-server
```

Or use with `npx` (no global install):

```bash
npx @agent-context-kit/toolshed-server
```

## Usage

From **your project root** (where `manifest.yaml` lives):

```bash
toolshed-server
# or
npx @agent-context-kit/toolshed-server
```

Custom manifest path:

```bash
toolshed-server --manifest ./path/to/manifest.yaml
```

Profile (manifest deep-merge):

```bash
toolshed-server --profile backend
```

Paths inside `manifest.yaml` are resolved relative to the manifest file’s directory.

## MCP client (e.g. Cursor, Claude Desktop)

Point **`cwd`** at the project root and use `npx`:

```json
{
  "mcpServers": {
    "toolshed": {
      "command": "npx",
      "args": ["-y", "@agent-context-kit/toolshed-server"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

Add `"--manifest", "./config/manifest.yaml"` to `args` when needed. Add `"--profile", "frontend"` for a named profile.

If tool names clash with another server, set `toolshed.tool_aliases` in `manifest.yaml`.

## Tools exposed

### Read context

| Tool | Purpose |
|------|---------|
| `get_project_identity` | L0: values, architecture, glossary |
| `get_guardrails` | Blocked actions, approval list, allowed domains |
| `get_rules` | L1: policy + standards |
| `get_learnings` | L2: key learnings |
| `get_spec` | Feature spec from registry |
| `list_registry` | Feature list + status |
| `lookup_glossary` | Term lookup |
| `get_prompt` / `list_prompts` | Prompt templates (`get_prompt` supports variables) |
| `search_context` | Search configured context paths |

### Validate & persist

| Tool | Purpose |
|------|---------|
| `validate_context` | Verify manifest paths exist |
| `add_learning` | Append to `key-learnings.md` |
| `add_glossary_term` | Append to `glossary.md` |
| `update_feature_status` | Update registry status in `manifest.yaml` |

### Safety & verification

| Tool | Purpose |
|------|---------|
| `request_human_approval` | Structured approval request |
| `verify_action` | Post-condition checks (files, commands, HTTP, JSON) |

The same surface is available from **`@agent-context-kit/langchain`** via `createContextKitTools()`.

## Scaffold a project

Use **`@agent-context-kit/cli`** (`context-kit init`) to generate `manifest.yaml` and `docs/` from the official template.

## License

MIT
