# Triage All Issues Prompt

Use this prompt to process all untriaged issues from the project board in one session — sprint planning, backlog grooming, or a cleanup pass.

This is a batch runner that calls [/triage-issue](triage-issue.md) on each candidate in turn.

## When to Use This Prompt

| Situation                                                    | Use                                       |
| ------------------------------------------------------------ | ----------------------------------------- |
| Sprint planning — decompose all untriaged before sprint starts | **this prompt**                         |
| Backlog grooming session                                     | **this prompt**                           |
| Single issue just came in                                    | [/triage-issue](triage-issue.md)          |

## Required Reading

1. **[triage-issue.md](triage-issue.md)** — the per-issue process this prompt calls

---

## Process

### Step 1 — Find All Candidates

Query the repo for untriaged issues (adapt filters to your project's workflow):

```sh
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

# List open issues without sub-issues and with relevant labels
gh issue list --repo "$REPO" --state open --label "Development,Bug" --json number,title,labels \
  | jq '.[] | select(.labels | length > 0) | "#\(.number) \(.title)"'
```

Present the results to the user:

```
Found N untriaged issues:

  #1240  [EPIC] Improve the table with new fields and dedicated filters
  #1241  [BUG] Data Source - field to be kept as standard format
  ...

Process all? Or list the numbers you want to skip.
```

Wait for confirmation before proceeding.

### Step 2 — Triage One by One

For each confirmed candidate, run the full [/triage-issue](triage-issue.md) process:

1. Fetch the issue
2. Extract intent
3. **If Q&A gate triggers**: present numbered questions to the user, wait for answers, then continue with that issue before moving to the next
4. Classify spec need
5. Create `[DEV]` sub-issues
6. Output per-issue triage summary

**Ordering rule**: Process Epics and Stories before Bugs. Bugs are more likely to skip straight to `/fix-bug` and require less decomposition effort.

### Step 3 — Session Summary

After all candidates are processed, output:

```
## Triage Session Complete

Processed: N issues

### Needs spec → /update-docs
- #NNNN [title]

### No spec needed → /fix-bug
- #NNNN [title]

### Skipped (needs human input before proceeding)
- #NNNN [title] — [reason]

### [DEV] tasks created
#A, #B, #C, ...
```

## Rules

- **Never skip the Q&A gate** — if intent is unclear, ask before creating tasks. Do not batch-assume.
- **One issue at a time** — complete triage for issue N before starting issue N+1.
- **Don't re-triage already-decomposed issues** — if an issue already has sub-issues when you fetch, skip it and note "already has sub-issues".
- **Respect human answers across issues** — if the user answers a domain question for one issue, apply that knowledge to subsequent issues without re-asking.
