# Checkout PR in Worktree

Check out a PR into an isolated git worktree under `.claude/worktrees/pr-<number>`, with `node_modules` symlinked from the main worktree.

## Step 1 — Identify PR

Use the provided PR number. If none given, detect from current branch:

```bash
gh pr view --json number --jq '.number'
```

## Step 2 — Resolve Main Worktree Root

```bash
git rev-parse --show-toplevel
```

This is `<main-root>`. Steps 2–7 must be run from `<main-root>`.

```bash
cd <main-root>
```

## Step 3 — Get Branch Name

```bash
gh pr view <number> --json headRefName --jq '.headRefName'
```

## Step 4 — Create Worktree

```bash
mkdir -p .claude/worktrees
git fetch origin <branch>
git worktree add .claude/worktrees/pr-<number> -B pr-<number> origin/<branch>
```

## Step 5 — Symlink node_modules

`node_modules` is never committed, so it won't exist in the new worktree.

```bash
ln -sfn <main-root>/node_modules .claude/worktrees/pr-<number>/node_modules
```

## Step 6 — Symlink shared dirs (if any)

If the repo has shared directories (e.g. a built tooling dir or submodule) that should be reused:

```bash
# Example: symlink a shared architecture/docs dir
rm -rf .claude/worktrees/pr-<number>/<shared-dir>
ln -sfn <main-root>/<shared-dir> .claude/worktrees/pr-<number>/<shared-dir>
```

Adapt this step to your repo's structure — omit if not needed.

## Step 7 — Verify

```bash
readlink .claude/worktrees/pr-<number>/node_modules
```

Must be a symlink (`->`) pointing to the main worktree. If it is a regular directory, remove it and re-run the symlink step.

## Step 8 — Enter Worktree

Switch the session into the worktree so all subsequent commands run on the PR branch:

```bash
cd <main-root>/.claude/worktrees/pr-<number>
```

Confirm the active branch:

```bash
git branch --show-current
```

Must print `pr-<number>`.

## Step 9 — Report

Print a summary:

```
✓ Worktree: .claude/worktrees/pr-<number>
✓ PR branch: <branch> (remote)
✓ Local branch: pr-<number>
✓ node_modules → <main-root>/node_modules
✓ Session cwd: .claude/worktrees/pr-<number>
```

Then prompt the user:

> _"Worktree ready. Session is now in `.claude/worktrees/pr-<number>` — you can run /review-pr or other workflows directly."_
