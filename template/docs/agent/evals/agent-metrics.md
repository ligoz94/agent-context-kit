# Agent Metrics

Aggregated from Agent Report sections in merged PRs. Updated during periodic batch reviews.
See [evals/README.md](README.md) for the collection process.

## Current Period

_No data yet — begin collecting after first PR with Agent Report section._

<!--
## YYYY-MM (template)

**PRs reviewed:** N
**Agents:** Claude Code, Cursor, Codex, etc.

| Metric                      | Count | Trend | Notes |
|-----------------------------|-------|-------|-------|
| Clarifications requested    | N     | —     |       |
| Assumptions made            | N     | —     |       |
| Spec gaps found             | N     | —     |       |
| Scope drift incidents       | N     | —     |       |
| Refusals                    | N     | —     |       |
| Inferences                  | N     | —     |       |
| Context mistakes            | N     | —     |       |

**Observations:**
- ...

**Actions taken:**
- ...
-->

## Target Trajectory

MVP metrics (per [values.md Agent Report](../values.md#agent-report-canonical-fields) and [evals/README.md](README.md)):

- Clarifications requested per PR: ↓ over time (specs get clearer up front)
- Assumptions made per PR: → 0 (specs become complete)
- Spec gaps found per PR: ↓ over time (specs improve)
- Scope drift incidents per PR: ↓ over time

Refusals and inferences are logged in period tables for qualitative analysis but are not part of the MVP trajectory.
