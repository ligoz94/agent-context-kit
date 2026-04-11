# Team Structure

## Shape

> Adapt this to your actual team. Example below.

- 2–8 engineers (fullstack or role-split)
- Each dev runs their own AI agent locally (Claude Code, Cursor, etc.)
- Shared CI agent optional

## PR workflow

- PRs are single-owner (one dev per PR, handoffs documented via Handoff block)
- Any team member reviews any PR — no assigned reviewers required
- PR visibility via team channel or GitHub notifications

## Concurrency implications

Multiple devs may trigger agent workflows on the same PR simultaneously (e.g. two `/review-pr` runs). Workflows that mutate shared state (labels, comments, branches) must account for this:

- Use transitional labels (e.g. `ai:reviewing`) to signal in-progress work
- Check current label state before overwriting
- Prefer additive actions (comment) over destructive ones (force-push)

See [pr-labeling.md](pr-labeling.md) for the full label protocol.
