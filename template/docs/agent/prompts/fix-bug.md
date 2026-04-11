# Fix Bug Prompt

Use this prompt when fixing a bug in existing functionality.

## Required Reading (in order)

1. **[Intent Engineering Standard](../values.md)** — agent principles & workflow (MUST READ FIRST)
2. **[Context policy](../context-policy.md)** — L0/L1/L2; open app's key-learnings.md (L2) for non-obvious regressions
3. **Related spec** for the buggy feature (find via app's feature register)
4. **Design doc** for context (find via app's feature register)
5. **Domain docs** if bug involves domain logic (path in app-config.md § Paths)

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `lookup_glossary` instead of manually opening files.

## Pre-Fix Checklist

Before fixing, verify:

- [ ] I have read [values.md](../values.md) in full
- [ ] I understand the intended behavior from spec/design docs
- [ ] I can trace the bug to a gap between spec and implementation
- [ ] I know whether this is a code bug or spec bug
- [ ] Security implications are understood

## Bug Classification

### 1. Code Bug (Implementation doesn't match spec)

**Fix**: Update code to match spec

### 2. Spec Bug (Spec is incomplete/wrong)

**Fix**: Follow [Spec Update Workflow](../values.md#spec-update-workflow):

1. Stop implementation
2. Open Spec PR documenting the issue
3. Await approval
4. Fix code against updated spec

### 3. Design Bug (Feature intent is flawed)

**Fix**: Escalate to product/design. Don't proceed until design is updated.

## Bug Fix Process

From [Intent Engineering Standard](../values.md):

1. **Reproduce** the bug
2. **Trace** to spec/design doc
3. **Classify** (code/spec/design bug)
4. **If spec bug**: Update spec first ([Spec Update Workflow](../values.md#spec-update-workflow))
5. **If code bug**: Fix following acceptance criteria
6. **Add test** that would have caught this bug
7. **Verify** no regression
8. **If fix required non-obvious reasoning about system behavior**: add entry to app's key-learnings.md
9. **Open PR** with root cause analysis

## PR Template

Use the template from [values.md PR Structure Standard](../values.md#pr-structure-standard). Include the "Root Cause" section (it's for bug-fix PRs). Agent Report fields are defined in [Agent Report](../values.md#agent-report-canonical-fields).

## Anti-Patterns to Avoid

From [Anti-Patterns](../values.md#anti-patterns):

- **Fixing symptoms, not root cause** — trace to spec first
- **Silent spec updates in code** — update spec as separate PR
- **Scope creep** — fix only the bug, no "while I'm here" refactors
- **Assuming context** — verify against spec, don't rely on memory
- **Skipping tests** — every bug fix needs a regression test

## If Bug Reveals Spec Gap

Follow [Spec Update Workflow](../values.md#spec-update-workflow):

1. **Document** the gap explicitly
2. **Propose** spec update with:
   - What was underspecified
   - Why it led to bug
   - How spec should be clarified
3. **Wait for approval**
4. **Implement fix** against updated spec

## Testing Requirements

Every bug fix must include:

- [ ] Test that reproduces the bug (fails before fix)
- [ ] Test passes after fix
- [ ] Related tests still pass (no regression)
- [ ] Edge cases covered (if bug was edge case related)

## Post-Fix: Finish

After fix is complete and tests pass, run **`/finish`** — the pre-push gate that reviews code, validates, aligns docs, and captures learnings.

> **Agent instruction**: When the fix is complete and tests pass, prompt the user: _"Fix complete. Run `/finish` to review, validate, and align docs before pushing?"_

For non-trivial fixes (multi-file, spec updates, new patterns), also run **`/full-review`** in a **NEW conversation**.

## Remember

> **Correctness > Completion** ([values.md](../values.md#correctness--completion))
>
> False negatives (refusal, clarification) are preferable to false positives (confidently wrong).

Take time to understand the bug fully before fixing. A rushed fix often creates more bugs.
