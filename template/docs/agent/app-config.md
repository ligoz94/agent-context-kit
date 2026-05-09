# App Config

<!-- agent-context-kit:engine:start -->
App-specific paths, package names, tooling, and MCP config.
Read as part of L0 to resolve all project-specific references in shared prompts.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->

## Identity

- **Project name:** `my-project`
- **Primary language:** TypeScript
- **Stack:** (e.g. react, postgres, redis)
- **Dev command:** `npm run dev`
- **Test command:** `npm test`
- **Lint command:** `npm run lint`
- **Type check:** `npx tsc --noEmit`

## Paths

| What | Path |
|------|------|
| Feature docs | `docs/features/` |
| Feature register | `docs/README.md` |
| Architecture primer | `docs/agent/architecture-primer.md` |
| Key learnings | `docs/agent/key-learnings.md` |
| Prompt templates | `docs/agent/prompts/` |
| Decisions / ADRs | `docs/decisions/` |

## Spec System

- Feature specs live in `docs/features/` (single file or folder + `specs/` for decision records)
- Scaffold a new spec: `context-kit new-spec <name>`
- Register every feature in `docs/README.md` feature register and `manifest.yaml registry`

## MCP Toolshed

Toolshed MCP is configured in `.mcp.json` (Claude Code) or `.cursor/mcp.json` (Cursor).

When available, prefer MCP tools over manually opening files:

| Task | Tool |
|------|------|
| Orientation | `get_project_identity`, `get_guardrails` |
| Feature spec | `list_registry` → `get_spec` |
| Learnings | `get_learnings` |
| Glossary | `lookup_glossary` |
| Prompts | `list_prompts`, `get_prompt` |
| Search | `search_context` |

<!-- agent-context-kit:project:end -->
