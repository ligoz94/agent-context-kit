# Implement Feature

Use when a **spec (or equivalent) exists and is clear and approved** per team rules — you are ready to write code.

## When to Use This Prompt

| Situation                                        | Use                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Spec is approved, ready to code                  | **this prompt**                                                  |
| Spec is missing, ambiguous, or incomplete        | [update-docs.md](update-docs.md) first                           |
| Implementation reveals an undocumented edge case | [update-docs.md](update-docs.md) — stop coding, fix docs, resume |
| You are unsure whether a spec exists             | [update-docs.md](update-docs.md) to create one                   |

These two prompts are sequential: **update-docs → implement-feature**. You should rarely reach this prompt without having run `update-docs.md` first.

## Required Reading (in order)

0. **App's docs README** — feature register, prompt navigation (path in app-config.md § Paths)
1. **[Intent Engineering Standard](../values.md)** — agent principles & workflow (MUST READ FIRST)
2. **[Context policy](../context-policy.md)** — L0/L1/L2: load only docs this task needs
3. **Design doc** for this feature (find via app's feature register)
4. **Related domain docs** if working with domain entities (path in app-config.md § Paths)
5. **App's architecture-primer.md** if unfamiliar with stack (L2)

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `lookup_glossary` instead of manually opening files.

## Pre-Implementation Checklist

Before starting, verify:

- [ ] I have read [values.md](../values.md) in full
- [ ] I have identified the relevant design doc
- [ ] I have a spec with explicit intent extracted (or created one)
- [ ] All unknowns are documented or clarified
- [ ] Security boundaries are clear from the spec
- [ ] I know what NOT to do (non-goals are specified)
- [ ] Data inputs/outputs are explicitly defined
- [ ] Failure states are documented
- [ ] If MCP Toolshed is available: loaded the active spec (or consciously read the spec file)
- [ ] If touching known high-risk areas: read the relevant section of app's `key-learnings.md`

## Implementation Process

Follow [Standard Agent Execution Flow](../values.md#standard-agent-execution-flow):

1. **Parse Design Doc** — extract explicit requirements
2. **Extract Explicit Intent** — use [Intent Extraction Template](../values.md#intent-extraction-template-internal-agent-step)
3. **Identify Unknowns** — list anything ambiguous
4. **Halt if ambiguity > threshold** — request clarification, don't guess
5. **Generate Implementation Plan** — document in spec or PR description
6. **Validate against**:
   - Acceptance criteria
   - Security boundaries
   - Non-goals
7. **Implement** — follow code standards from CLAUDE.md and project standards
8. **Run tests** — verify against acceptance criteria
9. **Open PR** — include intent mapping, risk assessment

## Intent Extraction Template

From [Intent Extraction Template](../values.md#intent-extraction-template-internal-agent-step):

```
Objective: [What is the goal?]
Constraints: [What limits exist?]
Non-goals: [What should NOT be done?]
Data inputs: [What data comes in?]
Data outputs: [What data goes out?]
Failure states: [How can this fail?]
Security boundaries: [What security considerations?]
Acceptance criteria: [How do we know it's done?]
```

If any field is empty → request clarification, do not proceed.

## Anti-Patterns to Avoid

From [Anti-Patterns](../values.md#anti-patterns):

- **Implicit Requirements** — "Obviously it should..." → If obvious, it belongs in spec
- **Spec Drift** — code implements behavior not documented
- **Silent Refactoring** — don't rename/reorganize without explicit intent
- **Over-Broad Security Assumptions** — never assume input is trusted
- **Completion Bias** — finishing ≠ success. Success = spec alignment + tests + no security regression

## If Implementation Reveals Spec Issues

Follow [Spec Update Workflow](../values.md#spec-update-workflow):

1. **Stop implementation**
2. **Open Spec PR** with:
   - Explicit change summary
   - Rationale
   - Impact analysis
3. **Await approval**
4. **Resume implementation** against updated spec

Do NOT silently "fix" the spec in code.

## Post-Implementation: Finish

After implementation is complete and tests pass, run **`/finish`** — the pre-push gate that reviews code, validates, aligns docs, and captures learnings.

> **Agent instruction**: When implementation is complete and tests pass, prompt the user: _"Implementation complete. Run `/finish` to review, validate, and align docs before pushing?"_

For non-trivial changes, also run **`/full-review`** in a **NEW conversation** — fresh context catches spec drift and silent assumptions the implementer internalized.

## PR Template

Use the template from [values.md PR Structure Standard](../values.md#pr-structure-standard). Omit the "Root Cause" section (that's for bug-fix PRs only).

### Chain to review (structured I/O)

When opening a **new** conversation for `/review-pr`, paste **`## Intent`**, **`## Spec Traceability`**, and **`## Assumptions`** (if non-empty) inside a delimited block:

```text
<handoff_from_implementation>
(paste ## Intent, ## Spec Traceability, ## Assumptions here)
</handoff_from_implementation>
```

> If **Assumptions** has unresolved entries, stop and use [update-docs.md](update-docs.md) before merging.

## Remember

> **Intent Precedes Implementation** ([values.md](../values.md#intent-precedes-implementation))
>
> Agents do not implement features. Agents execute explicit intent specifications.
>
> All work must trace: Business Goal → Product Intent → Technical Intent → Executable Plan → Code

> **Quality Is Not Optional** ([values.md](../values.md#quality-is-not-optional))
>
> Tests, stories, documentation, and review fixes are part of the work — not follow-up. If the scope is too large to do properly, reduce the scope, not the quality.

---

**Operating Philosophy** ([values.md](../values.md#operating-philosophy)):

- Lower entropy
- Higher traceability
- Reduced hallucination
- Security invariance
- Spec-driven development
