# Full review

Deep review of a feature, module, or system area. Use for non-trivial or high-risk changes.

## Reading order

1. **[values.md](../values.md)**
2. **Design / feature docs** and **specs** (`list_registry` → `get_spec`)
3. **[architecture-primer.md](../architecture-primer.md)**
4. Human standards in `manifest.yaml` → `rules.standards`
5. **[key-learnings.md](../key-learnings.md)**

> **Toolshed MCP**: `get_spec`, `get_rules`, `get_learnings`, `search_context`.

## Pre-review checklist

- [ ] Review scope defined
- [ ] You know what counts as a valid finding and severity
- [ ] Access to relevant specs and code

## Finding format

For each finding:

```text
[SEVERITY] DIMENSION > File/Module > Short title
Detail: what is wrong and user/system impact
Fix: concrete action
Spec impact: doc to update, if any
```

### Severity (example scale)

- **CRITICAL** — security, data loss, severe crash
- **HIGH** — core behavior broken, major user impact
- **MEDIUM** — UX degradation, problematic performance
- **LOW** — quality, maintainability
- **INFO** — optional improvements

## Shared dimensions (1–6)

Apply every checklist in [_review-dimensions.md](_review-dimensions.md):

1. Intent alignment  
2. Security boundaries  
3. Code standards  
4. Tests  
5. Spec freshness  
6. Layering (if defined)

## Deep dimensions (7–12)

### 7. Data integrity

Mutation error handling, validation, races, null safety, persistence consistency.

### 8. User experience

Flows, error messages, loading/empty/success, responsive where applicable.

### 9. Performance

Re-renders, heavy queries, pagination, leaks, bundle if relevant.

### 10. Domain correctness

Business rules, units, terminology, documented invariants.

### 11. Accessibility

If UI: keyboard, screen reader, contrast, focus, ARIA where needed.

### 12. Documentation

Specs and docs match real behavior; acceptance criteria current.

## Output

Group by dimension and severity. End with phased actions (immediate / next / backlog) and docs to update.

## Anti-patterns

- False positives without evidence
- Style nitpicks without impact
- Full redesign out of scope
- Judging by intuition instead of spec

## Remember

Better to flag uncertainty than a non-issue. Rushed review creates noise.

## Quick start (copy)

```markdown
# System review: [Feature/Module]

**Scope:**
**Specs:**
**Docs:**

## Summary
- Total findings: …
- By severity: …

## Findings by dimension
…

## Recommended actions
…

## Doc updates
…
```
