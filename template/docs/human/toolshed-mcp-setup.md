# Toolshed MCP server — setup guide

This guide configures **`@agent-context-kit/toolshed-server`** so your editor or client can call Toolshed tools (`get_project_identity`, `get_rules`, `get_spec`, etc.) against **your** project’s `manifest.yaml` and `docs/`.

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

For **another project** on disk, use absolute paths or set `"cwd"` to that project and pass `--manifest` relative to it.

Alternatives: `npm link` inside `packages/toolshed-server` then `"command": "toolshed-server"`, or `file:../path/to/packages/toolshed-server` in a local package — same idea: do not rely on the public registry until published.

## What the server needs

1. **Working directory (`cwd`)** — must be the **project root** (the directory that contains `manifest.yaml`). The server resolves every path in the manifest relative to that file’s directory.
2. **Optional: custom manifest path** — add `--manifest /absolute/or/relative/path/to/manifest.yaml` if the file is not named `manifest.yaml` or not at the repo root.

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

Paths in `args` are resolved from `cwd`.

## Cursor

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

If another server already exposes tools with the same names, set **`toolshed.tool_aliases`** in `manifest.yaml` (see the root README / manifest comments). Aliases apply to both listing and invocation.

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

## Related

- Package: `@agent-context-kit/toolshed-server`
- Manifest reference: `manifest.yaml` in this repo’s README
