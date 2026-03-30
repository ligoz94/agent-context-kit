# Development workflow

End-to-end pipeline from idea to merge, reusable in any repo using agent-context-kit.

## Pipeline

```
Issue / idea → Docs + spec → [human gate] → Implement → Verify → PR → Review → Merge
```

### 1. Documentation alignment

Use **update-docs** (`get_prompt` name `update-docs`): align feature docs and specs with the issue, PR, or requirement.

**Human gate**: where practical, an approved spec (e.g. merged to main) before large implementation.

### 2. Implementation

Use **implement-feature** when the spec is clear and approved per team rules.

Fix lint/type issues per CI and `manifest.yaml` standards.

If a spec gap appears: **stop**, run **update-docs**, wait for approval, resume.

### 3. Verification

After implementation, before push:

1. Start the local environment per project README (dev server, seeds, etc.).
2. Run automated tests (unit/integration) defined by the repo.
3. For UI changes, if available: **ui-test** (browser automation) or a manual checklist from the spec.
4. After repeated failures: stop and involve a human.

### 4. Finish and push

1. Run **finish** — review, validation, doc alignment, learnings.
2. Commit and open a PR using the template in `values.md` (or team convention).

### 5. Review (fresh context)

For important reviews, prefer a **new conversation** to reduce confirmation bias.

- **review-pr**: spec compliance, security, standards
- **full-review**: deeper multi-dimension pass (non-trivial changes)

If critical issues appear: fix in the implementation thread, push again, re-review.

### 6. CI and comments

1. **fix-pr**: triage review threads + CI failures, fix, push, wait for green CI.

**Human gate**: merge and deploy by humans unless policy says otherwise.

## Failure handling

| Failure | Action |
|--------|--------|
| Spec gap during implementation | Stop → update-docs → approval → resume |
| Failing tests (first iterations) | Fix and retry |
| Tests keep failing | Stop, human input |
| Review finds CRITICAL | Fix, push, new review thread if useful |
| Flaky CI | Re-run once; if still red, investigate |
| Real CI failure | Fix and push |

## Session handoff

Before closing a long thread, leave a stable block:

```markdown
## Handoff

- **Branch:**
- **Spec / doc paths:**
- **Intent (1–3 sentences):**
- **Files touched:**
- **Tests run / pending:**
- **Blockers:**
```

## Re-anchor

For long threads: repeat a short objective, spec paths, non-goals. See [context-policy.md](../context-policy.md).
