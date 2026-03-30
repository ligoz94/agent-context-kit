# Implement feature

Use when a **spec (or equivalent) exists and is clear and approved** per team rules — you are ready to write code.

## When to use

| Situation | Action |
|-----------|--------|
| Spec ready and approved | **this prompt** |
| Spec missing, ambiguous, or incomplete | **update-docs** first |
| Undocumented edge cases appear | **update-docs** — pause implementation |
| Unsure if a spec exists | **update-docs** or ask |

Typical sequence: **update-docs** → **implement-feature**.

## Reading order

0. **Project doc index** — feature registry, paths in `manifest.yaml`
1. **[values.md](../values.md)**
2. **[context-policy.md](../context-policy.md)**
3. **Spec** (`get_spec` / files under `docs/features/`)
4. **[architecture-primer.md](../architecture-primer.md)** if the module is new to you

> **Toolshed MCP**: `list_registry` → `get_spec`, `lookup_glossary`, `get_rules`.

## Pre-implementation checklist

- [ ] Intent and non-goals clear
- [ ] Acceptance criteria and failure states known
- [ ] Security / data boundaries clear
- [ ] Ambiguity documented or resolved

## Process

1. Extract explicit intent from the spec (objective, constraints, non-goals, I/O, failures, security, acceptance).
2. If critical fields are empty: **stop** and clarify or run **update-docs**.
3. Plan implementation (brief plan in PR description is fine).
4. Implement per repo standards (`rules.standards`, linter, tests).
5. Run relevant tests.
6. Open PR with traceability to the spec and risk notes (per `values.md`).

## Intent template (internal)

Use to avoid missing fields; align with your spec template.

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

## If the spec must change

Do not “fix” the spec only in code. Typical workflow:

1. Stop implementation
2. PR or doc update with rationale and impact
3. Team approval
4. Resume on updated spec

## After implementation

Tests green → **finish**. Substantial changes → **full-review** in a **new** thread.

## PR

Template from `values.md` or internal convention. For handoff to review, paste a clear block: **Intent**, **Spec traceability**, **Assumptions** (if any remain unresolved, run **update-docs** before merge).

## Remember

Agents execute explicit intent: product goal → technical intent → plan → code.
