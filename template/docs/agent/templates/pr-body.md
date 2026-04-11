# PR Body Template

Canonical template for all agent PR descriptions. **Single source of truth.**

Use every required section. Sections marked `[if …]` are conditional — include them only when the condition is true; omit them entirely otherwise.

---

## Summary

- **What** changed, **where** (routes, packages, main files), and **how** it behaves now.
- Short bullets if multiple areas touched (UI, API, hooks, docs).
- `Closes #…` (one issue per line, if applicable)

Do not invent issue numbers or spec paths — use what the branch/PR context provides; omit if absent.

## Root Cause `[if bug fix]`

**Symptom**: [What went wrong?]
**Expected**: [What should happen per spec?]
**Actual**: [What actually happened?]
**Classification**: [Code / Spec / Design bug]
**Cause**: [Why did this happen?]

## Intent

[Executive summary — what business goal does this implement? Which spec / phase? Link design doc section.]

## Spec Traceability

- `<spec-path> §Section` → `src/feature/component.ts:44–98`

## Risk

- **Security impact:** [describe or "none"]
- **Data exposure:** [describe or "none"]
- **Breaking changes:** [describe or "none"]
- **Unhandled failure cases:** [describe or "none"]

## Assumptions

[Explicit list of assumptions unresolved at merge time. If non-empty → spec is incomplete → run /update-docs first. Use "None." if empty.]

## Handoff `[if another session may continue work]`

- **Branch:**
- **Specs (paths):**
- **Files touched (high level):**
- **Tests run / pending:**

## Agent Report

Include this section exactly as defined in [Agent Report canonical fields](../values.md#agent-report-canonical-fields).
Do not restate, rename, reorder, or omit the canonical fields.

## Test plan

- Commands run (e.g. `<lint-command>`, `<typecheck-command>`, targeted `<test-command>`).
- Manual checks if UI-facing.
- Follow-up issues / E2E checklist references if any.
