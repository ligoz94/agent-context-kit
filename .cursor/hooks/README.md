# Cursor hooks (project)

This directory pairs with **`.cursor/hooks.json`** at the repo root (same folder as `hooks/` — Cursor resolves `command` paths from the **project root**, e.g. `.cursor/hooks/my-script.sh`).

## Current state

`hooks.json` ships with an **empty** `hooks` object so the file is valid and version-controlled. Add entries when you need deterministic automation (format on save, audit shell, gate MCP, …).

## Docs

- [Cursor Hooks](https://docs.cursor.com/agent/hooks) — events, matchers, `command` vs `prompt`, stdin/stdout JSON.
- Team context: **`template/docs/human/agent-context-power-user-stack.md`** — how hooks complement `manifest.yaml` guardrails and Toolshed.

## Minimal example (paste into `hooks.json`)

Replace `"hooks": {}` with something like (adjust paths and events):

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": ".cursor/hooks/format-staged.sh"
      }
    ]
  }
}
```

Then add an executable script under `.cursor/hooks/` that reads hook JSON from stdin and exits `0`. Prefer **matchers** so hooks do not run on every tool call (see Cursor docs).

**Cross-platform:** shell examples assume a Unix `sh`/`bash`. On Windows, use a `.cmd` file or a small `node` script and point `command` at it.
