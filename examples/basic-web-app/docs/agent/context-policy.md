<!-- agent-context-kit:engine:start -->

## L0 — Always (minimal)

Before code or architectural commitment:

1. **Task goal** from the user (what "done" means).
2. **[values.md](values.md)** — halt on ambiguity, spec traceability, security, refusals.
3. **App's `app-config.md`** — package names, file paths, spec system, tooling.
4. **App's `product-context.md`** — target user, primary device, viewport tiers (if present).
5. **App's `docs/README.md`** — feature register row + which prompt template applies (do not read every feature doc by default).

Optional one-liner in the reply: which L1/L2 paths you will open next.

## L1 — Just-in-time (per task)

Open **only** what the task needs:

| Task type         | Load                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Triage issue      | [prompts/triage-issue.md](prompts/triage-issue.md) + app's feature register                                                            |
| Triage all issues | [prompts/triage-all-issues.md](prompts/triage-all-issues.md) + [prompts/triage-issue.md](prompts/triage-issue.md)                      |
| Implement feature | [prompts/implement-feature.md](prompts/implement-feature.md) + relevant feature doc + spec(s)                                          |
| Fix bug           | [prompts/fix-bug.md](prompts/fix-bug.md) + spec + feature doc for affected area                                                        |
| Finish (pre-push) | [prompts/finish.md](prompts/finish.md) + spec for the work just completed                                                              |
| Review PR         | [prompts/review-pr.md](prompts/review-pr.md) + [prompts/\_review-dimensions.md](prompts/_review-dimensions.md) + spec                  |
| Full review       | [prompts/full-review.md](prompts/full-review.md) + [prompts/\_review-dimensions.md](prompts/_review-dimensions.md) + spec + design doc |
| Review API        | App's `review-api.md` (if exists) + app's backend architecture doc                                                                     |
| Update docs       | [prompts/update-docs.md](prompts/update-docs.md) + affected feature/spec                                                               |
| UI test           | [prompts/ui-test.md](prompts/ui-test.md) + feature spec + acceptance criteria                                                          |
| Data model change | App's data model docs (path in app-config.md § Paths)                                                                                  |

Do **not** preload the entire `features/` tree or all domain docs for a single small change.

## L2 — On demand

| When                                                                | Open                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bug, regression, or "why did we do X?"                             | App's `key-learnings.md` (full)                                                     |
| Implementing/fixing in a specific area with known gotchas           | Relevant section of `key-learnings.md` — see routing index at top of file           |
| Unfamiliar stack, routes, data flow                                 | App's `architecture-primer.md`                                                      |
| Domain entities or business terminology                             | Domain docs (path in app-config.md § Paths)                                         |
| UI / Storybook / testing conventions                                | Code standards (path in app-config.md § Paths)                                      |
| Backend layers, entities, filters                                   | App's backend docs (path in app-config.md § Paths)                                  |
| Working with test/example data                                      | App's data model docs (path in app-config.md § Paths)                               |

### MCP Toolshed

If the app has an MCP Toolshed server configured (check app-config.md § MCP Toolshed), **query** instead of bulk-reading files:

- `lookup_glossary` — domain terminology
- `get_spec` / `get_feature_doc` — feature intent and spec text
- `list_registry` — register overview
- `get_arch_pattern` — handler/service/repository conventions
- `get_code_standard` — coding standards
- `get_learnings` — key learnings

## App Config

Each app maintains an `app-config.md` in its `docs/agent/` directory. This file provides:

- **Identity**: package names, GitHub repo name, build commands
- **Paths**: feature docs, feature register, architecture primer, key learnings, domain docs, backend docs
- **Spec System**: how specs are managed (feature-local, shared, etc.)
- **MCP Toolshed**: whether a toolshed server is available
- **UI Framework**: component library and stack details

Read this file as part of L0 to resolve all app-specific references in shared prompts.

## Re-anchor (long threads)

After many tool turns, or before a large refactor, **repeat a short anchor** (3-8 lines), not full files:

- Objective and **absolute paths** to the spec(s) in scope
- **Non-goals** that must not be violated
- **Security / data** boundaries from the spec
- Current branch name if relevant

**Example**:

```
Objective: implement spec 001 table filters for dashboard tab
Spec: docs/features/dashboard/specs/001-table-filters.md
Feature doc: docs/features/dashboard/feature.md
Non-goals: no changes to API response shape, no new endpoints
Security: read-only — no mutations in this spec
Branch: feat/dashboard-filters
```

This mitigates _lost-in-the-middle_ degradation when the context window is long.

## Prune

- Drop or **summarize** stale tool output (e.g. old directory listings, superseded file contents); keep **paths + one-line conclusion**.
- Prefer a **new chat** for review steps (see [prompts/development-workflow.md](prompts/development-workflow.md)).

## Five-layer map (context stack)

| Layer           | Role                                | Primary artifacts                                                 |
| --------------- | ----------------------------------- | ----------------------------------------------------------------- |
| **System**      | Persona, safety, execution rules    | [values.md](values.md), CLAUDE.md                                 |
| **Domain**      | Business vocabulary and rules       | App's domain docs                                                 |
| **Task**        | What to build, acceptance, I/O      | Feature docs, specs                                               |
| **Interaction** | Clarifications, refusals, halt      | [values.md](values.md) Process section, checklists in prompts     |
| **Response**    | PR shape, traceability, eval signal | PR template in [values.md](values.md) PR Structure + Agent Report |

## Related

- [evals/README.md](evals/README.md) — measuring spec gaps and context mistakes over time
- [prompts/development-workflow.md](prompts/development-workflow.md) — pipeline, handoff, fresh-context review

<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
# Context Policy & Agent Autonomy

1. **You are explicitly forbidden from:**
   - Modifying `db/schema.prisma` without explicit permission. Database migrations must be reviewed by lead engineers.
   - Using \`npm install\` to add new libraries unless asked. We prefer standardizing on our current dependencies.
   - Reconfiguring `next.config.js` or `middleware.ts`.

2. **When suggesting architectural changes:**
   - Always reference the `architecture-primer.md`.
   - Consider the impact on Server Components vs Client Components.

3. **Autonomy Level:**
   - You may freely generate new React components in `components/domain/`.
   - You may freely generate new Server Actions in `actions/`.
   - Ask for confirmation before modifying core `lib/` utilities.
<!-- agent-context-kit:project:end -->
