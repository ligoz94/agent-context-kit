# Agent Eval System

**Status:** Phase 1 (PR self-reporting)

Lightweight eval loop that compounds over time. Agents report structured data in PRs; humans review periodically.

## How It Works

1. **Agent reports in every PR** — structured `## Agent Report` section in PR description (see [values.md Agent Report](../values.md#agent-report-canonical-fields))
2. **Reviewer collects signal** — reviewer checks report accuracy during PR review (see [review-pr.md](../prompts/review-pr.md))
3. **Periodic batch review** — monthly scan of Agent Report sections across merged PRs to spot trends
4. **Metrics update** — update [agent-metrics.md](agent-metrics.md) with aggregated findings

## MVP Metrics (Phase 1)

Three highest-signal metrics for least effort:

| Metric                                | Source                                           | Why It Matters                                                                                                              |
| ------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Spec clarification rate**           | Agent Report → "Clarifications requested"        | High rate = specs are underspecified, fix the docs                                                                          |
| **Scope drift incidents**             | Agent Report → "Scope" field + reviewer override | Drift = agent hallucinating requirements or ignoring non-goals                                                              |
| **Assumptions made**                  | Agent Report → "Assumptions" list                | Assumptions = spec gaps. If assumptions ≠ 0, spec needs update                                                              |
| **Context mistakes** (Phase 2 signal) | Agent Report → "Context mistakes"                | Non-zero = wrong spec/file loaded, missed [key-learnings](../key-learnings.md), or trusted stale tool output — tune [context-policy.md](../context-policy.md) / prompts |

### Deferred metrics (Phase 2+)

- PR rejection rate — requires enough volume to be meaningful
- Post-merge bug count (30-day window) — requires bug tracking attribution
- Security review flags — requires security review process
- Hallucinated API incidents — currently near-zero due to spec-driven workflow
- Aggregated **context mistakes** — script extraction alongside other Agent Report fields when moving to Phase 2 automation

## Agent Report Format

Every agent PR includes this section (see [values.md Agent Report](../values.md#agent-report-canonical-fields)):

```markdown
## Agent Report

- **Clarifications requested:** [count] — [brief list or "none"]
- **Assumptions made:** [count] — [all encountered during work, including resolved ones]
- **Spec gaps found:** [count] — [brief list or "none"]
- **Scope:** stayed within spec | drifted — [explain if drifted]
- **Refusals:** [what was refused and why, or "none"]
- **Inferences:** [what was inferred from context rather than explicit spec, or "none"]
- **Context mistakes:** [count] — [wrong spec/file, missed key-learning, bad tool output trusted, or "none"]
```

### Rules

- Counts must be integers, not ranges or vague ("a few", "some")
- "None" is a valid answer — don't fabricate signal
- "Assumptions made" counts assumptions _encountered during implementation_ — including ones resolved via spec-update PRs before merge. This tracks how often specs need patching, not how many unresolved assumptions remain.
- If any assumptions are still unresolved at merge time, the PR must link to an approved spec-update PR that closes the gap (per [values.md Spec Update Workflow](../values.md#spec-update-workflow))
- Reviewer may override the agent's self-assessment (e.g., agent claims "stayed within spec" but reviewer finds drift)

## Batch Review Process

Monthly (or when PR volume justifies):

1. `gh pr list --state merged --search "Agent Report" --limit 50` — get recent agent PRs
2. Extract Agent Report sections
3. Tally metrics into [agent-metrics.md](agent-metrics.md)
4. Look for trends:
   - Rising clarification rate → specs degrading or new feature area underspecified
   - Rising assumptions → agent confidence miscalibrated, tighten values.md
   - Scope drift → strengthen non-goals in specs
   - Rising context mistakes → improve L2 triggers in context-policy, Toolshed usage, or re-anchor discipline
5. File issues for systemic problems

## Graduation Criteria (Phase 1 → Phase 2)

Move to semi-automated extraction when:

- 20+ agent PRs have Agent Report sections
- Manual review takes > 30 min per batch
- Patterns are stable enough to script

Phase 2: CI script parses Agent Report from PR body, appends to structured log (JSON/CSV).
