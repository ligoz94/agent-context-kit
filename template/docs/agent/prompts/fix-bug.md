# Fix bug

Use when fixing a bug in existing functionality.

## Reading order

1. **[values.md](../values.md)**
2. **[context-policy.md](../context-policy.md)** — L0/L1/L2
3. **Spec or feature** (registry in `manifest.yaml` → `docs/features/`)
4. **[architecture-primer.md](../architecture-primer.md)** if the flow is unclear
5. **[key-learnings.md](../key-learnings.md)** for known regressions

> **Toolshed MCP**: `list_registry` → `get_spec`, `get_learnings`, `lookup_glossary`.

## Pre-fix checklist

- [ ] Expected behavior clear from spec or product
- [ ] Can trace the bug to spec↔code gap or regression
- [ ] Know whether it is code, spec, or product-intent issue
- [ ] Security implications considered

## Classification

### 1. Code bug (implementation ≠ spec)

**Action**: fix code to match the spec.

### 2. Spec bug (spec incomplete or wrong)

**Action**: update spec (PR or doc) per team workflow, then implement.

### 3. Product / design bug

**Action**: escalate; do not invent behavior.

## Process

1. **Reproduce** the bug
2. **Trace** to spec / design
3. **Classify** (code / spec / product)
4. If spec: **update spec first** (team policy)
5. If code: **fix** + **regression test**
6. **Verify** related tests still pass
7. If non-obvious insight: **key-learnings**
8. **PR** with root cause analysis if the team requires it

## PR

Follow the PR template in `values.md` or repo conventions. For bugfixes include root cause and how the test prevents recurrence.

## Anti-patterns

- Fixing symptoms without root cause
- Silently changing spec only in code
- Scope creep (“while I’m here…”)
- Bugfix without regression test

## After the fix

When tests pass, run **finish** before push.

For complex fixes (multi-file, security, contract change), consider **full-review** in a **new** thread.

## Remember

Prefer refusal and clarification over a confident wrong fix. Understand before you patch.
