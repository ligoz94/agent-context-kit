# Feature: mission-runtime

## Status

planned

## Purpose

Define how agent-context-kit evolves from a context and guardrail toolkit into a mission-driven execution system with orchestrators, workers, validators, shared mission state, and long-running validation loops.

## Canonical Sources

- `docs/features/mission-runtime/specs/001-gap-analysis.md`
- `docs/features/mission-runtime/specs/002-runtime-architecture.md`
- `docs/features/mission-runtime/specs/003-implementation-roadmap.md`
- `docs/features/mission-runtime/specs/004-operator-workflows.md`

## Load This When

- You are deciding what is missing between the current kit and a mission-style agent ecosystem.
- You are designing orchestration roles, shared mission state, or validator behavior.
- You need a practical operator workflow for planning, executing, validating, and repairing long-running agent work.

## Notes For Agents

- Treat this feature as a proposed future architecture, not current shipped behavior.
- The current repository already provides context loading, prompt routing, guardrails, and selective retrieval; the runtime layer described here is additive.
- When implementing this feature, keep the existing L0/L1/L2 model and Toolshed integration as the foundation rather than replacing them.