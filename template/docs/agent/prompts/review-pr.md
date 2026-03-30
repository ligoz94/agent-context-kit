# Review PR

Review a pull request against specs and project standards.

## Reading

1. **[context-policy.md](../context-policy.md)** — prefer fresh context (see [development-workflow.md](development-workflow.md))
2. **[values.md](../values.md)**
3. **Spec** and **feature doc** for the change
4. **PR description** and diff

> **Toolshed MCP**: `get_spec`, `get_rules`, `lookup_glossary`.

If the author pasted a handoff block (Intent / Spec traceability / Assumptions), treat it as the reference snapshot for this review.

## Shared dimensions

Run all checklists in [_review-dimensions.md](_review-dimensions.md) (intent, security, standards, tests, spec freshness, layering).

## PR-specific dimensions

### Completeness

- [ ] Spec acceptance criteria satisfied
- [ ] Edge cases from failure states covered or explicitly out of scope
- [ ] Tests appropriate to change risk

### Risk assessment

If the team requires it in PRs: security impact, data exposure, breaking changes, unhandled failures.

### Assumptions

- [ ] Assumptions listed or explicitly “none”
- [ ] Implicit assumptions in code without spec → request clarification or spec update

### Anti-patterns from values

Implicit requirements, spec drift, silent out-of-scope refactor, trusted input, “done” without correctness.

### Agent report (if your team uses it)

Structured section in PR: required fields, integer counts where required, consistency between declared scope and diff.

## Approval checklist

Approve only if **all** applicable items pass. When in doubt, **do not** approve — ask.

## Example responses (adapt tone)

- Behavior beyond spec → remove or open spec update first.
- Missing risk assessment → request standard fields.
- Security boundary violation → block until reviewed.

## Next step (agent instruction)

- Findings exist → suggest **fix-pr** or manual fixes and re-review.
- No findings and PR is sound → “Ready for human merge.”

## Remember

Judge against **spec and docs**, not personal intuition of how it “should” work.
