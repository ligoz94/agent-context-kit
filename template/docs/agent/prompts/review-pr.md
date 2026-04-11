# Review PR Prompt

Use this prompt when reviewing a pull request.

## Required Reading

1. **[Context policy](../context-policy.md)** — L0/L1; use fresh chat (see [development-workflow.md](development-workflow.md))
2. **[Intent Engineering Standard](../values.md)** — review criteria and standards
3. **Related Spec** — what was supposed to be implemented?
4. **Related Design Doc** — high-level feature context

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `lookup_glossary` instead of manually opening files.

If the implementer used [implement-feature.md § Chain to review](implement-feature.md#chain-to-review-structured-io), expect a `<handoff_from_implementation>` block — treat its contents as the authoritative intent/traceability snapshot for this review.

## Step 0 — Acquire review lock

Before starting the review, claim the PR to reduce duplicate concurrent reviews (best-effort — the check-then-set is not atomic; see [pr-labeling.md](../pr-labeling.md)):

```bash
CURRENT=$(gh pr view <number> --json labels --jq '.labels[].name')
if echo "$CURRENT" | grep -q '^ai:reviewing$'; then
  echo "Review already in progress — aborting"
  exit 1
fi
gh pr edit <number> --remove-label "ai:not-reviewed,ai:review-stale,ai:reviewed,ai:changes-requested" --add-label "ai:reviewing"
```

If `ai:reviewing` is already set, **stop** — another agent is reviewing this PR. Inform the user and do not proceed.

## PR Classification

Before reviewing, classify the PR:

| Type            | Criteria                                                                                   | Required                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minor**       | Human-authored; config files, doc tweaks, thin wrappers, single-file changes with no logic | Clear description explaining intent. Use the lightweight Minor flow only; skip the shared dimensions, PR-specific dimensions, scoring rubric, and full checklist below. Do not require Agent Report, Risk Assessment, or Assumptions checklist items. |
| **Substantive** | Agent-authored, or any feature/fix/refactor regardless of author                           | Run the full review flow below                                                                                                                                                                                                                        |

If **Minor**: verify only that the description explains what changed and why, check for obvious risks or regressions, then approve or note issues. Apply `ai:reviewed` when you approve, or `ai:changes-requested` when changes are needed, then stop.

## Review Dimensions

The sections below apply only to **Substantive** PRs.

### Shared dimensions

Read and run all checklists in [\_review-dimensions.md](_review-dimensions.md):

1. **Intent Alignment** — spec → code mapping
2. **Security Boundaries** — no secrets, no unauthorized access
3. **Code Standards** — types, conventions, patterns
4. **Tests** — coverage and quality
5. **Spec Freshness** — traceability comments, acceptance criteria match
6. **Layer Boundaries** — architecture boundaries respected

### PR-specific dimensions

#### Completeness

Check against spec's acceptance criteria:

- [ ] All spec tasks marked complete
- [ ] All acceptance criteria met
- [ ] Edge cases handled (from spec's failure states)
- [ ] Tests cover requirements
- [ ] PR has a linked GitHub issue/story (see [definition below](#what-counts-as-a-linked-issue)), **or** the PR description explicitly states why one isn't needed

##### What counts as a "linked issue"

A PR has a linked GitHub issue/story if **either** of these checks is true:

```bash
# 1. Formal closure reference (Fixes #N, Closes #N, Resolves #N in body)
gh pr view <number> --json closingIssuesReferences --jq '.closingIssuesReferences | length > 0'

# 2. Any #NNN mention anywhere in the PR body
gh pr view <number> --json body --jq '.body | test("#[0-9]+")'
```

**Only flag as missing when BOTH return empty/false.** An `#NNN` mention in free-form prose counts.

**If incomplete**: Don't approve until acceptance criteria met

**If no linked issue and no justification**: Request one

#### Risk Assessment

From [PR Structure Standard](../values.md#pr-structure-standard), PR must include:

- [ ] **Security impact** documented
- [ ] **Data exposure risk** assessed
- [ ] **Breaking changes** identified
- [ ] **Unhandled failure cases** documented

**If missing**: Request risk assessment

#### Assumptions

From [PR Structure Standard](../values.md#pr-structure-standard):

> Explicit list. If assumptions exist, spec is incomplete.

- [ ] Assumptions listed in PR (or stated "None")
- [ ] If assumptions exist: Tag for spec update

**If assumptions hidden in code**: Request explicit documentation

#### Anti-Patterns

From [Anti-Patterns](../values.md#anti-patterns), check for:

- [ ] **No implicit requirements** — everything should be in spec
- [ ] **No spec drift** — code doesn't add unspecified behavior
- [ ] **No silent refactoring** — no renames/reorganization outside scope
- [ ] **No over-broad security assumptions** — input treated as hostile
- [ ] **No completion bias** — not just done, but correct
- [ ] **No logic duplication** — if the PR introduces a utility/hook/transform, verify no equivalent already exists
- [ ] **Field remapping justified** — UI ↔ API field remappings exist only where there is a genuine domain mismatch

**If found**: Request removal or spec update

#### Agent Report

From [Agent Report](../values.md#agent-report-canonical-fields):

- [ ] **Agent Report section present** in PR description with all 7 fields
- [ ] **Counts are integers**, not vague ("a few", "some")
- [ ] **Scope assessment is accurate** — cross-check against spec non-goals
- [ ] **Assumptions definition is correct** — Agent Report counts all _encountered_; PR "Assumptions" lists only _unresolved at merge time_

**If missing**: Request Agent Report section per [values.md Agent Report](../values.md#agent-report-canonical-fields)
**If inaccurate**: Override the agent's self-assessment in review comments

#### Docs Over Memory

From [Design Docs Are the Source of Truth](../values.md#design-docs-are-the-source-of-truth):

> Learnings belong in docs, not in agent memory. Chat history is ephemeral; the repo is permanent.

- [ ] Decisions made during implementation are captured in specs, design docs, or `key-learnings.md` — not left only in PR comments or chat logs
- [ ] If the PR reveals a new pattern or convention, it is documented — not assumed to be "known"

**If violated**: Request documentation update as part of the PR

## Scoring Rubric

Each dimension earns a weighted score: `(checked items / total items) × weight`, rounded to the nearest whole number (`.5` rounds up).

| #   | Dimension           | Weight  |
| --- | ------------------- | ------- |
| 1   | Intent Alignment    | 15      |
| 2   | Security Boundaries | 10      |
| 3   | Code Standards      | 5       |
| 4   | Tests               | 10      |
| 5   | Spec Freshness      | 5       |
| 6   | Layer Boundaries    | 15      |
| 7   | Completeness        | 10      |
| 8   | Risk Assessment     | 5       |
| 9   | Assumptions         | 5       |
| 10  | Anti-Patterns       | 10      |
| 11  | Agent Report        | 5       |
| 12  | Docs Over Memory    | 5       |
|     | **Total**           | **100** |

### Grading Scale

| Grade | Score  |
| ----- | ------ |
| A     | 90–100 |
| B     | 80–89  |
| C     | 70–79  |
| D     | 60–69  |
| F     | < 60   |

### Grade Caps

Applied after score calculation. If multiple caps trigger, take the lowest allowed grade.

1. **Security violation** (any Security Boundaries item unchecked) → **F** — blocks merge
2. **Tests not run** (no tests exist or tests not executed) → **max D** (capped at 69)
3. **No spec traceability** (all Intent Alignment items unchecked, or all Spec Freshness items unchecked) → **max C** (capped at 79)
4. **Layer Boundaries violation** (any Layer Boundaries item unchecked) → **F** — blocks merge

## Review Checklist

Quick checklist for PR approval:

**Shared dimensions** ([\_review-dimensions.md](_review-dimensions.md)):

- [ ] Intent alignment (spec → code, no drift)
- [ ] Security boundaries respected
- [ ] Code standards followed
- [ ] Tests present and passing
- [ ] Spec freshness (traceability comments on module-boundary files)
- [ ] Layer boundaries (architecture boundaries respected)

**PR-specific dimensions:**

- [ ] Acceptance criteria met (completeness)
- [ ] Linked GitHub issue/story present, or justification stated why not needed
- [ ] Risk assessment present
- [ ] Assumptions documented (or stated "None")
- [ ] No anti-patterns (incl. logic duplication, unjustified field remapping)
- [ ] Agent Report present with all 7 fields
- [ ] Docs over memory (learnings captured in repo docs, not chat)

### Verdict

Calculate the score using the [Scoring Rubric](#scoring-rubric). Apply grade caps.

Derive verdict from the **final capped grade** only:

| Verdict                   | Condition                                   |
| ------------------------- | ------------------------------------------- |
| **Approve**               | Final grade A (≥ 90), no findings           |
| **Approve with findings** | Final grade A (≥ 90), non-blocking findings |
| **Request changes**       | Final grade B or C (70–89)                  |
| **Block**                 | Final grade D or F (< 70)                   |

## Finding Severity

Classify each finding during review:

| Severity     | Definition                                                                          |
| ------------ | ----------------------------------------------------------------------------------- |
| **CRITICAL** | Security violation, data exposure, layer boundaries violation, or any F-grade cap   |
| **HIGH**     | Blocks approval — missing spec traceability, untested acceptance criteria, no tests |
| **MEDIUM**   | Should fix but doesn't block — code standards, missing docs, minor test gaps        |
| **LOW**      | Nitpick — style, naming, minor improvements                                         |

## PR Labeling

After the verdict, apply a label based on the **verdict outcome** (see [pr-labeling.md](../pr-labeling.md)):

Use a two-step clear-then-set to prevent stale labels regardless of prior state:

- **Verdict is Approve or Approve with findings** (score ≥ 90, no caps):
  ```bash
  gh pr edit <number> --remove-label "ai:reviewing,ai:not-reviewed,ai:review-stale,ai:changes-requested"
  gh pr edit <number> --add-label "ai:reviewed"
  ```
- **Verdict is Request changes or Block** (score < 90, or caps triggered):
  ```bash
  gh pr edit <number> --remove-label "ai:reviewing,ai:not-reviewed,ai:review-stale,ai:reviewed"
  gh pr edit <number> --add-label "ai:changes-requested"
  ```

## PR Comment

After labeling, detect the review round and post the review result as a PR comment:

```bash
ROUND=$(gh pr view <number> --json comments --jq '[.comments[].body | select(test("^## AI Review"))] | length + 1')
```

Fill in the `**Agent:**` single-line string per [values.md § Agent Identification](../values.md#agent-identification-canonical-format) — all 3 fields, no shortcuts.

```bash
gh pr comment <number> --body "$(cat <<'EOF'
## AI Review (Round [N]): **[Grade] ([Score]/100)**

**Agent:** <tool> · `<model-id>` · effort=<effort>

| # | Dimension | Checked | Weight | Score |
|---|-----------|---------|--------|-------|
| 1 | Intent Alignment | x/y | 15 | ... |
| ... | ... | ... | ... | ... |
| | **Total** | | **100** | **[Score]** |

**Grade caps applied:** [list or "none"]

### Findings

[List CRITICAL/HIGH/MEDIUM/LOW findings, or "No findings"]

### Verdict: **[Approve / Approve with findings / Request changes / Block]**
EOF
)"
```

## Next Step

> **Agent instruction**: After the review verdict, labeling, and PR comment:
>
> - Output the score table to the conversation
> - If **verdict is Request changes or Block** → prompt: _"Review complete: **[Grade] ([Score]/100)**. Labeled `ai:changes-requested`. Run `/fix-pr` to address findings?"_
> - If **verdict is Approve or Approve with findings** → prompt: _"PR approved: **[Grade] ([Score]/100)**. Labeled `ai:reviewed`. Ready for human merge."_ (non-blocking findings noted in PR comment)
