# Shared review dimensions

Checklist shared by [review-pr.md](review-pr.md) and [full-review.md](full-review.md). Edit here only — do not duplicate.

> **Toolshed**: filenames starting with `_` are omitted from `list_prompts`. Load this fragment via path or `get_prompt` with name `_review-dimensions`.

## Intent alignment

Against [values.md](../values.md) and the relevant spec:

- [ ] All spec requirements implemented
- [ ] No behavior beyond the spec (spec drift)
- [ ] Code traces to design/spec (comments or PR description)
- [ ] Acceptance criteria met
- [ ] Non-goals respected (nothing out of scope)

**If missing**: request an intent → code map in the PR description.

## Security boundaries

Code must NOT:

- [ ] Log sensitive data (tokens, secrets, PII)
- [ ] Persist API keys or secrets
- [ ] Call third parties not authorized by the spec
- [ ] Expand data access beyond documented boundaries
- [ ] Assume input is trusted
- [ ] Skip authentication/authorization where required

**If violated**: block the PR and request a security review.

## Code standards

Per `rules.standards` in `manifest.yaml`, repo `CLAUDE.md`, and team conventions:

- [ ] Types and lint respected (no unjustified bypasses)
- [ ] File layout and naming conventions followed
- [ ] APIs and parameters consistent with the codebase
- [ ] Error handling and edge cases match project standards

**If violated**: request fixes per documented standards.

## Tests

- [ ] Tests for new behavior or regression for the bugfix
- [ ] Tests tied to acceptance criteria
- [ ] Edge cases covered (including failure states from the spec)
- [ ] Tests run and passing locally / in CI
- [ ] If using **stories** / **snapshots** / **E2E**: they assert real behavior, not only “does not crash”

**If insufficient**: request targeted coverage.

## Spec freshness

- [ ] Module-boundary files (APIs, routes, smart components) link to specs if the team requires traceability comments
- [ ] Spec acceptance criteria match the code
- [ ] Behavior beyond the spec has a spec update or a filed issue

**If stale**: request a spec update alongside the code change.

## Layering (adapt to your stack)

If the project defines layers (e.g. domain vs UI, services vs presentation):

- [ ] Pure logic is not unnecessarily tangled with UI frameworks
- [ ] Layer boundaries match [architecture-primer.md](../architecture-primer.md) or equivalent
- [ ] New files live in the correct package or directory

**If violated**: request realignment with documented architecture.
