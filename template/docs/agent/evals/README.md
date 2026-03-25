# Agent Eval System

**Status:** Phase 1 (PR self-reporting)

Lightweight eval loop that compounds over time. Agents report structured data in PRs; humans review periodically.

## How It Works

1. **Agent reports in every PR** — structured `## Agent Report` section in PR description (see [PR template](../prompts/implement-feature.md))
2. **Reviewer collects signal** — reviewer checks report accuracy during PR review (see [review-pr.md](../prompts/review-pr.md))
3. **Periodic batch review** — monthly scan of Agent Report sections across merged PRs to spot trends
4. **Metrics update** — update [agent-metrics.md](agent-metrics.md) with aggregated findings

## MVP Metrics (Phase 1)

Three highest-signal metrics for least effort:

| Metric                                | Source                                           | Why It Matters                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec clarification rate**           | Agent Report → "Clarifications requested"        | High rate = specs are underspecified, fix the docs                                                                                                                      |
| **Scope drift incidents**             | Agent Report → "Scope" field + reviewer override | Drift = agent hallucinating requirements or ignoring non-goals                                                                                                          |
| **Assumptions made**                  | Agent Report → "Assumptions" list                | Assumptions = spec gaps. If assumptions ≠ 0, spec needs update                                                                                                          |
| **Context mistakes** (Phase 2 signal) | Agent Report → "Context mistakes"                | Non-zero = wrong spec/file loaded, missed [key-learnings](../key-learnings.md), or trusted stale tool output — tune [context-policy.md](../context-policy.md) / prompts |

### Deferred metrics (Phase 2+)

- PR rejection rate — requires enough volume to be meaningful
- Post-merge bug count (30-day window) — requires bug tracking attribution
- Security review flags — requires security review process
- Hallucinated API incidents — currently near-zero due to spec-driven workflow
- Aggregated **context mistakes** — script extraction alongside other Agent Report fields when moving to Phase 2 automation

## Agent Report Format

Every agent PR includes this section (see [implement-feature.md](../prompts/implement-feature.md) PR template):

```markdown
## Agent Report

- **Clarifications requested:** [count] — [brief list or "none"]
- **Assumptions made:** [count] — [brief list or "none"]
- **Spec gaps found:** [count] — [brief list or "none"]
- **Scope:** stayed within spec | drifted — [explain if drifted]
- **Refusals:** [what was refused and why, or "none"]
- **Inferences:** [what was inferred from context rather than explicit spec, or "none"]
- **Context mistakes:** [count] — [wrong spec/file, missed key-learning, misleading tool output, or "none"]
```
