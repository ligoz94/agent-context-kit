# Agentic Development Guide

How to work with AI agents on this project, day to day.

---

## The mental model

This project uses **spec-driven agentic development**:

> No code without a spec. No spec without a feature doc. No agent without context.

The agent never invents requirements. It reads, extracts explicit intent, asks if unclear, then implements. You control quality by controlling the docs.

---

## Setup (once per project)

```bash
npx @agent-context-kit/cli init     # scaffold docs/ structure
npx @agent-context-kit/cli setup    # auto-fill from your codebase
```

Then use the `populate-project` prompt to fill the rest in one session:

> Read `docs/agent/prompts/populate-project.md` and populate all project docs.

---

## How to start every session

**With MCP Toolshed** (recommended — see `toolshed-mcp-setup.md`):

> Run `get_project_identity` and `get_guardrails`, then tell me your task.

`get_project_identity` only covers the manifest identity bundle (`values.md`, `architecture-primer.md`, `glossary.md`). After that first pass, explicitly open `docs/agent/app-config.md`, `docs/agent/product-context.md`, and `docs/README.md` to complete L0 context.

**Without MCP:**

> Read `docs/README.md`. My task is: [describe task].

The agent will check the reading order, pick the right prompt, and tell you what it will open next.

The user does not need to type the prompt name exactly. A good agent should infer the workflow from the task wording, for example "fix this regression" → `fix-bug`, "implement this approved spec" → `implement-feature`, "align docs for this issue" → `update-docs`.

---

## The development pipeline

```
Issue / request
      │
      ▼
[triage-issue]──────── Q&A gate ──────── agent halts if intent unclear
      │
      ▼
[update-docs] ──── creates/updates spec ──── Human gate: approve before coding
      │
      ▼
[implement-feature] ── code against spec ── if spec gap found → back to update-docs
      │
      ▼
[finish] ─── types + lint + tests + snapshot verify + self-review
      │
      ▼
    Push PR
      │
      ▼
[review-pr] ─── NEW conversation (fresh context, no confirmation bias)
      │
      ▼
[fix-pr] ─── fix findings + CI green ─── iterate until clean
      │
      ▼
Human approves + merges
```

### Gates

| Gate | What it means |
|------|--------------|
| **Q&A gate** | Agent halts and asks questions until intent is unambiguous. Never skipped. |
| **Human gate** | You review and approve the spec before any code is written. |
| **fresh context** | `review-pr` always runs in a new chat. Prevents the agent from rationalizing its own work. |

---

## Prompt reference — which to use when

| Your situation | Use |
|----------------|-----|
| New issue arrived | `triage-issue` |
| Batch-triage backlog | `triage-all-issues` |
| Need to write or update a spec | `update-docs` |
| Spec approved, ready to code | `implement-feature` |
| Done coding, pre-push | `finish` |
| Bug to fix | `fix-bug` |
| PR open, review comments to address | `fix-pr` |
| Review someone's PR | `review-pr` (new chat) |
| Deep review of complex change | `full-review` (new chat) |
| Reviewing a new spec PR | `review-spec` |
| UI change to verify in browser | `ui-test` |
| Check out PR safely | `checkout-pr` |
| Populate docs for a new project | `populate-project` |

---

## Priming examples

Copy-paste these to start an agent session:

**Implement a feature:**
```
Read docs/README.md. Then implement this spec: docs/features/<name>.md
Use: docs/agent/prompts/implement-feature.md
```

**Fix a bug:**
```
Read docs/README.md. Fix this bug: <description or issue URL>
Use: docs/agent/prompts/fix-bug.md
```

**Update docs for an issue:**
```
Read docs/README.md. Align docs with this issue: <URL or #number>
Use: docs/agent/prompts/update-docs.md
```

**Fix PR findings:**
```
Read docs/README.md. Fix all open review comments and CI failures on PR #<N>
Use: docs/agent/prompts/fix-pr.md
```

**Review a PR (start a new chat for this):**
```
Read docs/README.md. Review PR #<N>
Use: docs/agent/prompts/review-pr.md
```

---

## Doc structure — what lives where

