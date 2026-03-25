# @agent-context-kit/toolshed-server

**stdio MCP server** for [agent-context-kit](https://www.npmjs.com/search?q=%40agent-context-kit): reads your project’s **`manifest.yaml`** and serves L0/L1/L2 context as **tools** so LLMs fetch only what they need (Stripe-style Toolshed pattern).

**Requirements:** Node.js **18+**. Run from the directory that contains **`manifest.yaml`** (or pass `--manifest`).

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

If tool names clash with another server, set `toolshed.tool_aliases` in `manifest.yaml`.

## Tools exposed

| Tool | Purpose |
|------|---------|
| `get_project_identity` | L0: values, architecture, glossary |
| `get_rules` | L1: policy + standards |
| `get_learnings` | L2: key learnings |
| `get_spec` | Feature spec from registry |
| `list_registry` | Feature list + status |
| `lookup_glossary` | Term lookup |
| `get_prompt` / `list_prompts` | Prompt templates |

## Scaffold a project

Use **`@agent-context-kit/cli`** (`context-kit init`) to generate `manifest.yaml` and `docs/` from the official template.

## License

MIT
