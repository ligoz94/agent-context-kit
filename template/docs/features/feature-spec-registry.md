# Feature: feature-spec-registry

## Status

stable

## Purpose

Keep feature documentation addressable by both humans and MCP tools through a stable registry and one real feature document per entry.

## Canonical Sources

- `manifest.yaml`
- `docs/features/README.md`
- `docs/README.md`

## Load This When

- You are adding or renaming a feature doc.
- You are debugging `list_registry`, `get_spec`, or `update_feature_status` behavior.
- You need to explain how `context-kit new-spec` changes project docs.

## Notes For Agents

- Every registry entry needs a stable kebab-case `name`, a real markdown `path`, and a `status`.
- Keep `manifest.yaml` and the human-facing feature register in `docs/README.md` aligned.
- Prefer one top-level feature brief per major area, then add feature-local decision specs only when needed.