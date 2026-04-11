# Development Workflow

End-to-end agent development pipeline from issue to merged PR.

## Pipeline

```
Issue → /triage-issue → [Q&A Gate] → [DEV] sub-issues
                                           │
              spec needed? ─────────────────►  /update-docs → [Human Gate] → /implement-feature ─┐
              no spec      ─────────────────►  /fix-bug directly ────────────────────────────────┤
                                                                                                   ↓
                                                                               Verify → PR → Review → Merge
```

### 0. Issue Triage

```
/triage-issue        Fetch issue, extract intent, Q&A, classify spec need, create [DEV] sub-issues
/triage-all-issues   Batch: run /triage-issue across all untriaged candidates from the project board
```

**Q&A gate**: Agent halts and asks questions if intent is incomplete. No `[DEV]` tasks are created until all gaps are resolved.

Outcome of triage:
- Spec needed → proceed to **Doc Alignment**
- No spec needed → proceed directly to **Fix Bug**

### 1. Doc Alignment

```
/update-docs    Align feature docs + specs with issue/PR/requirement
```

**Human gate**: Docs must be approved before proceeding. Agent does not implement against unapproved specs.

### 2. Implementation

```
/implement-feature    Code against approved spec
```

If implementation reveals a spec gap: **halt, run `/update-docs`, await approval, resume**.

### 3. Verification

After implementation, before committing:

1. Start dev server (see app-config.md § Identity for commands)
2. Run `/ui-test` — verifies feature against spec acceptance criteria
3. If tests fail: fix, re-verify. Halt after 3 failed attempts and request human input.

### 4. Finish + Push

1. Run `/finish` — code review, validation, doc alignment, learning capture
2. Commit and push PR using [PR template from values.md](../values.md#pr-structure-standard)
3. Link the originating GH issue to the PR (e.g. `Closes #123` in the PR body), or explicitly state in the PR description why no issue exists

### 5. Review (fresh context)

**Start a NEW conversation** for each review step — fresh context prevents confirmation bias.

```
/review-pr           Spec compliance, security, code standards
/full-review         12-dimension adversarial review (for non-trivial changes)
```

If review finds critical issues: fix in the implementation conversation, re-push, re-review.

### 6. CI + Comments

1. Run `/fix-pr` — triage review comments + CI failures, fix, commit, push, wait for CI green

**Human gate**: Human approves and merges PR. Agent does not self-merge.

## Failure Handling

| Failure                               | Action                                          |
| ------------------------------------- | ----------------------------------------------- |
| Spec gap during implementation        | Halt → `/update-docs` → await approval → resume |
| UI test fails (1-3x)                  | Fix and retry                                   |
| UI test fails (3x+)                   | Halt, request human input                       |
| `/review-pr` finds CRITICAL           | Fix → re-push → re-review in new conversation   |
| PR checks fail (flaky test)           | Re-run CI once. If still red, investigate.      |
| PR checks fail (real failure)         | Fix → re-push                                   |
| Automated PR comment (real bug)       | Fix → re-push                                   |
| Automated PR comment (false positive) | Dismiss with rationale                          |

## Human Gates

Two mandatory checkpoints:

1. **After spec crystallization** — human approves spec before implementation begins
2. **After PR review** — human merges PR

These gates exist because specs define intent (business decision) and merges affect production (irreversible). Agents execute, humans decide.

### What counts as "approved"

**Spec approval** = the spec PR is **merged to main**. Verbal confirmation in chat is not sufficient — the spec must be in git so future agents and humans can reference it. If the spec is a new file in an open PR, the agent must wait for that PR to merge before implementing against it.

**PR approval** = human clicks "Approve" on GitHub and merges. Agents do not self-merge, even if CI is green and review found no issues.

## Phase Roadmap

| Phase                 | Automation Level                                        | Human Involvement                              |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| **Phase 1 (current)** | Each step run manually, one conversation per step       | Reviews spec, reviews diff, reviews PR, merges |
| **Phase 2**           | Agent chains steps 2-4 autonomously, hooks catch errors | Approves spec, reviews PR, merges              |
| **Phase 3**           | Full pipeline runs as background agent                  | Approves spec, merges PR                       |

Progress to Phase 2 when: backpressure hooks are proven reliable, eval loop tracks agent accuracy.
Progress to Phase 3 when: eval metrics show low rejection rate and zero hallucinated API incidents.

## Session Handoff (external memory)

Before ending a long implementation chat or switching threads, write a short handoff (issue comment, draft PR body, or pastable block):

```markdown
## Handoff

- **Branch:**
- **Specs (paths):**
- **Intent summary:**
- **Files touched:**
- **Tests run / pending:**
- **Blockers:**
```

## Long-thread Prune

When the conversation contains large tool outputs (logs, full file dumps, old listings), **replace** them in your reasoning with a one-line summary plus path — do not rely on stale verbatim blocks. Prefer re-reading a file over trusting an old tool snapshot.

## Re-anchor

If the thread is long or you are about to run many tools, repeat a **short** anchor (objective, spec paths, non-goals). See [context-policy.md — Re-anchor](../context-policy.md#re-anchor-long-threads).

Full policy: [context-policy.md](../context-policy.md).
