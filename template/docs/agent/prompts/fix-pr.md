# Fix PR

Address PR findings (review threads + CI failures), commit, push, and wait for green CI.

## Step 1 — Identify the PR

If no number is given, detect from the current branch (example with GitHub CLI):

```bash
gh pr view --json number --jq '.number'
```

## Step 2 — Gather findings

### 2a. Unresolved review threads

Use your forge’s API or CLI. Example pattern with GitHub GraphQL (replace `<id>` with PR number):

```bash
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
REPO_NAME=$(gh repo view --json name --jq '.name')
```

Query `reviewThreads` for the PR and filter `isResolved == false`.

### 2b. CI checks

```bash
gh pr checks <id> --json name,state,link | jq '[.[] | select(.state != "SUCCESS")]'
```

If all green and no open threads: report “PR is clean” and stop.

For failed runs:

```bash
gh run view <run-id> --log-failed
```

## Step 3 — Triage

For each comment:

1. Read file and context
2. Classify: real bug | false positive | discussion (needs human)
3. CI: real failure | flaky (re-run once, then investigate)

## Step 4 — Fix

Apply fixes per [values.md](../values.md), standards in `manifest.yaml`, and [key-learnings.md](../key-learnings.md).

Use the same commands CI runs locally when possible.

## Step 5 — Resolve threads (where supported)

Resolve only where you fixed or dismissed with rationale. Leave discussion threads open if a human must decide.

## Step 6 — Commit and push

1. Sync with the team’s base branch (`main` / `develop`): `git fetch` + merge or rebase per convention
2. Stage specific paths (avoid unnecessary `git add -A`)
3. Message referencing review/CI
4. `git push`

## Step 7 — Wait for CI

```bash
gh pr checks <id> --watch
```

If it fails again: one more fix iteration; if the loop does not converge, summarize and escalate to a human.

## Step 8 — Summary

Table: source, file, verdict, action, status. Final CI state.

## Next step (agent instruction)

- All green → “Ready for human merge.”
- Remaining items → list what needs humans.
