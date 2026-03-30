# Finish

Use after implementation or bugfix when tests pass — **before** push.

Combines code review, validation, documentation alignment, and learning capture.

## When to use

| Situation | Use |
|-----------|-----|
| Feature done via **implement-feature** | **this prompt** |
| Bugfix done via **fix-bug** | **this prompt** |
| Closing **fix-pr** loop | usually **skip** — fix-pr already covers push/CI |
| Reviewing someone else’s work | **review-pr** |

## Required reading

1. **[values.md](../values.md)** — project principles
2. **Spec or issue** for the work just completed
3. **[key-learnings.md](../key-learnings.md)** if the task touches known edge cases

> **Toolshed MCP**: `get_spec`, `list_registry`, `get_learnings` instead of opening everything manually.

## Steps

### 1. Code review

Review the diff (self-review or checklist):

- Correctness vs spec
- Architectural boundaries (dependencies, layering)
- Completeness: call sites, stale references, dead code
- Test coverage

### 2. Fix blockers

Resolve blocking findings. Non-blocking: note in PR; do not expand scope.

### 3. Validation

Run the repo’s canonical commands (README or CI). Example placeholders — **replace** with real ones:

```bash
# Example — adapt to your project
npm run lint
npm run typecheck   # or equivalent
npm test
npm run format:check  # if present
```

### 4. Output verification (not only snapshots)

If the team uses snapshots/stories/visual tests: verify **content** is correct, not only that files updated.

Skip if the change is documentation-only.

### 5. Documentation alignment

- Feature doc / spec: still accurate?
- `manifest.yaml` registry / `docs/features/`: status updated if your process requires it?
- Code comments: stale references?

Small fixes here; large doc rewrites → issue or follow-up **update-docs**.

### 6. Key learnings

If you discovered non-obvious constraints, consider an entry in [key-learnings.md](../key-learnings.md) using the file’s existing format.

### 7. Summary

```
## Finish summary

**Review**: [n] findings — [n] fixed, [n] deferred to PR
**Validation**: lint / types / tests / format
**Output verification**: verified | skipped (docs-only) | N/A
**Docs updated**: [list or "none"]
**Learnings**: [entry title or "none"]
**Ready to push**: yes | no — [blockers]
```

## Next step (agent instruction)

- If **Ready to push: yes** → ask whether to commit/push and run review in a new thread.
- If **no** → list blockers; re-run **finish** after fixes.

## Anti-patterns

- Scope creep beyond review and docs tied to the change
- Skipping local CI-equivalent commands
- Updating docs unrelated to the work
- Learnings for obvious facts
