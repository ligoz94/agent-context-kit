# Spec 001: Gap Analysis Against Mission-Style Agent Systems

## Objective

Identify the concrete gaps between the current `agent-context-kit` library and a mission-style agentic system that supports orchestrators, workers, validators, structured handoffs, milestone validation, and long-running autonomous execution.

## Current Strengths

The repository already has strong primitives in four areas:

1. **Layered context loading** via `manifest.yaml`, `docs/agent/*`, and selective feature loading.
2. **Workflow discipline** via prompt-driven stages such as triage, implement, finish, review, and fix-pr.
3. **Guardrails and verification** via `get_guardrails`, `request_human_approval`, and `verify_action`.
4. **Structured reporting conventions** via Agent Report fields, fresh-context review, and implementation handoff blocks.

These capabilities mean the project already provides the connective tissue that mission systems need. What it lacks is the execution runtime that turns these conventions into enforced behavior.

## Gap Matrix

| Capability from mission-style systems | Current state in agent-context-kit | Missing piece |
| --- | --- | --- |
| **Orchestrator role** | A minimal runtime loop now advances slices and creates repair/revalidate work, but there is no explicit orchestrator process with approval logic | A first-class orchestrator service or package |
| **Worker role** | The loop can run worker steps and persist handoffs, but worker isolation is still lightweight and command-driven | Dedicated worker execution contract with clean session inputs and outputs |
| **Validator role** | A minimum validator loop exists for scrutiny-style checks and repair creation | Separate validator runtime with stronger independence, evidence capture, and retry policy |
| **Validation contract** | Validation assertions now exist in manifest and mission state | Richer assertion mapping to milestones, slices, and evidence |
| **Shared mission state** | Mission state store now exists for plan, slices, findings, handoffs, and events | Budgeting, milestone-level state, git linkage, and richer operator controls |
| **Milestone loop** | A slice-level repair/revalidate loop is now shipped | Explicit milestone checkpoints and approval gates |
| **Behavioral validation** | `verify_action` exists and the mission loop supports validator steps, but there is no dedicated end-to-end behavioral validator runtime | Browser or app interaction validator with structured findings |
| **Machine-readable handoffs** | Structured handoffs and validator findings are persisted in mission state | Versioning, stronger schema richness, and broader tool support |
| **Model-per-role routing** | Manifest supports role configuration, but runtime model routing is not enforced | Role configuration for provider, model, effort, and fallback policy that actually drives execution |
| **Mission control / observability** | CLI status, timeline, handoffs, and events now provide a basic mission view | Current role, milestone view, budget counters, and richer observability |

## Practical Interpretation

Today the kit behaves like a **context operating system** for agents:

- it tells the model what the project is,
- what rules apply,
- which feature spec matters,
- and when to stop and ask for approval.

The current runtime has started to turn that into a **mission operating system**:

- it would decide which role acts next,
- persist the state between roles,
- enforce validation boundaries,
- and keep the mission coherent over many hours or days.

Today only part of that promise is shipped:

- local mission state,
- initial planning,
- validation contract persistence,
- a worker/validator loop,
- repair slice creation,
- and mission timeline visibility.

The remaining gap is not "mission runtime versus no mission runtime" anymore.
It is now:

> minimal local mission runtime versus full mission-grade orchestrated runtime

## Design Constraint

The runtime must be **additive**. It should not replace the current Toolshed and docs model. The existing context-kit should remain the source of truth for:

- identity,
- rules,
- guardrails,
- feature specs,
- learnings,
- prompts.

The runtime should orchestrate those resources, not fork them.

## Success Criteria

The gap is fully closed only when the library can do all of the following without relying on manual discipline alone:

1. Start a mission from a high-level goal.
2. Produce a plan with milestones and a validation contract before coding.
3. Execute one feature slice at a time with explicit role isolation.
4. Run scrutiny and behavioral validation after each milestone.
5. Persist structured handoffs and findings.
6. Create and schedule follow-up work when validation fails.
7. Show operators the current mission state without reading raw logs.

Several of these are now partially satisfied by the shipped local runtime, but the milestone and behavioral-validation pieces are still incomplete.