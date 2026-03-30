# Update docs

Align documentation (feature doc, spec, registry) with an issue, PR, or new requirement **before** large implementation.

## When to use

| Situation | Use |
|-----------|-----|
| Issue or ticket to capture in docs | **this prompt** |
| Feature doc stale or missing | **this prompt** |
| No implementable spec yet | **this prompt** |
| Gaps or ambiguity in the spec | **this prompt** |
| Behavior discovered only during coding | **this prompt** |
| Spec approved and ready to code | **implement-feature** |

## Reading

0. **Project layout** — `manifest.yaml` (`registry`, identity/rules paths)
1. **[values.md](../values.md)**
2. **Feature template** — e.g. [docs/features/_template.md](../../features/_template.md)
3. **Spec template** — e.g. [docs/features/specs/_template.md](../../features/specs/_template.md)

> **Toolshed MCP**: `list_registry`, `get_spec`, `search_context`, `validate_context`.

## Process

### 1 — Resolve input

| Source | How to read |
|--------|--------------|
| GitHub issue | `gh issue view <n>` (title, body, comments) |
| PR | `gh pr view <n>` + description |
| Chat text | Extract explicit requirements; if too vague, **stop** and ask |

### 2 — Extract intent

Fill or verify at least:

```
Objective:
Constraints:
Non-goals:
Data inputs:
Data outputs:
Failure states:
Security boundaries:
Acceptance criteria:
```

Critical fields empty → clarification, not silent inference.

### 3 — Triage: what to update?

Search existing docs (`docs/features/`, registry in `manifest.yaml`). Produce a checklist:

```
- [ ] Feature doc: path — create | update | ok
- [ ] Spec: path — create | update | ok
- [ ] Cross-references — update | ok
- [ ] Registry / feature README — update | ok
```

### 4 — Feature doc (WHAT / WHY)

Align product sections, flows, UI notes, user-visible constraints. **Do not** put detailed implementation tasks here if the team keeps them in the spec.

### 5 — Spec (HOW)

Update or create per repo template: parsed intent, unknowns, tasks, validation plan, risks, testable acceptance criteria.

### 6 — Cross-feature consistency

Search other features that mention the same domain; update summaries and links.

### 7 — Coverage

Table: requirement from source → feature doc section → spec task or section.

### 8 — Registry

Update `manifest.yaml` `registry` or `docs/features/README.md` if the project uses them.

### 9 — Summary

```
## Docs updated
- path: what changed

## Coverage
N/M requirements traced

## Unresolved
- remaining ambiguity
```

## Design doc vs spec

- **Feature / design doc**: what and why, product-oriented.
- **Spec**: how, tasks, contracts, implementation tracking.

If design and spec diverge: update product/design intent first, then the spec.

## Anti-patterns

Implicit requirements, retroactive spec edits to justify code already written, duplication instead of links, doc scope wider than the input.

## Next step (agent instruction)

When docs are aligned: remind that heavy implementation follows team rules (e.g. spec on main). Then **implement-feature**.

## Remember

An issue is a signal of intent, not a spec. Make intent traceable and verifiable here.
