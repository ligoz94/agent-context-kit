# Shared Review Dimensions

Shared checklist used by both [review-pr.md](review-pr.md) and [full-review.md](full-review.md). Do not duplicate — edit here.

> **Toolshed**: filenames starting with `_` are omitted from `list_prompts`. Load this fragment via path or `get_prompt` with name `_review-dimensions`.

## Intent Alignment

From [Intent Precedes Implementation](../values.md#intent-precedes-implementation):

- [ ] All spec requirements implemented
- [ ] No behavior beyond spec (spec drift)
- [ ] Code traces to design doc/spec sections
- [ ] Acceptance criteria met
- [ ] Non-goals respected (nothing out of scope)

**If missing**: Request intent mapping in PR description

## Security Boundaries

From [Security Is Structural](../values.md#security-is-structural-not-advisory):

Check code does NOT:

- [ ] Log sensitive data (tokens, keys, PII)
- [ ] Persist API keys or secrets
- [ ] Make unauthorized third-party calls
- [ ] Expand data access beyond spec boundary
- [ ] Assume input is trusted
- [ ] Skip authentication/authorization checks

**If violated**: Block PR, request security review

## Code Standards

Per `rules.standards` in `manifest.yaml`, repo `CLAUDE.md`, and team conventions:

- [ ] No type coercion or unsafe bypasses — narrow types properly
- [ ] File layout and naming conventions followed
- [ ] APIs and parameters consistent with the codebase
- [ ] Error handling and edge cases match project standards
- [ ] No logic duplication — if the PR introduces a utility/hook/transform, verify no equivalent already exists

**If violated**: Request fixes per the linked standard

## Tests

- [ ] Tests for new behavior or regression for the bugfix
- [ ] Tests tied to acceptance criteria
- [ ] Edge cases covered (including failure states from the spec)
- [ ] Tests run and passing locally / in CI
- [ ] If using **stories** / **snapshots** / **E2E**: they assert real behavior, not only "does not crash"
- [ ] Snapshot or baseline content is realistic (not `null` / sentinel values)

**If insufficient**: Request targeted coverage

## Spec Freshness

- [ ] Module-boundary files (APIs, routes, smart components, entry points) link to specs if the team requires traceability comments
- [ ] Referenced specs' acceptance criteria still match the code being changed
- [ ] If code adds behavior beyond spec, spec update PR is opened or filed as issue

**If stale**: Request spec update alongside code change

## Layer Boundaries (adapt to your stack)

If the project defines layers (e.g. domain vs UI, services vs presentation, handler/service/repository):

- [ ] Pure logic is not unnecessarily tangled with framework / transport concerns
- [ ] Layer boundaries match [architecture-primer.md](../architecture-primer.md) or equivalent
- [ ] New files live in the correct package or directory

**If violated**: Block PR. Request realignment with documented architecture.
