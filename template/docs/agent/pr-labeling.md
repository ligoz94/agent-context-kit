# PR Labeling

AI review status is tracked via GitHub labels so the PR queue is filterable at a glance.

## Labels

| Label                  | Meaning                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `ai:not-reviewed`      | No AI review has run yet on this PR (e.g. after `/finish`)          |
| `ai:review-stale`      | An AI review ran, then the branch changed — **re-run `/review-pr`** |
| `ai:reviewing`         | AI review is in progress — do not start another                     |
| `ai:reviewed`          | `/review-pr` passed on **current** HEAD (no CRITICAL/HIGH findings) |
| `ai:changes-requested` | Review found CRITICAL or HIGH findings needing fixes                |

**Final AI OK for the current commit** is `ai:reviewed` after the latest `/review-pr`. `ai:review-stale` means the last review no longer matches HEAD.

Labels are **advisory only** — they don't block merge. Human gates remain authoritative (see [development-workflow.md §Human Gates](prompts/development-workflow.md#human-gates)).

## When labels are applied

### `ai:not-reviewed`

Applied when a PR is created: `/finish` adds `ai:not-reviewed` after pushing the branch, once the PR exists.

Also applied after `/fix-pr` **only when** the PR never had `ai:reviewed`, `ai:changes-requested`, or `ai:review-stale` (e.g. CI-only fixes before the first AI review). See [fix-pr.md](prompts/fix-pr.md) Step 6.

### `ai:review-stale`

Applied by `/fix-pr` after a successful push when the PR previously had `ai:reviewed`, `ai:changes-requested`, or `ai:review-stale` — i.e. a prior AI review cycle is invalidated by new commits.

### `ai:reviewing`

Applied by `/review-pr` as its **first step** — signals a review is in progress. Prevents duplicate concurrent reviews (see [team.md](team.md) §Concurrency).

```sh
# Check for existing review before starting
CURRENT=$(gh pr view <number> --json labels --jq '.labels[].name')
if echo "$CURRENT" | grep -q '^ai:reviewing$'; then
  echo "Review already in progress — aborting"
  exit 1
fi
gh pr edit <number> --remove-label "ai:not-reviewed,ai:review-stale,ai:reviewed,ai:changes-requested" --add-label "ai:reviewing"
```

If the agent crashes mid-review, `ai:reviewing` stays — a human or subsequent `/fix-pr` run clears it.

### `ai:reviewed`

Applied by `/review-pr` as final step when verdict is Approve or Approve with findings (score ≥ 90, no caps):

```sh
gh pr edit <number> --remove-label "ai:reviewing,ai:not-reviewed,ai:review-stale,ai:changes-requested" --add-label "ai:reviewed"
```

### `ai:changes-requested`

Applied by `/review-pr` as final step when verdict is Request changes or Block (score < 90, or caps triggered):

```sh
gh pr edit <number> --remove-label "ai:reviewing,ai:not-reviewed,ai:review-stale,ai:reviewed" --add-label "ai:changes-requested"
```

## Flow

```
/finish (push PR)          →  ai:not-reviewed
/review-pr (start)         →  ai:reviewing        (lock)
/review-pr (end)           →  ai:reviewed  OR  ai:changes-requested
/fix-pr (push fixes)       →  ai:review-stale OR ai:not-reviewed (see fix-pr Step 6)
/review-pr again (start)   →  ai:reviewing
/review-pr again (end)     →  ai:reviewed  OR  ai:changes-requested
```

Filter examples:

- **Needs first AI review:** `ai:not-reviewed`
- **Needs re-review after fixes:** `ai:review-stale`

## Setup

Create these labels in the GitHub repo (one-time):

```sh
gh label create "ai:not-reviewed" --color "FBCA04" --description "No AI review on this PR yet"
gh label create "ai:review-stale" --color "D4C5F9" --description "Branch changed after AI review — re-run /review-pr"
gh label create "ai:reviewing" --color "1D76DB" --description "AI review in progress"
gh label create "ai:reviewed" --color "0E8A16" --description "AI review passed on current HEAD"
gh label create "ai:changes-requested" --color "E11D48" --description "AI review found issues"
```

## Prompts affected

| Prompt         | Change                                                                |
| -------------- | --------------------------------------------------------------------- |
| `finish.md`    | Add label `ai:not-reviewed` when creating/pushing PR                  |
| `review-pr.md` | Lock + verdict labeling includes `ai:review-stale`                    |
| `fix-pr.md`    | After push: `ai:review-stale` vs `ai:not-reviewed` per prior AI state |
