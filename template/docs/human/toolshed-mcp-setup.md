# Toolshed MCP server — setup guide

This guide configures **`@agent-context-kit/toolshed-server`** so your editor or client can call Toolshed tools (`get_project_identity`, `get_guardrails`, `get_rules`, `get_spec`, `search_context`, etc.) against **your** project’s `manifest.yaml` and `docs/`.

## Prerequisites

- **Node.js 18+** on the machine that runs the MCP client (your laptop or dev container).
- A project that has run **`context-kit init`** (or equivalent): `manifest.yaml` at the project root and the `docs/` tree.

## Before the package exists on npm (`E404` from `npx`)

`npx @agent-context-kit/toolshed-server` only works **after** the package is **published** to the npm registry. Until then, run the built server from a local checkout:

1. In the **agent-context-kit** repo: `npm install && npm run build` (or `npm run build -w @agent-context-kit/toolshed-server`).
2. In Cursor’s MCP config, use **`node`** and the **`dist/index.js`** path (see below).

**Cursor** — workspace = agent-context-kit repo root, manifest e.g. `template/manifest.yaml`:

```json
{
  "mcpServers": {
    "toolshed": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/toolshed-server/dist/index.js",
        "--manifest",
        "${workspaceFolder}/template/manifest.yaml"
      ]
    }
  }
}
```

Optional profile (merges `profiles.<name>` in the manifest):

```json
"args": [
  "${workspaceFolder}/packages/toolshed-server/dist/index.js",
  "--manifest",
  "${workspaceFolder}/template/manifest.yaml",
  "--profile",
  "backend"
]
```

For **another project** on disk, use absolute paths or set `"cwd"` to that project and pass `--manifest` relative to it.

Alternatives: `npm link` inside `packages/toolshed-server` then `"command": "toolshed-server"`, or `file:../path/to/packages/toolshed-server` in a local package — same idea: do not rely on the public registry until published.

## What the server needs

1. **Working directory (`cwd`)** — usually the **project root** (the directory that contains `manifest.yaml`). Path entries in the manifest resolve relative to the manifest file’s directory.
2. **Optional: custom manifest path** — add `--manifest /absolute/or/relative/path/to/manifest.yaml` if the file is not named `manifest.yaml` or not at the repo root.
3. **Optional: profile** — `--profile <name>` deep-merges `profiles.<name>` from the manifest (e.g. different guardrails per agent).

## How many MCP servers?

Each MCP server exposes **tool definitions** (names, parameters, descriptions). Those definitions usually consume **context on every turn** unless your client supports **lazy tool discovery** (sometimes called tool search). Even with lazy loading, a long server list still adds noise and failure modes.

**Practical guidance:**

- Treat **Toolshed** as your **project context** server (L0/L1/L2 from this kit). It does not replace GitHub, web search, extra filesystem roots, or DB introspection — add those only when needed.
- Prefer a **small, justified** set of servers (often on the order of a handful). Remove servers you are not actively using.
- If two servers expose overlapping tools, use **`toolshed.tool_aliases`** (and client-specific renames) to avoid collisions.

For a conceptual map (plan mode, path rules, hooks, worktrees) see **[agent-context-power-user-stack.md](agent-context-power-user-stack.md)**.

## Claude Desktop

Edit the MCP config file (platform-specific path — see [Anthropic MCP docs](https://modelcontextprotocol.io/quickstart/user)) and add:

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

- Replace `cwd` with your real project root.
- `-y` skips the npx install prompt on first run.

**Custom manifest:**

```json
"args": ["-y", "@agent-context-kit/toolshed-server", "--manifest", "./config/manifest.yaml"]
```

**Profile:**

```json
"args": ["-y", "@agent-context-kit/toolshed-server", "--profile", "frontend"]
```

Paths in `args` are resolved from `cwd`.

## Cursor

Keep your **enabled MCP server list small** (each server adds tool schemas to context). See [Cursor alignment](agent-context-power-user-stack.md#cursor-alignment) in **agent-context-power-user-stack.md**.

1. Open **Cursor Settings → MCP** (or edit the MCP JSON your workspace uses).
2. Add a server entry equivalent to:

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

Use the **same rules** as Claude Desktop: `cwd` = root with `manifest.yaml`. Restart the MCP connection or Cursor after changes.

## Tool name collisions

If another server already exposes tools with the same names, set **`toolshed.tool_aliases`** in `manifest.yaml` (see the kit README / manifest comments). Aliases apply to both listing and invocation.

## Verify locally (stdio)

From your project root:

```bash
npx -y @agent-context-kit/toolshed-server
```

You should see stderr like `[toolshed] Running. Manifest: .../manifest.yaml`. The process speaks MCP over stdio; to fully test tools, use your client’s MCP UI or a small MCP-aware client — do not expect interactive output in the terminal beyond that log line.

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Server exits immediately | `manifest.yaml` missing at default path; use `--manifest` or fix `cwd`. |
| Tools return “file not found” | Paths in `manifest.yaml` are relative to the manifest file’s directory; fix paths or move `cwd`. |
| `npx` slow every time | Prefer a global install (`npm i -g @agent-context-kit/toolshed-server`) and set `"command": "toolshed-server"` if your environment allows it. |
| `npm error 404` for `@agent-context-kit/toolshed-server` | Package not published yet — use **`node`** + local `dist/index.js` (section above) or publish / private registry. |
| Wrong project’s docs | Wrong `cwd` — each MCP server instance should point at one project root. |
| Profile not applied | Use `--profile <name>` and ensure `profiles.<name>` exists in `manifest.yaml`. |

## Related

- Package: `@agent-context-kit/toolshed-server`
- Full tool list and CLI: root **README** of the agent-context-kit repo
