# Fix PR

Fix all PR findings (review comments + CI failures), commit, push, and wait for CI green.

## Step 1 — Identify PR

If a PR number is provided, use it. Otherwise, detect from the current branch:

```bash
gh pr view --json number --jq '.number'
```

## Step 2 — Gather Findings

Run these in parallel:

### 2a. Unresolved review threads

Detect the repo owner and name automatically:

```bash
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
REPO_NAME=$(gh repo view --json name --jq '.name')
```

Then fetch threads:

```bash
GH_PAGER=cat gh api graphql -f query='
{
  repository(owner: "'$REPO_OWNER'", name: "'$REPO_NAME'") {
    pullRequest(number: <id>) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 20) {
            nodes {
              path
              line
              body
              author { login }
            }
          }
        }
      }
    }
  }
}' | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {threadId: .id, path: .comments.nodes[0].path, line: .comments.nodes[0].line, author: .comments.nodes[0].author.login, body: .comments.nodes[0].body}]'
```

Replace `<id>` with the PR number.

### 2b. CI check failures

```bash
gh pr checks <id> --json name,state,link | jq '[.[] | select(.state != "SUCCESS")]'
```

If all checks pass and no unresolved threads: report "PR is clean" and stop.

For failed CI checks, fetch logs:

```bash
gh run view <run-id> --log-failed
```

## Step 3 — Triage

For each review comment:

1. Read the file at the referenced path and line
2. Understand the comment's claim
3. Classify:

| Source         | Classification            | Action                                 |
| -------------- | ------------------------- | -------------------------------------- |
| Review comment | **Real bug**              | Fix                                    |
| Review comment | **False positive**        | Resolve with rationale                 |
| Review comment | **Question / discussion** | Leave open (needs human)               |
| CI failure     | **Real failure**          | Fix                                    |
| CI failure     | **Flaky test**            | Re-run once; if still red, investigate |

## Step 4 — Fix

Apply all fixes following code standards from [values.md](../values.md) and the app's key-learnings.md.

Common CI fixes (adapt to your stack):

- **Lint**: fix the violation; don't suppress without researching proper fix
- **Types**: run `<typecheck-command>` to isolate failures
- **Snapshots**: update and verify content is **correct** (not just consistent)
- **Formatting**: run `<format-check-command>`

## Step 5 — Resolve Addressed Threads

For every thread fixed (real bug) or dismissed (false positive):

```bash
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "<thread-node-id>"}) {
    thread { isResolved }
  }
}'
```

Do NOT resolve discussion/question threads — those need human input.

## Step 6 — Commit & Push

1. Rebase on main first: `git fetch origin main && git rebase origin/main`
2. Stage changed files (specific files, not `git add -A`)
3. Commit with descriptive message referencing the PR findings
4. Push: `git push`
5. After successful push, reset AI labels (see [pr-labeling.md](../pr-labeling.md)). Labels still reflect **pre-push** state until this step — use them to choose the next state:
   - If the PR had `ai:reviewed`, `ai:changes-requested`, or `ai:review-stale` → add **`ai:review-stale`** (prior AI verdict no longer matches HEAD).
   - Otherwise (e.g. only `ai:not-reviewed` — CI fixes before first AI review) → add **`ai:not-reviewed`**.

   Use a two-step clear-then-set to prevent stale labels regardless of prior state:

   ```bash
   LABELS=$(gh pr view <number> --json labels --jq '.labels[].name')
   gh pr edit <number> --remove-label "ai:reviewing,ai:reviewed,ai:changes-requested,ai:review-stale,ai:not-reviewed"
   if echo "$LABELS" | grep -qE '^ai:reviewed$|^ai:changes-requested$|^ai:review-stale$'; then
     gh pr edit <number> --add-label "ai:review-stale"
   else
     gh pr edit <number> --add-label "ai:not-reviewed"
   fi
   ```

## Step 7 — Wait for CI

```bash
gh pr checks <id> --watch
```

If checks fail again:

- **1st retry**: Diagnose and fix the new failure, push again
  - Wait a few minutes and then check for new automated CI comments — go back to step 2b to fetch any new failures.
- **2nd failure**: Halt and report — summarize remaining failures, request human input. Do NOT attempt further CI loops.

## Step 8 — Summary & PR Comment

Output the resolution table to the conversation, then post it as a PR comment.

Detect the fix round:

```bash
ROUND=$(gh pr view <number> --json comments --jq '[.comments[].body | select(test("^## AI Fix-PR Resolution"))] | length + 1')
```

Fill in the `**Agent:**` single-line string per [values.md § Agent Identification](../values.md#agent-identification-canonical-format) — all 3 fields, no shortcuts.

```bash
gh pr comment <number> --body "$(cat <<'EOF'
## AI Fix-PR Resolution (Round [N])

**Agent:** <tool> · `<model-id>` · effort=<effort>

| # | Source | File:Line | Verdict | Action | Status |
|---|--------|-----------|---------|--------|--------|
| 1 | review | ... | real bug | fixed | resolved |
| 2 | review | ... | false positive | dismissed | resolved |
| 3 | CI | lint | real failure | fixed | passing |

**CI status:** all green / still failing
**Open threads:** [count remaining, or "none"]
EOF
)"
```

## Next Step

> **Agent instruction**: After the summary and PR comment:
>
> - If **all green, no open threads** → prompt: _"PR is clean and CI green."_ If labels include `ai:review-stale`, add: _"Run `/review-pr` on the latest commit for a fresh `ai:reviewed`."_ Otherwise: _"Ready for human merge (or run `/review-pr` for first AI pass)."_
> - If **still failing or open threads** → list remaining items and prompt: _"These need human input."_
