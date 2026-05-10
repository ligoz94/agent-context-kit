# Spec 002: Runtime Architecture for Missions

## Objective

Define the runtime architecture that layers mission orchestration on top of `agent-context-kit` without replacing the current context-loading model.

## Current State vs Target State

This document describes both:

- the **current shipped runtime**, and
- the **target runtime architecture**.

Current shipped runtime:

- `packages/missions` exists,
- mission state persists locally,
- planner output exists,
- validator results create repair slices,
- CLI mission commands exist,
- Toolshed and LangChain expose a first mission tool surface.

Target runtime:

- explicit orchestrator service,
- stronger worker and validator isolation,
- milestone-level planning,
- behavioral validator runtime,
- richer observability and operator control.

## Proposed Package Layout

Add a new package:

```text
packages/
  missions/
    src/
      index.ts
      mission-service.ts
      planner.ts
      worker-runner.ts
      validator-runner.ts
      state-store.ts
      event-log.ts
      schemas.ts
      model-router.ts
      tools.ts
      cli.ts
```

### Module responsibilities

Some of these modules are already present in simplified form, while others are still target modules.

- `mission-service.ts` — target module for create, resume, pause, and advance missions.
- `planner.ts` — shipped in simplified form; currently converts a goal into slices and a validation contract.
- `worker-runner.ts` — target module; current runtime uses a lighter worker execution hook.
- `validator-runner.ts` — target module; current runtime uses a lighter validator execution hook.
- `state-store.ts` — shipped in simplified form via local mission state persistence.
- `event-log.ts` — effectively shipped through mission events embedded in state, though not yet as a separate subsystem.
- `schemas.ts` — shipped; shared schemas for mission state, handoffs, findings, and validation results now exist.
- `model-router.ts` — target module; manifest role config exists, but runtime routing is not yet enforced.
- `tools.ts` — partially shipped through Toolshed/LangChain mission tools.
- `cli.ts` — shipped; end-user mission commands exist.

## Core Roles

### Orchestrator

Responsibilities:

- clarify goal and scope with the operator,
- produce milestones and feature order,
- write the validation contract before coding,
- decide whether validator findings require repair, rescoping, or operator approval.

In the target model, the orchestrator should be the only role allowed to:

- change mission status,
- re-order milestones,
- create follow-up feature slices,
- close a milestone.

Current note:

Today the shipped runtime has orchestrator-like behavior embedded in the loop, but not yet as a fully separate role or process.

### Worker

Responsibilities:

- load the mission slice,
- load only required feature docs and rules,
- implement the assigned feature,
- run slice-scoped checks,
- emit a structured handoff.

The worker must not decide the next mission step. It only completes or fails its assigned slice.

Current note:

Today the shipped loop already follows this rule in spirit, but with a lighter execution model. Worker commands or callbacks run the current slice, while the loop decides what comes next.

### Validators

Two validator types should exist.

1. **Scrutiny validator**
   Runs tests, type checks, linting, and code-review style analysis with fresh context.

2. **Behavior validator**
   Launches the application or target process and verifies user-visible behavior through browser or command-driven flows.

Validators must be independent of the worker context to preserve adversarial checking.

Current note:

Today a minimum validator loop exists and can create repair plus revalidate slices, but only scrutiny-style validation is realistically present. Behavioral validation is still a target capability.

## Mission State Schema

The runtime needs a persistent machine-readable state. Example target shape:

```json
{
  "id": "mission_2026_05_10_001",
  "goal": "Ship mission runtime MVP for agent-context-kit",
  "status": "validating",
  "currentMilestoneId": "ms_02",
  "currentSliceId": "slice_05",
  "budget": {
    "maxTokens": 2000000,
    "usedTokens": 412000,
    "maxHours": 24
  },
  "roles": {
    "orchestrator": { "model": "gpt-5.4", "provider": "openai", "effort": "high" },
    "worker": { "model": "claude-sonnet", "provider": "anthropic", "effort": "medium" },
    "scrutinyValidator": { "model": "gpt-5.4-mini", "provider": "openai", "effort": "medium" },
    "behaviorValidator": { "model": "computer-use-model", "provider": "anthropic", "effort": "medium" }
  },
  "milestones": [],
  "validationContract": [],
  "handoffs": [],
  "findings": [],
  "events": []
}
```

Current note:

The shipped state is smaller than this target example. It currently includes goal, status, plan, slices, validation contract, handoffs, events, findings, and optional source issue.

## Validation Contract

The validation contract must be created before implementation. Each assertion should be atomic and traceable.

Example:

```yaml
validationContract:
  - id: vc-auth-001
    feature: mission-runtime
    milestone: planning
    type: behavioral
    assertion: "Starting a mission writes a persistent state file and displays the current milestone."
  - id: vc-auth-002
    feature: mission-runtime
    milestone: validation
    type: scrutiny
    assertion: "A failed scrutiny validator creates a follow-up slice instead of marking the mission done."
```

The runtime must support mapping:

- assertion -> slice,
- assertion -> validator type,
- assertion -> pass/fail evidence.

Current note:

The shipped runtime supports validation assertions, but not yet the full assertion-to-evidence mapping described here.

## Handoff Schema

Every worker and validator run should emit a structured handoff:

```json
{
  "runId": "wrk_005",
  "role": "worker",
  "sliceId": "slice_05",
  "status": "completed_with_findings",
  "summary": "Implemented mission state persistence and CLI listing",
  "filesTouched": [
    "packages/missions/src/state-store.ts",
    "packages/missions/src/cli.ts"
  ],
  "commands": [
    { "command": "npm test -- missions", "exitCode": 0 }
  ],
  "issues": [
    "Behavior validator not implemented yet"
  ],
  "nextSuggestedAction": "Run scrutiny validator for slice_05"
}
```

The markdown handoff used in prompts can remain as a human-readable rendering of this object.

Current note:

Structured handoffs are already shipped in simplified form, but the target schema here is richer than the current implementation.

## Runtime Flow

Target flow:

1. Operator starts a mission.
2. Orchestrator clarifies scope and writes a plan.
3. Orchestrator writes the validation contract.
4. Worker executes the next slice.
5. Worker emits handoff.
6. Scrutiny validator runs.
7. Behavior validator runs when relevant.
8. Orchestrator decides whether to:
   - mark the slice done,
   - create repair work,
   - re-scope,
   - or pause for operator approval.
9. On milestone completion, the mission advances.

Current shipped flow:

1. Operator starts a mission.
2. Planner derives a simple slice plan and validation contract.
3. The runtime runs the next slice.
4. Worker completion is persisted as a handoff.
5. Validator runs.
6. Failed validation creates repair and revalidate slices.
7. Mission completes when all slices are done and findings are resolved.

## MCP and LangChain Integration

The runtime should stay compatible with the existing stack.

Recommended tool additions:

- `create_mission`
- `get_mission_state`
- `list_mission_events`
- `submit_handoff`
- `create_followup_slice`
- `close_milestone`
- `pause_mission`
- `resume_mission`

These tools complement the existing context tools. They should not duplicate `get_spec`, `get_rules`, `get_learnings`, or `get_guardrails`.

Current note:

The first mission tool surface is already shipped, but `create_followup_slice`, `close_milestone`, `pause_mission`, and `resume_mission` remain future extensions.