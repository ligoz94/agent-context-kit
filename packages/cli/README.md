# @agent-context-kit/cli

CLI **`context-kit`** for [agent-context-kit](https://www.npmjs.com/search?q=%40agent-context-kit): scaffold layered LLM context (`docs/agent/`, `manifest.yaml`) and keep engine-managed doc regions in sync.

**Requirements:** Node.js **18+**.

## Install

```bash
npm install -g @agent-context-kit/cli
```

Or run without installing:

```bash
npx @agent-context-kit/cli --help
```

The `context-kit` command is available after a global install (or via `npx`).

## Quickstart

In **your project root** (empty or existing repo):

```bash
context-kit init
```

This creates `manifest.yaml`, `docs/agent/*`, `docs/features`, `docs/decisions`, `docs/human`, plus **Cursor** (`.cursor/rules/agent-context-kit.mdc`) and **Claude** (`CLAUDE.md`) entry points so agents know how to use the workflow.

Then edit `manifest.yaml` and fill `docs/agent/values.md`, `glossary.md`, etc.

## Commands

| Command | Description |
|--------|-------------|
| `context-kit init` | Scaffold the kit structure in the current directory |
| `context-kit sync` | Update `<!-- agent-context-kit:engine -->` regions from the bundled template; keeps `<!-- agent-context-kit:project -->` blocks |
| `context-kit check` | Check `manifest.yaml` exists, required files, rough token budget warnings |
| `context-kit list` | List prompt files and feature specs in `docs/` |

```bash
context-kit --help
```

## Companion package

Use **`@agent-context-kit/toolshed-server`** to expose the same `manifest.yaml` and docs as **MCP tools** (Cursor, Claude Desktop, etc.).

## License

MIT
