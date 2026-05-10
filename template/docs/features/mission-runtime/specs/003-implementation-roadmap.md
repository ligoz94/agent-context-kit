# Spec 003: Implementation Roadmap

## Objective

Record what has already shipped for mission-runtime and define the next staged implementation steps without destabilizing the existing CLI, Toolshed server, or LangChain package.

## Status Snapshot

The repository is no longer at day zero.

Already shipped in some form:

- manifest mission schema,
- `packages/missions`,
- mission state persistence,
- planner output,
- validator result handling,
- repair and revalidate loop,
- CLI mission commands,
- Toolshed mission tools,
- LangChain mission tools,
- issue-based mission ingress,
- basic mission status and timeline visibility.

Still missing or incomplete:

- explicit orchestrator service,
- pause and resume controls,
- milestone-level mission management,
- behavioral validator runtime,
- budget and current-role observability,
- stronger model-per-role execution,
- richer operator approval flow.

## Milestone 1: Formalize the Missing Artifacts

Status: largely shipped

Deliverables:

- Add a validation-contract template to the docs system.
- Add a handoff schema document and JSON schema.
- Add a mission role configuration section to `manifest.yaml`.
- Document model-per-role strategy and guardrail boundaries.

What shipped:

- manifest mission schema,
- validation assertions in mission state,
- handoff schema in runtime state,
- role configuration support in manifest.

Remaining gap:

- better canonical docs that distinguish current runtime from target runtime,
- stronger linkage between prompt formats and structured runtime artifacts.

Why first:

This step turns fuzzy conventions into stable interfaces before any runtime code is added.

Exit criteria:

- New project templates can declare mission roles and validation contracts.
- Existing prompt files can reference the canonical handoff and validation-contract formats.

## Milestone 2: Ship a Local Mission Runtime MVP

Status: shipped as a minimum runtime

Deliverables:

- Create `packages/missions`.
- Implement local state persistence.
- Implement mission create, resume, pause, and status commands.
- Implement orchestrator planning output with milestone and slice structure.
- Implement machine-readable handoff writing.

What shipped:

- `packages/missions`,
- local mission state persistence,
- mission create and status flows,
- planning output with slices,
- structured handoffs,
- local mission loop execution.

Remaining gap:

- explicit resume/pause controls,
- milestone-level state,
- cleaner service decomposition.

Why second:

This provides a thin deterministic layer for persistence and bookkeeping without yet requiring full autonomous execution.

Exit criteria:

- A user can start a mission from CLI and inspect the mission state.
- A worker run can persist results into state.

## Milestone 3: Add Scrutiny Validation Loop

Status: shipped in minimum form

Deliverables:

- Scrutiny validator runner.
- Result schema for validator findings.
- Automatic follow-up slice creation on failed validation.
- Mission event log with pass/fail history.

What shipped:

- validator result schema,
- failed validation creates repair slices,
- revalidate slice creation,
- mission event history for pass/fail flow,
- CLI and tool support for validator recording.

Remaining gap:

- richer evidence capture,
- stricter validator independence,
- more realistic command-driven scrutiny defaults.

Why third:

This is the minimum feature set that turns a linear workflow into a self-correcting one.

Exit criteria:

- Failed validator runs produce repair slices rather than dead-end logs.
- Operators can see why a slice or mission is blocked.

## Milestone 4: Add Behavioral Validation

Status: not yet shipped

Deliverables:

- Browser or app-driving validator runner.
- Validation evidence capture such as screenshots, HTTP traces, or console output.
- Assertion mapping from validation contract to behavior validator steps.

Why fourth:

This is the most expensive and environment-sensitive piece. It should land after the state and scrutiny loop are stable.

Exit criteria:

- The runtime can verify an end-to-end user flow without relying only on unit tests.

## Milestone 5: Expose Mission Control Surface

Status: partially shipped

Deliverables:

- CLI `mission status` summary.
- Timeline of events and latest handoffs.
- Budget counters.
- Current role and current milestone visibility.

What shipped:

- CLI `mission status`,
- events and handoffs in mission state,
- recent timeline output in `mission run`.

Remaining gap:

- milestone visibility,
- current role visibility,
- budget counters,
- more operator-facing summaries.

Why fifth:

Long-running systems need observability before they can be trusted.

Exit criteria:

- An operator can understand mission health without opening raw files.

## Milestone 6: Integrate with MCP and LangChain

Status: partially shipped

Deliverables:

- Mission tools in the Toolshed server.
- Mission tools in `@agent-context-kit/langchain`.
- Guardrail middleware support for mission mutations.

What shipped:

- mission tools in Toolshed,
- mission tools in `@agent-context-kit/langchain`,
- local run surface for mission state mutation.

Remaining gap:

- fuller mission-control tool surface,
- mission-specific guardrail middleware,
- stronger safety around advanced mission mutations.

Why sixth:

Once the runtime is stable locally, it can be exposed as a reusable tool surface.

Exit criteria:

- An agent using MCP or LangChain can inspect and advance mission state safely.

## Next Concrete Milestones

The next meaningful build steps are:

1. Add explicit `pause`, `resume`, and richer mission mutation commands.
2. Introduce milestone-level state instead of slices-only progression.
3. Add a true behavioral validator runner.
4. Introduce real role execution boundaries for orchestrator, worker, and validator.
5. Improve operator observability with current role, milestone, and budget state.

## Suggested Build Order Inside the Repo

1. Manifest schema extension in `packages/toolshed-server/src/manifest.ts`
2. Shared schemas in a missions package
3. CLI mission commands
4. Toolshed mission tools
5. LangChain mission tools
6. Behavioral validator integration

Note: steps 1 through 5 are already at least partially shipped. The remaining work is now about deepening and hardening the runtime rather than introducing it for the first time.

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Over-coupling runtime and docs | Could fork the current source of truth | Keep docs authoritative and runtime read-only where possible |
| Too much parallelism | Causes conflicting code changes | Keep write execution serial; parallelize only read-only work |
| Validator noise | Too many false positives reduce trust | Require structured evidence and severity levels |
| State drift | Long-running missions can desync from the repo | Persist every transition and record git commit hashes in state |
| Model lock-in | Weakest model limits the whole system | Route models per role and allow provider diversity |