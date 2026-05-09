# Feature: agentic-development-workflow

## Status

stable

## Purpose

Define the operating workflow for agent-driven delivery: triage, spec creation, implementation, finish checks, review, and PR follow-up.

## Canonical Sources

- `docs/human/agentic-development.md`
- `docs/agent/prompts/development-workflow.md`
- `docs/README.md`

## Load This When

- The task is about choosing the right prompt or workflow stage.
- The team is deciding where human approval gates belong.
- A contributor needs the expected handoff between spec work, coding, review, and merge.

## Notes For Agents

- Load only the prompt for the current stage; do not preload every prompt in the workflow.
- Review steps should happen in a fresh conversation when possible.
- If the workflow becomes project-specific, add decision records under a feature-local `specs/` folder.