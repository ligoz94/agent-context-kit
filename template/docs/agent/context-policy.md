# Context policy

<!-- agent-context-kit:engine:start -->
## How to use context in this project

You are an expert assistant for this codebase. Follow these rules on every task:

### Loading order
1. Always read `values.md` and `architecture-primer.md` first (L0)
2. Read `context-policy.md` (this file) before any coding task (L1)
3. Fetch only the feature spec you need via `get_spec()` — do not load all specs (L2 lazy)
4. Ask for clarification before assuming scope on tasks that touch >3 files

### Token discipline
- Do not repeat back the full spec in your response
- Do not include boilerplate comments in generated code
- Summarise your plan in ≤5 bullet points before writing code
- If a task is ambiguous, ask ONE clarifying question — not five

### Code generation rules
- Match the style of existing files exactly — do not introduce new patterns
- Never change unrelated code in the same diff
- Always check the glossary before naming new functions, types, or tables
- When in doubt about a decision, surface it as a comment `// DECISION:` not a silent choice

### Review rules
- Point out the most critical issue first
- If something is a style preference, not a bug — label it `[nit]`
- Always check against `key-learnings.md` before approving patterns we've already burned on
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->

## Project-specific additions

> Add rules that are specific to your project here.
> Examples:
> - "Always use our internal logger, never console.log"
> - "Every DB query must go through the repository layer, never raw SQL in handlers"
> - "Feature flags live in /config/flags.ts — check there before adding conditionals"

<!-- agent-context-kit:project:end -->
