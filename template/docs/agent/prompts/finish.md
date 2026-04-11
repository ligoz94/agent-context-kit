# Finish Prompt

Use after implementation is complete and tests pass — before pushing.

Combines code review, validation, doc alignment, and learning capture into a single pre-push gate.

## When to Use

| Situation                                      | Use                                           |
| ---------------------------------------------- | --------------------------------------------- |
| Done coding a feature via `/implement-feature` | **this prompt**                               |
| Done fixing a bug via `/fix-bug`               | **this prompt**                               |
| Done fixing PR findings via `/fix-pr`          | skip — `/fix-pr` already validates and pushes |
| Reviewing someone else's PR                    | use `/review-pr`                              |

## Required Reading

1. **[Intent Engineering Standard](../values.md)** — principles (already loaded if coming from `/implement-feature` or `/fix-bug`)
2. **Spec** for the work just completed

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `lookup_glossary` instead of manually opening files.

## Steps

### 1. Code Review

Review all changes in this conversation. Check:

- Correctness against spec
- Architectural alignment (module boundaries, dependency direction, layer separation)
- Completeness — stale references, missed call sites, dead code from refactoring
- Test coverage — sufficient? gaps?
- Runtime bugs the changes introduce

### 2. Fix Blocking Issues

Fix all blocking findings from the review. Non-blocking issues: note in PR description, don't fix now.

### 3. Validation

Run the repo's canonical commands (from README, CLAUDE.md, or CI). Placeholders — **replace** with real ones:

```bash
# Types
<typecheck-command>

# Lint
<lint-command>

# Tests
<test-command>

# Formatting
<format-check-command>
```

Fix any failures. If snapshot updates are needed, verify the content is **correct**, not just consistent — snapshots freeze whatever renders; they don't validate intent.

### 4. Output Verification

Skip this step if the change is docs-only.

After tests and snapshots pass, verify the output is **correct**, not just **consistent**.

**UI changes — stories or visual tests:**

1. Confirm a story variant exercises the specific behavior you changed (a `Default` story showing empty/fallback state is not sufficient for verifying a fix)
2. After generating snapshot baselines, verify rendered content is correct
3. If the rendered output is wrong — fix the component or mock data, don't just update the snapshot

**API changes — controller/handler tests:**

1. Confirm a test covers the changed endpoint/handler
2. After updating test snapshots, verify the response shape and values are correct
3. Check that new fields appear with realistic values, not `null` or placeholder data

### 5. Doc Alignment

Search for documentation now out of sync with code changes. Check:

- **Feature doc** — does it still describe current behavior?
- **Spec** — update acceptance criteria checkboxes to match what was built
- **Feature register** — update status if feature moved to Implemented/Partially Implemented
- **Domain docs** — if domain concepts changed
- **Backend docs** — if API shape or entity fields changed
- **Code comments** in changed and related files — stale references?

Update stale references to match the implementation. Small fixes only — if doc changes are large, note them for a follow-up `/update-docs`.

### 6. Key Learnings

If the work revealed non-obvious behavior (gotchas, data model quirks, pattern choices that weren't apparent from reading code), consider adding to the app's key-learnings.md.

Criteria for inclusion — would an agent implementing something new in this area hit the same problem?

- What was the root cause or non-obvious constraint?
- What pattern prevents it?
- Is it generalizable beyond this one task?

If yes, add an entry following the existing format in key-learnings.md.

### 7. Summary

Output a brief summary:

```
## Finish Summary

**Review**: [n] findings — [n] fixed, [n] noted for PR
**Validation**: types / lint / tests / format
**Output verification**: verified | skipped (docs-only) | N/A
**Docs updated**: [list of files, or "none"]
**Key learnings**: [added entry title, or "none"]
**Ready to push**: yes | no — [blockers]
```

## Next Step

> **Agent instruction**: After outputting the finish summary:
>
> - If **Ready to push: yes** → commit, push, and reset AI review status:
>   ```bash
>   gh pr edit <number> --remove-label "ai:reviewing,ai:reviewed,ai:changes-requested,ai:review-stale" --add-label "ai:not-reviewed"
>   ```
>   Then prompt: _"Pushed and labeled `ai:not-reviewed`. Run `/review-pr` in a new conversation?"_
> - If **Ready to push: no** → list blockers and prompt: _"Fix these blockers, then re-run `/finish`."_

## Anti-Patterns

- **Scope creep** — fix review findings and stale docs, nothing else
- **Skipping validation** — "it worked when I tested manually" is not sufficient
- **Updating docs you didn't affect** — only sync docs related to your changes
- **Adding key learnings for obvious things** — only non-obvious, non-derivable-from-code facts
- **Blocking on non-blocking findings** — note them, move on
