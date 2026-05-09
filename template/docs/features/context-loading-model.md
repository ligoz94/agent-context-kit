# Feature: context-loading-model

## Status

stable

## Purpose

Define how agents load project context in layers so they stay grounded without overloading the context window.

## Canonical Sources

- `docs/agent/context-policy.md`
- `docs/agent/app-config.md`
- `docs/agent/product-context.md`
- `docs/README.md`

## Load This When

- The task is about agent orientation, prompt routing, or context budgets.
- You need to explain which files belong to L0, L1, or L2.
- You are debugging why an agent missed required project context.

## Notes For Agents

- `get_project_identity` does not include `app-config.md` or `product-context.md`; open them manually after MCP orientation.
- Use the feature register in `docs/README.md` to choose one relevant feature doc instead of bulk-loading `docs/features/`.
- Treat this file as the high-level brief and keep the detailed loading contract in `docs/agent/context-policy.md`.