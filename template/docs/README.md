# Project Documentation

All processes, feature designs, specs, and domain knowledge for this project.

## Reading Order

1. [values.md](agent/values.md) — intent engineering standard (required, always first)
2. [app-config.md](agent/app-config.md) — package names, paths, tooling, MCP config
3. [product-context.md](agent/product-context.md) — target user, primary device, constraints
4. [context-policy.md](agent/context-policy.md) — L0/L1/L2: how much doc to load per task
5. [key-learnings.md](agent/key-learnings.md) — past mistakes and hard-won lessons (when fixing bugs / regressions)
6. [architecture-primer.md](agent/architecture-primer.md) — stack, routes, data flow (when stack is unfamiliar)
7. Feature doc for the area you're working in (table below)
8. Linked spec(s) for the specific task

Then pick the right prompt from the table below.

---

## Quick Navigation

| Your Task              | Required Reading                                                        | Prompt                                                     |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Any work**           | values.md → app-config.md → context-policy.md; then L2 docs per task   | —                                                          |
| **Populate docs**      | Run after init+setup — fill all templates with project info             | [populate-project.md](agent/prompts/populate-project.md)   |
| **Triage issue**       | values.md → feature register below                                      | [triage-issue.md](agent/prompts/triage-issue.md)           |
| **Triage all issues**  | values.md → feature register below                                      | [triage-all-issues.md](agent/prompts/triage-all-issues.md) |
| **Update/create spec** | values.md → feature doc → spec template                                 | [update-docs.md](agent/prompts/update-docs.md)             |
| **Implement feature**  | values.md → feature doc → spec                                          | [implement-feature.md](agent/prompts/implement-feature.md) |
| **Finish (pre-push)**  | values.md → spec                                                        | [finish.md](agent/prompts/finish.md)                       |
| **Fix bug**            | values.md → find spec → key-learnings.md                                | [fix-bug.md](agent/prompts/fix-bug.md)                     |
| **Review PR**          | values.md → spec                                                        | [review-pr.md](agent/prompts/review-pr.md)                 |
| **Review spec**        | values.md → feature doc → spec template                                 | [review-spec.md](agent/prompts/review-spec.md)             |
| **Fix PR**             | values.md → key-learnings.md                                            | [fix-pr.md](agent/prompts/fix-pr.md)                       |
| **Update docs**        | values.md → feature doc → spec                                          | [update-docs.md](agent/prompts/update-docs.md)             |
| **Full review**        | values.md + full-review prompt                                          | [full-review.md](agent/prompts/full-review.md)             |
| **UI test (browser)**  | values.md → feature spec → dev server running                           | [ui-test.md](agent/prompts/ui-test.md)                     |

---

## Feature Register

Status: `implemented` | `partial` | `planned` | `deprecated`

| Feature | Status | Description | Specs |
| ------- | ------ | ----------- | ----- |
| _(add features here)_ | — | — | — |

<!-- agent-context-kit:feature-register:start -->
<!-- agent-context-kit:feature-register:end -->

---

## Development Workflow

- **Full guide** (humans): [human/agentic-development.md](human/agentic-development.md) — pipeline diagram, prompt reference, priming examples, doc structure map
- **Pipeline detail** (agents): [agent/prompts/development-workflow.md](agent/prompts/development-workflow.md) — triage → spec → implement → finish → review → fix-pr → merge