```
docs/
├── README.md                    ← START HERE — reading order + task table + feature register
├── agent/
│   ├── app-config.md            ← paths, commands, MCP config (L0)
│   ├── product-context.md       ← who uses this, on what device (L0)
│   ├── values.md                ← non-negotiable principles (L0, always loaded)
│   ├── architecture-primer.md   ← stack, layers, data flow (L2 — load when unfamiliar)
│   ├── glossary.md              ← domain terms (L0)
│   ├── context-policy.md        ← L0/L1/L2 loading contract (L1)
│   ├── key-learnings.md         ← past bugs, gotchas, routing index (L2 — load when fixing bugs)
│   ├── prompts/                 ← workflow prompts — one per task type
│   ├── templates/               ← PR body, commit message, spec-update PR
│   └── evals/                   ← agent metrics, PR quality tracking
├── features/
│   ├── _template.md             ← copy this for every new feature
│   ├── specs/_template.md       ← copy this for decision records within a feature
│   └── <name>.md                ← one file per feature, registered in manifest.yaml
├── decisions/                   ← architecture decision records (ADRs)
└── human/
    ├── agentic-development.md   ← this file
    ├── way-of-working.md        ← team process, PR conventions
    ├── testing.md               ← test conventions
    ├── toolshed-mcp-setup.md    ← MCP server configuration guide
    └── agent-context-power-user-stack.md  ← advanced editor + MCP setup
```

### Layer meaning

| Layer | When agent loads it |
|-------|---------------------|
| **L0** | Every session — values, glossary, app-config, product-context |
| **L1** | Per task — context-policy, the right prompt |
| **L2** | On demand — architecture-primer (unfamiliar stack), key-learnings (fixing bugs), feature spec (working on that feature) |

---

## Adding a new feature

```bash
context-kit new-spec <feature-name>
```

This creates `docs/features/<feature-name>.md` from the template and adds it to `manifest.yaml`. Then:

1. Fill the spec using `update-docs` prompt
2. Get human approval
3. Implement using `implement-feature` prompt
4. Add a row to the feature register in `docs/README.md`

---

## Capturing learnings

When the agent discovers something non-obvious (a bug root cause, a surprising API behavior, a constraint not in any doc), it should add an entry to `docs/agent/key-learnings.md`:

- Add a bullet under the relevant section heading
- Add a row to the routing index at the top so future agents find it

If using MCP Toolshed: `add_learning` tool writes directly to the file.

---

## Validation

```bash
context-kit check    # validates required files, L0 token budgets, CLAUDE.md size
context-kit list     # shows available prompts and registered features
context-kit sync     # updates engine regions if you upgrade the kit version
```

---

## Token-saving tools (optional)

Two tools that meaningfully cut token usage with no accuracy loss. `context-kit init` will ask if you want them; choose **y** and they get wired in automatically.

### caveman — fewer output tokens (~65% average)

[github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)

Makes the agent respond in compressed, fragment-style prose. Full technical accuracy kept; only articles, filler, and hedging are dropped. Activates with `/caveman`, deactivates with "normal mode".

| Level | Command | Effect |
|-------|---------|--------|
| Lite | `/caveman lite` | Drop filler, keep grammar |
| Full | `/caveman full` | Default — fragments, short synonyms |
| Ultra | `/caveman ultra` | Maximum compression, telegraphic |

**Cursor** → auto-activated via `.cursor/rules/caveman.mdc` (written by `init`).

**Claude Code** → install once:
```bash
claude plugin marketplace add JuliusBrussee/caveman
claude plugin install caveman@caveman
```

**Other agents (Codex, Copilot, …)**:
```bash
npx skills add JuliusBrussee/caveman
```

### RTK — compressed terminal output

[github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)

Wraps common CLI tools (`git`, `npm`, `grep`, `find`, …) to emit only the signal, not the noise. Less terminal output = fewer tokens injected back into context.

**Cursor** → auto-activated via `.cursor/rules/rtk-bash.mdc` (written by `init`). Agent will prefix commands with `rtk` automatically.

**All editors** → install the binary:
```bash
# see https://github.com/rtk-ai/rtk for install instructions
rtk --help    # list of routed commands
```

Usage pattern: `git status` → `rtk git status`. If no RTK wrapper exists, fall back to the raw command.
