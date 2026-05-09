# Feature: toolshed-mcp-integration

## Status

stable

## Purpose

Define how the project exposes structured context to agents through the Toolshed MCP server and related editor setup.

## Canonical Sources

- `manifest.yaml`
- `docs/human/toolshed-mcp-setup.md`
- `docs/agent/app-config.md`
- `README.md`

## Load This When

- You are wiring Toolshed into Claude Code, Cursor, or another MCP client.
- You are deciding which MCP tools to call first for a task.
- You are debugging missing manifest data, tool aliases, or profile behavior.

## Notes For Agents

- Start with `get_project_identity` and `get_guardrails`, then open project-specific L0 files that are not part of the manifest identity bundle.
- Use `list_registry` before `get_spec` so feature selection stays narrow.
- Keep tool aliases and profiles documented in `manifest.yaml`; do not duplicate that source of truth elsewhere.