# Mission Workflow Guide

This guide explains the optional mission workflow in agent-context-kit: what it is, what problem it solves, when to use it, and how to turn it on.

---

## What It Is

The classic agent-context-kit workflow is document-first and prompt-driven:

- define or update the spec,
- implement against the approved spec,
- validate,
- review,
- merge.

The mission workflow adds a lightweight runtime on top of that.

It treats a task as a tracked mission with:

- a goal,
- a plan made of slices,
- a validation contract,
- validator findings,
- repair slices,
- and a persistent mission state file.

In short:

> classic workflow = spec and prompt orchestration
>
> mission workflow = spec and prompt orchestration + persistent execution loop

---

## What Problem It Solves

Use the mission workflow when the task is too large or too iterative for a single linear agent session.

Typical cases:

- a feature requires several implementation and validation passes,
- you want failures to become explicit repair tasks,
- you need a resumable execution state instead of chat-only context,
- you want a planner -> worker -> validator loop instead of one long ad hoc conversation.

It is useful when you need the system to keep track of:

- what is already done,
- what failed,
- what must be repaired,
- and what should run next.

---

## When To Use It

Use the classic workflow when:

- the task is small,
- you just need docs + implementation + review,
- you do not need a persistent state machine.

Use the mission workflow when:

- the task is multi-step,
- the task may fail validation and require retries,
- you want explicit handoffs and mission status,
- you want a tracked repair/revalidate loop.

---

## Current Scope

Today the shipped mission runtime is a minimum working loop.

It can:

- create mission state,
- derive a simple plan,
- run a planner -> worker -> validator loop,
- create repair slices from findings,
- add a revalidation step,
- persist everything to `.agent-context-kit/missions`.

It does **not** yet mean a fully autonomous coding agent swarm.

The current implementation is best understood as:

> a persistent task execution state machine for agent work

not yet:

> a full multi-agent production orchestrator

---

## How It Works

The loop is:

1. create mission
2. derive plan
3. run next slice
4. validate result
5. if validation fails, create repair slice
6. revalidate
7. finish when all slices are complete and findings are resolved

The mission state stores:

- goal
- status
- plan
- slices
- findings
- handoffs
- events

---

## How To Enable It

You have two options.

### Option A: enable it during `init`

When running:

```bash
context-kit init
```

the CLI asks whether to enable mission workflow scaffolding.

If you answer yes, it keeps the mission docs/config in the generated project.

### Option B: enable it later

If you initialized a classic project and change your mind later:

```bash
context-kit enable-mission
```

That command:

- adds mission docs,
- adds the mission feature entry to the manifest registry,
- adds a minimal `mission:` config block to `manifest.yaml`.

---

## How To Use It

### The Difference Between `mission start` and `mission run`

These two commands do different jobs.

`mission start` creates the mission.

It does **not** execute the loop. It only:

- creates the mission state file,
- stores the goal,
- creates the initial plan,
- initializes findings, handoffs, and events.

Think of it as:

> open a new tracked work item

`mission run` executes the mission.

It does **not** create a new mission from scratch. It takes the latest mission, or the one you specify, and:

- picks the next runnable slice,
- runs worker and validator steps,
- creates repair slices if validation fails,
- revalidates,
- updates mission status until it stops or completes.

Think of it as:

> continue working the tracked work item

In short:

- `mission start` = create and initialize mission state
- `mission run` = execute the planner -> worker -> validator loop on that mission state

Typical sequence:

```bash
context-kit mission start "Add mission runtime MVP"
context-kit mission run
context-kit mission status
```

Concrete meaning:

- first command creates the mission,
- second command performs the actual work loop,
- third command shows where the mission ended up.

### Start a mission

```bash
context-kit mission start "Add mission runtime MVP"
```

This creates the mission state, but does not yet execute any slices.

### Check status

```bash
context-kit mission status
```

### Run the loop

```bash
context-kit mission run
```

This reads the existing mission state and starts executing slices.

If you have just created a mission, `mission run` is usually the next command.

### Simulate a validator finding

```bash
context-kit mission run --simulate-finding "Fix flaky validator"
```

This is useful to verify that the loop actually performs:

- validate,
- create repair slice,
- revalidate,
- complete.

### Use real worker/validator commands

You can define them in `manifest.yaml`:

```yaml
mission:
  enabled: true
  state_dir: .agent-context-kit/missions
  execution:
    worker_commands:
      - npm run build
    validator_commands:
      scrutiny:
        - npm test
```

Then:

```bash
context-kit mission run
```

---

## What You Will See

After a run, `mission status` shows a summary of the mission.

`mission run` shows:

- mission id,
- loop reason,
- iteration count,
- slice completion count,
- open findings,
- recent timeline.

If a validator fails once and then passes after repair, the final state should be:

- mission completed,
- open findings = 0,
- finding status = resolved,
- repair and revalidate slices recorded in state.

---

## Relationship To The Classic Workflow

Mission is optional.

It does not replace the original agent-context-kit methodology.

The user chooses:

- classic workflow for normal document-driven work,
- mission workflow for persistent, iterative, validator-driven execution.

That separation is intentional.