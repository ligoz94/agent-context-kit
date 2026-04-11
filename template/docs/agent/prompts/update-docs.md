# Update Docs Prompt

Use this prompt when docs need to align with an issue, PR, or new requirement — it figures out what to update.

## When to Use This Prompt

| Situation                                                | Use                                          |
| -------------------------------------------------------- | -------------------------------------------- |
| GitHub issue needs to be captured in docs                | **this prompt**                              |
| Feature doc is stale or missing requirements             | **this prompt**                              |
| No spec exists yet for a feature                         | **this prompt**                              |
| Existing spec has gaps, ambiguity, or missing edge cases | **this prompt**                              |
| Implementation reveals undocumented behavior             | **this prompt**                              |
| Spec is approved and complete, ready to code             | [implement-feature.md](implement-feature.md) |

This prompt always runs **before** [implement-feature.md](implement-feature.md). The output (aligned docs) is the input to implementation.

## Required Reading

0. **App's docs README** — reading order, feature register, prompt navigation (path in app-config.md § Paths)
1. **[Intent Engineering Standard](../values.md)** — spec-driven development principles
2. **Feature template** — structure for design docs (WHAT/WHY). Find via app's docs directory.
3. **Spec template or system** — see app-config.md § Spec System for how specs are managed

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `list_registry` instead of manually opening files.

## Process

### Step 1 — Resolve Input

Determine the source of truth for what needs documenting:

| Input                  | How to Read                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| GitHub issue URL or #N | `gh issue view <number>` — capture title, body, labels, comments |
| GitHub PR              | `gh pr view <number>` — read description + linked issue          |
| Verbal description     | Extract requirements from conversation context                   |

If no input is provided, ask: "What issue, PR, or requirement should I align docs with?"

### Step 2 — Extract Intent

From [Intent Extraction Template](../values.md#intent-extraction-template-internal-agent-step). Fill every field or halt:

```
Objective: [What is the goal?]
Constraints: [What limits exist?]
Non-goals: [What should NOT be done?]
Data inputs: [What data comes in?]
Data outputs: [What data goes out?]
Failure states: [How can this fail?]
Security boundaries: [What security considerations?]
Acceptance criteria: [How do we know it's done?]
```

If the input is too vague to fill these → **halt and request clarification**. Do not infer.

### Step 3 — Triage: What Needs Updating?

Search for affected docs in the app's feature docs directory (path in app-config.md § Paths):

```sh
grep -r "<feature keyword>" <feature-docs-path>/
```

Read the app's feature register to identify the primary feature and any features that reference it.

Produce a triage checklist:

```
- [ ] Feature doc: <path> — [create | update | aligned]
- [ ] Spec: <path> — [create | update | aligned]
- [ ] Cross-references: <list of other feature docs that mention this feature> — [update | aligned]
- [ ] Feature register (README.md): [update | aligned]
```

Rules:

- **Feature doc exists + has gaps vs input** → update it
- **No feature doc** → create from the app's feature template
- **Spec exists + has gaps** → update it
- **No spec + input has implementation-level detail** → create using the app's spec system (see app-config.md § Spec System)
- **Other feature docs reference this feature** → check those sections are still accurate

### Step 4 — Update Feature Doc (if needed)

Feature doc answers: **what** the system does and **why**.

For each requirement in the input, verify the feature doc covers it:

1. **UI elements / columns** — listed in relevant sections
2. **Filters / controls** — listed with types (multi-select, string, number)
3. **Display rules** (units, formatting, visibility) — documented in Visual Notes or Technical Intent
4. **Default states** (hidden columns, default sort, initial filters) — documented explicitly
5. **Ordering / layout** — documented if non-obvious

Update only the sections that are stale. Do not rewrite aligned content.

Do NOT include implementation tasks in the feature doc — those go in specs.

### Step 5 — Update or Create Spec (if needed)

Spec answers: **how** to implement it (tasks, data contracts, validation).

#### Updating an Existing Spec

- Add new tasks for uncovered requirements
- Update acceptance criteria
- Note new unknowns

#### Creating a New Spec

Use the app's spec system (see app-config.md § Spec System). Include:

1. **Parsed Intent** — from Step 2
2. **Unknowns** — anything ambiguous blocks implementation
3. **Tasks** — file-level checklists, minimal code references
4. **Validation Plan** — test scenarios, edge cases
5. **Risks** — security, data, regression concerns
6. **Acceptance Criteria** — testable statements only

### Step 6 — Cross-Reference Check

Other feature docs may summarize or reference the feature being updated. Find them:

```sh
grep -rl "<feature-name>\|<feature keyword>" <feature-docs-path>/*/feature.md | grep -v "_template"
```

For each match:

1. Read the section that references this feature
2. Check it's consistent with the updated feature doc
3. Update if stale — keep it concise (these are summaries, not duplicates)

### Step 7 — Coverage Verification

Walk through every requirement in the input and confirm it's traceable to a doc:

```
| Requirement (from issue)         | Feature Doc Section     | Spec Task       |
| -------------------------------- | ----------------------- | --------------- |
| Add filter for status            | §2 Visual Design Notes  | spec §Tasks #3  |
| ...                              | ...                     | ...             |
```

If any requirement has no doc reference → go back and add it.

### Step 8 — Update Feature Register (if needed)

If a new feature doc or spec was created, add it to the app's feature register (docs/README.md).

If an existing feature's status changed (e.g., `Planned` → `Partially Implemented`), update it.

### Step 9 — Summary

Output a concise summary:

```
## Docs Updated
- <path>: <what changed>
- <path>: <what changed>

## Coverage
<N>/<N> requirements from #<issue> are documented

## Unresolved
- <any requirements that couldn't be documented due to ambiguity>
```

## Design Doc vs Spec

**Design Doc** (WHAT & WHY): user-focused, feature overview, problem statements, user flows.

**Spec** (HOW): developer-focused, technical tasks, implementation details, progress tracking.

**Rule**: Specs implement design docs. If spec contradicts design → update design first.

## Quality Checklist

Before finishing:

- [ ] Every input requirement appears in at least one doc
- [ ] Feature doc matches current expected behavior
- [ ] Spec acceptance criteria are testable
- [ ] Cross-referencing feature docs are consistent
- [ ] No implementation tasks leaked into feature doc
- [ ] No inferred requirements — only what the input explicitly states
- [ ] Feature register is current

## Anti-Patterns

From [Anti-Patterns](../values.md#anti-patterns):

- **Implicit Requirements** — "Obviously it should..." → make it explicit in the doc
- **Spec Drift** — don't update spec retroactively to match code; update docs to match intent
- **Over-Scoping** — only document what the input explicitly describes
- **Duplicate Content** — cross-references should summarize, not copy. One source of truth per fact.
- **Missing Non-Goals** — if the input has an "out of scope" section, capture it

## Next Step

> **Agent instruction**: When docs are aligned and the summary is output, prompt the user: _"Docs aligned. Once the spec is approved (merged to main), run `/implement-feature` to begin implementation."_

## Remember

> **Specs Are Living, Code Is Ephemeral** ([values.md](../values.md#specs-are-living-code-is-ephemeral))
>
> Docs must stay ahead of code. When an issue reveals gaps, pause and update docs before implementing.

> **Intent Precedes Implementation** ([values.md](../values.md#intent-precedes-implementation))
>
> An issue is a signal of intent, not a spec. Your job here is to make the intent explicit and traceable.
