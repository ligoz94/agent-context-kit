# Features

One Markdown file per significant feature or capability. Use these specs as **Layer 2 (L2)** context: agents load a spec only when the task needs it, via the Toolshed `get_spec` tool (after registering the feature in `manifest.yaml`).

## Conventions

- **`_template.md`** — starting point for new specs; copy and rename (do not register `_template` in the registry).
- **Naming** — use kebab-case filenames (e.g. `auth-flow.md`) that match the `registry[].name` you choose in `manifest.yaml`.
- **Registry** — add an entry under `registry:` in `manifest.yaml` with `name`, `path`, and `status` (`stable` | `wip` | `deprecated`) so the MCP server can expose the doc.

## Related

- Root manifest: `manifest.yaml`
- Agent context layers: `docs/agent/`
