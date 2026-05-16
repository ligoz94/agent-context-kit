# Release Workflow

How to finish work safely and merge code to the base branch.

> **Adapt to your project**: Check `app-config.md` (L0 doc) for the project's actual test/lint/type-check commands. The examples below are generic — substitute your project's commands.

## Step 1: Verify Tests

Tests MUST pass before any merge or PR.

Use the project's test command from `app-config.md` (e.g. `npm test`, `moon run lint`, `cargo test`, `pytest`, `go test ./...`).

**If tests fail**: Stop. Nothing happens until tests pass. This is a HARD GATE.

## Step 2: Present Structured Options

Never ask "what should we do?" Present exactly these options:

```
Implementation complete. What would you like to do?

1. Merge locally to {base_branch}
2. Push and create a Pull Request
3. Keep branch as-is (handle later)
4. Discard work (requires typed confirmation "discard")
```

## Step 3: Execute Choice

### Option 1: Merge Locally
- Switch to base, pull latest
- Merge feature branch
- Verify tests on merged result (catches "works on my branch" issues)
- Delete branch

### Option 2: Create PR
- Push branch to remote
- Generate PR with: Summary (2-3 bullets) + Test Plan

### Option 3: Keep Branch
- Keep worktree and branch for later work

### Option 4: Discard
- Requires typed confirmation word "discard"
- Permanently deletes branch and worktree

## Step 4: Cleanup

| Outcome | Keep Worktree | Delete Branch |
|---|---|---|
| Merged locally | No | Yes |
| Created PR | Yes (might need revisions) | No |
| Kept as-is | Yes | No |
| Discarded | No | Yes (force) |

## Usage

```
finish_work(
  branch: "feature/auth-flow",
  base_branch: "main",
  test_command: "<project test command from app-config.md>"
)
```
