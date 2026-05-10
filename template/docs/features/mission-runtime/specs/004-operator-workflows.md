# Spec 004: Habitual Operator Workflows

## Objective

Describe how a human operator would use the mission-runtime system in normal practice, with clear examples for planning, implementation, validation, and recovery.

## Scope Note

This document mixes two layers intentionally, but they must be read differently:

- **current workflow**: what the shipped runtime can already do,
- **target workflow**: the richer orchestrator-led flow the architecture still aims for.

Unless otherwise stated, examples in this file should be read as current workflow with light future-looking notes.

## Guiding Principle

The operator should spend time on:

- setting goals,
- approving scope,
- reviewing hard tradeoffs,
- and merging validated work.

The system should spend time on:

- planning slices,
- executing work,
- validating behavior,
- recording handoffs,
- and creating repair tasks.

## Workflow A: New Feature Mission

Example goal:

> Add a mission runtime MVP to `agent-context-kit` with local state persistence and validator-ready handoffs.

### Step 1: Start the mission

Proposed operator command:

```bash
context-kit mission start "Add mission runtime MVP"
```

Current system behavior:

- mission state is created,
- a simple plan is derived,
- a validation contract is attached,
- the mission is ready for `mission run`.

Target behavior:

- orchestrator reads project identity, guardrails, rules, and relevant specs,
- asks any missing scope questions,
- drafts milestones,
- drafts validation contract,
- waits for operator approval.

Example approval checkpoint:

```text
Mission Plan Summary
- Milestone 1: schemas and manifest support
- Milestone 2: local runtime package and CLI
- Milestone 3: scrutiny validator loop

Validation Contract Summary
- starting a mission creates persistent state
- failed validation creates a repair slice
- mission status shows active milestone and last findings
```

### Step 2: Approve the plan

Current note:

The shipped runtime does not yet have a formal approval gate. Plan approval is still mostly a human/team convention.

Operator action:

- confirm milestones,
- trim scope if needed,
- approve the validation contract.

This is the point where the system locks the initial definition of done.

### Step 3: Let the worker execute one slice at a time

Current system behavior:

- selects the first runnable slice,
- executes the worker step,
- persists a structured handoff,
- advances to validation or the next slice.

Target behavior:

- opens a clean worker context,
- implements the slice,
- runs slice checks,
- submits a structured handoff.

Example handoff summary:

```text
Worker Handoff
- Slice: mission state persistence
- Status: complete
- Files: state-store.ts, schemas.ts, cli.ts
- Commands: npm test -- missions (0)
- Notes: validator hooks not yet wired
```

### Step 4: Run validators

Current system behavior:

- scrutiny-style validation can run,
- findings are stored,
- failed validation creates repair and revalidate work.

Target behavior:

- scrutiny validator checks tests, types, lint, and review findings,
- behavior validator runs only if the slice has observable runtime behavior,
- findings are stored against the slice and validation-contract assertions.

### Step 5: Repair if needed

If a validator fails, the orchestrator does not simply report failure. It creates a repair slice.

Example:

```text
Finding: mission status command does not show blocked milestone reason
Action: create follow-up slice `repair-status-output`
```

### Step 6: Review mission state

Operator checks `mission status` rather than reading raw logs.

Expected summary:

```text
Mission: Add mission runtime MVP
Status: blocked on repair slice
Last finding: missing blocked-reason output in CLI status
Next action: repair then revalidate
```

Current note:

The shipped runtime shows mission summary, findings, handoffs, and recent timeline. It does not yet expose milestone state as richly as this file originally assumed.

## Workflow B: Bug-Fix Mission

Example goal:

> Fix a regression where `verify_action` passes even when the target JSON path is missing.

How it differs:

- mission scope is narrower,
- the orchestrator should load `key-learnings.md` earlier,
- the validation contract should emphasize regression coverage,
- the behavior validator may be skipped if command-level validation is enough.

Typical current flow:

1. Start mission with bug statement.
2. Planner derives the initial slices.
3. Worker implements minimal fix.
4. Scrutiny validator confirms test coverage and no API drift.
5. Mission closes after regression proof is attached.

## Workflow C: Large Refactor Mission

Example goal:

> Refactor the Toolshed handlers into smaller modules without changing the public tool surface.

How it differs:

- milestones should be small and serial,
- validation contract should include compatibility assertions,
- behavioral validation may focus on CLI and MCP smoke tests,
- orchestrator should bias toward repair slices instead of widening scope.

Typical target milestone plan:

1. Extract read-only helpers.
2. Extract write/update handlers.
3. Re-run smoke tests.
4. Re-run validator review with public API assertions.

## Best Practices for Operators

1. Start with a goal, not a patch-level implementation order.
2. Make the validation contract explicit before any worker writes code.
3. Keep write execution serial.
4. Use different models or providers for implementation and validation when possible.
5. Treat validator failures as new work items, not as chat messages.
6. Review mission status at milestone boundaries, not after every command.

## Best Practices for the Runtime

1. Never mark a milestone complete without validator evidence.
2. Never let a worker decide the next mission step.
3. Never store only prose when structured state is available.
4. Never rely on tests written after implementation as the sole correctness source.
5. Never collapse the orchestrator, worker, and validator roles into one long context if the task is non-trivial.

## Practical Reading Guide

If you are using the shipped runtime today, read this file with the following substitutions in mind:

- "milestone" often means "slice" in the current implementation,
- "orchestrator" often means the current mission loop plus operator judgment,
- "behavior validator" is still mostly future scope,
- explicit approval gates are still process conventions rather than runtime-enforced states.