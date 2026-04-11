# Review Spec Prompt

Review a spec (implementation plan) for completeness, clarity, and implementability. Use when a PR introduces or significantly updates a spec document.

## Required Reading

1. **[Intent Engineering Standard](../values.md)** — spec requirements (especially [Intent Extraction Template](../values.md#intent-extraction-template-internal-agent-step))
2. **App's spec template** — canonical structure (find via app-config.md § Spec System)
3. **Feature doc** — the parent feature doc linked from the spec
4. **Related specs** — any specs listed in the Dependencies field

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `lookup_glossary` instead of manually opening files.

## Process

1. Read the spec being reviewed
2. Read its parent feature doc (linked in spec header)
3. Read dependency specs (listed in spec header)
4. Evaluate against all dimensions below
5. Output verdict with findings

## Review Dimensions

### Template Compliance

Compare against the app's spec template:

- [ ] **Status** field present and correct (`needs-discovery` | `planned` | `partial` | `implemented`)
- [ ] **Feature doc** link present and valid
- [ ] **Dependencies** listed or stated "none"
- [ ] All required sections present: Parsed Intent, Unknowns, Tasks, Validation Plan, Test Commands, Risks, Acceptance Criteria

**If missing sections**: Request additions per template

### Intent Completeness

From [values.md Intent Extraction Template](../values.md#intent-extraction-template-internal-agent-step), the spec must cover all fields:

| Field                   | Check                                        |
| ----------------------- | -------------------------------------------- |
| **Objective**           | Clear, scoped, traceable to feature doc      |
| **Constraints**         | Technical and business constraints explicit  |
| **Non-goals**           | What is explicitly out of scope?             |
| **Data inputs**         | Formats, sources, schemas defined            |
| **Data outputs**        | Response shapes, contracts defined           |
| **Failure states**      | Error paths, edge cases, degraded modes      |
| **Security boundaries** | Auth, secrets, data access, trust boundaries |
| **Acceptance criteria** | Testable, measurable, no ambiguity           |

- [ ] All 8 fields addressed (directly or inferable from Parsed Intent + other sections)
- [ ] No field left empty or vague

**If any field is empty or vague**: Flag as spec gap — the spec cannot be safely implemented

### Implementability

Could an agent implement this spec without asking clarifying questions?

- [ ] Tasks reference specific file paths (existing or new)
- [ ] Data contracts are concrete (schemas, types, field names), not hand-wavy
- [ ] Design decisions explain the "why", not just the "what"
- [ ] Unknowns are honest and bounded — they don't block core implementation
- [ ] No implicit knowledge required (domain terms explained or linked to domain docs)

**If vague**: "An agent reading only this spec and the linked docs should be able to implement without clarification. What's missing?"

### Security & Data Boundaries

From [values.md Security Is Structural](../values.md#security-is-structural-not-advisory):

- [ ] Auth requirements explicit (which endpoints/actions need auth, what roles)
- [ ] Secret handling specified (no client-side secrets, key paths, token lifetimes)
- [ ] Data flow documented (where does data go?)
- [ ] Trust boundaries marked (what input is untrusted?)
- [ ] Third-party service calls identified and justified

**If missing**: Block until security boundaries are documented

### Scope & Non-Goals

- [ ] Non-goals section present (explicit "we will NOT do X")
- [ ] Scope is bounded — no open-ended tasks
- [ ] Existing contracts preserved (or breaking changes called out)

**If unbounded**: "What's the boundary? Without non-goals, an implementer may over-build."

### Failure States & Edge Cases

- [ ] Error scenarios documented (network failure, auth failure, invalid input, service unavailable)
- [ ] Degraded mode behavior defined (what does the user see when things go wrong?)
- [ ] Recovery strategy specified (retry? fallback? user action needed?)
- [ ] Risks section addresses realistic failure modes, not just theoretical

**If thin**: "Failure states are the most common source of production bugs. What happens when [X] fails?"

### Dependencies & Integration

- [ ] Dependency specs linked and their status checked
- [ ] Integration points are concrete (endpoint paths, hook names, component boundaries)
- [ ] No circular dependencies introduced
- [ ] Impact on existing functionality assessed

**If unresolved**: "Dependency [X] is in status [Y]. Can this spec be implemented independently?"

### Testability

- [ ] Validation plan covers acceptance criteria
- [ ] Automated tests specified (not just manual verification)
- [ ] Edge cases from failure states have test coverage

**If manual-only**: "Manual testing doesn't prevent regressions. What can be automated?"

## Review Checklist

Quick summary:

- [ ] Template compliance (all sections present, correct status)
- [ ] Intent completeness (all 8 fields from Intent Extraction Template)
- [ ] Implementability (agent can implement without clarification)
- [ ] Security boundaries documented
- [ ] Scope bounded with non-goals
- [ ] Failure states and edge cases covered
- [ ] Dependencies resolved or non-blocking
- [ ] Testability (automated where possible)

**Approve only if all checked.**

## Verdict Format

Output a table summarizing each dimension:

```
| # | Dimension | Status | Notes |
|---|-----------|--------|-------|
| 1 | Template compliance | pass/fail/partial | ... |
| 2 | Intent completeness | pass/fail/partial | ... |
| ...
```

Then list concrete findings as actionable items.

## Next Step

> **Agent instruction**: After the review verdict:
>
> - If **findings exist** → prompt: _"Spec review complete with findings. Address these before implementation."_
> - If **approved with no findings** → prompt: _"Spec approved. Ready for implementation — run `/implement-feature` when ready."_
