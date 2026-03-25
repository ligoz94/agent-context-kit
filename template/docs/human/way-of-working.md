# Way of Working

This document describes how our team works together, especially when collaborating with AI agents and LLMs.

## Pull Requests

- Every day we post our pending PRs in the team channel inside the **Daily Updates** thread for visibility.
- A good PR description should include:
  - Executive intent (why this change matters)
  - Reviewer guidance (what to focus on)
  - Clear context and provenance

## Utilizing Documentation

Our documentation is intentionally structured and optimized for AI agents.

When discussing features, bugs, design decisions, or implementation details:

- Always link directly to the relevant section or file.
- Prime the AI agent with the correct context before giving it a task.

### Recommended priming pattern

When asking an AI agent to work on something, start with:

> Read the following files from the repository root:
>
> - `docs/agent/values.md` (always required — contains our non-negotiables)
> - `docs/agent/architecture-primer.md`
> - `docs/agent/context-policy.md`
>
> Then read the relevant feature specification:
> `docs/features/<feature-name>.md`

After providing context, give your specific instruction.

### Useful prompt templates

You can reference these prompt templates when working with the AI:

- `update-docs.md` — to align or improve documentation for a specific issue
- `fix-pr.md` — to address review comments on a Pull Request
- `implement-feature.md` — to implement a feature from its specification
- `review-pr.md` — to perform a structured code review

Example usage in a PR comment or issue:

> Use `implement-feature.md` to implement this spec: `docs/features/user-authentication.md`

## General Collaboration Rules

- Prefer linking to documentation over repeating content.
- Keep AI context as small and precise as possible (follow token discipline).
- When in doubt about process, check `docs/agent/context-policy.md` first.

---

This way of working evolves. Suggestions for improvement are always welcome.
