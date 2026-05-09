# Populate Project Docs

Use this prompt **once, right after `context-kit init && context-kit setup`**, to fill every template file with real project-specific information.

`setup` auto-detects name, stack, and paths from project files. This prompt goes further: the agent reads the codebase autonomously, drafts all content, writes it, then asks only the questions it cannot answer from code alone.

## When to Use

| Situation | Use |
|-----------|-----|
| Just ran `context-kit init && context-kit setup` | **this prompt** |
| Onboarding a new project from scratch | **this prompt** |
| Docs are all placeholder text | **this prompt** |
| Iterating on a specific file | Edit that file directly instead |

---

## Process

### Phase 1 — Autonomous scan (no questions yet)

Read the following in order, extracting facts silently:

1. `package.json` (or `go.mod`, `pyproject.toml`, `Cargo.toml`) — name, deps, scripts
2. `README.md` — description, features, any setup instructions
3. Source directory structure — top-level dirs, key entry points
4. Any existing schema files (`prisma/schema.prisma`, `drizzle/`, `*.sql`, `models/`)
5. Route definitions (`src/routes/`, `src/pages/`, `app/`, `cmd/`)
6. Any existing test files — infer testing conventions
7. `manifest.yaml` — what `setup` already detected
8. `docs/agent/architecture-primer.md` — what `setup` already filled

From this scan, draft content for every file below **without asking anything yet**.

---

### Phase 2 — Write drafts

Write the drafted content into each file's `<!-- agent-context-kit:project:start/end -->` region (or directly if no region exists). Use concrete language — no `<placeholder>` text. If you cannot infer something, write a short inline comment `<!-- TODO: … -->` at that specific point only.

Work through these files:

#### `docs/agent/product-context.md`
Infer from README and src structure:
- **Target user** — infer from README tone, domain words, or feature names
- **Primary device** — infer from stack (Next.js/React → likely browser desktop; Expo/React Native → mobile)
- **Constraints** — infer from deps (e.g. no third-party analytics if missing tracking libs)
- **Non-goals** — infer from what the README explicitly doesn't mention

#### `docs/agent/architecture-primer.md`
`setup` already filled the auto-detected section. Enrich with:
- Layer/module boundaries inferred from directory structure (e.g. `services/` vs `handlers/` vs `repositories/`)
- State management pattern from deps (Redux, Zustand, Jotai, Context)
- Key entities from schema or model files
- Routing pattern from framework

#### `docs/agent/glossary.md`
From README headings, schema model names, and route paths, extract:
- Domain nouns that appear in code but aren't standard programming terms
- Any abbreviations used in variable/function names that need explanation

#### `docs/agent/key-learnings.md`
From code scan, identify:
- Patterns that deviate from framework defaults (write why they might exist)
- Any `// TODO`, `// FIXME`, `// HACK` comments — summarize as potential gotchas
- Non-obvious dependency choices (why this ORM, why this state manager)
Add rows to the routing index for any area with identified gotchas.

#### `docs/agent/values.md` — project rules section
Review the auto-generated rules from `setup`. Remove any that don't apply. Add:
- Naming conventions inferred from existing code (file naming, function naming)
- Import/export patterns (barrel files, named vs default exports)
- Any security constraints visible from deps or config (auth libs, CORS, helmet)

#### `manifest.yaml` — guardrails
From the stack and any CI/deploy config found, propose:
- `blocked_actions` based on what would be destructive for this stack
- `require_approval` for any deploy/publish scripts detected

#### `docs/README.md` — feature register
From README features list, route definitions, and `src/pages/` or `src/routes/`:
- List each distinct feature area with inferred status
- Mark as `implemented` if code exists, `planned` if only in README/docs

#### `docs/agent/app-config.md` — commands
Verify the auto-generated commands against actual `package.json` scripts. Replace with the real script names found.

---

### Phase 3 — Ask only what code cannot tell you

After writing all drafts, display a summary of what was written, then ask **exactly these questions** — nothing more:

> I've analyzed the codebase and drafted all docs. I need your input on 4 things code can't answer:
>
> 1. **Who is the target user?** (role, technical level, context — e.g. "field engineers on tablets" or "internal devs")
> 2. **Any hard guardrails I should add?** Things agents must never do in this codebase (e.g. "never log user PII", "never delete without soft-delete flag")
> 3. **Any past bugs or gotchas** the team knows that aren't visible in the code? (even 1–2 bullets)
> 4. **Anything I inferred wrong?** (Check the `<!-- TODO -->` markers I left)

Incorporate the answers into the files immediately.

---

### Phase 4 — Finalize

Run:

```bash
context-kit check
```

Report the result. If check passes with no errors:

```
✓ docs/agent/product-context.md
✓ docs/agent/architecture-primer.md
✓ docs/agent/glossary.md
✓ docs/agent/key-learnings.md
✓ docs/agent/values.md
✓ manifest.yaml
✓ docs/README.md
✓ docs/agent/app-config.md

Project is ready for agentic development.
Pick a task from docs/README.md and use the matching prompt.
```

