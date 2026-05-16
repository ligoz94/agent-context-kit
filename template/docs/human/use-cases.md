# agent-context-kit Use Cases

This guide explains the main ways a team can use `agent-context-kit` in practice.

It is written for humans, not for the runtime.

The goal is simple:

> help a user understand what this library is good for, what workflows it supports, and what a concrete day-to-day flow looks like

---

## The Short Version

You can use `agent-context-kit` in two broad modes.

### 1. Classic workflow

Use the kit as a structured context layer for coding agents.

This means:

- project identity is written down,
- rules and standards are explicit,
- feature specs are discoverable,
- prompts are reusable,
- MCP tools expose the right context on demand.

Typical outcome:

> the agent reads the correct docs, uses the correct prompt, and works with much less ambiguity

### 2. Mission workflow

Use the optional mission runtime when the task is iterative, long-running, or likely to require repair loops.

This means:

- a task becomes a mission,
- the mission has state,
- slices are tracked,
- validator findings become repair work,
- the system can re-validate until the task is complete.

Typical outcome:

> the agent does not just "try once"; it works through a tracked execution loop

---

## Tool Reference

agent-context-kit provides MCP tools in three categories. All tools use trigger-only descriptions (start with "Use when/Use after/Use before").

### Context & Identity

| Tool | What it does |
|---|---|
| `get_project_identity` | Loads L0 identity (values, architecture, glossary) |
| `get_guardrails` | Shows blocked actions, required approvals, and active gates |
| `get_session_bootstrap` | One-shot session start: loads identity + context policy + gate list |
| `get_rules` | Loads coding standards and policies |
| `list_registry` / `get_spec` | Browse and fetch feature specs |
| `lookup_glossary` | Look up project-specific terms |
| `get_learnings` | Past mistakes and lessons |
| `search_context` | Full-text search across docs |
| `validate_context` | Sanity-check doc paths |

### Gate & Quality

| Tool | What it does |
|---|---|
| `check_gate("gate_name")` | Verify a process gate has been passed. Halts if not. |
| `advance_gate("gate_name", "evidence")` | Mark a gate as passed with supporting evidence |
| `review_spec("path/to/spec.md")` | Check spec for completeness (TBDs, missing sections, scope creep) |
| `review_plan("plan.md", "spec.md")` | Validate implementation plan against spec for coverage |
| `verify_action(check_type)` | Run compliance checks (e.g. `tdd_compliance` for test-first ordering) |
| `request_human_approval(action)` | Request human sign-off before risky operations |

### Development Workflow

| Tool | What it does |
|---|---|
| `dispatch_subagent(task, files, model)` | Produces a structured dispatch prompt for a sub-agent |
| `finish_work(branch, base, test_cmd)` | Run tests, present structured release options |
| `start_debugging(description)` | Initiates 4-phase forensic debugging process |
| `test_rule(rule_path, scenario)` | RED/GREEN test a custom rule against a sub-agent |

---

## How To Trigger These Flows In Chat

There are two practical ways users normally invoke these workflows.

### Option A: natural language

This always works and is the safest default.

Examples:

```text
Read docs/README.md. Triage issue #1234 and tell me whether it needs a spec update.

Read docs/README.md. Implement the approved spec for shopping-cart coupons.

Read docs/README.md. Review PR #5678.

Read docs/README.md. Fix all open review comments on PR #5678.
```

### Option B: slash-style shortcuts

Some teams prefer chat shortcuts such as:

```text
/triage-issue 1234
/update-docs 1234
/implement-feature shopping-cart-coupons
/review-pr 5678
/fix-pr 5678
/fix-bug 1234
```

Important note:

These slash-style examples are **workflow shortcuts**, not a built-in CLI surface from this library.
They make sense only if your editor, prompt router, or custom rules map them to the corresponding prompt files.

The canonical prompt files still live under `docs/agent/prompts/`.

So, in practical terms:

- natural language is always valid,
- slash-style commands are optional conventions your team can adopt.

---

## What A User Can Actually Do With This Library

Today, a user can use the library for the following practical scenarios.

### Scenario 1: Turn a vague repository into an agent-readable project

Problem:

The codebase exists, but every new agent session starts cold.

Flow:

1. Run `context-kit init`
2. Run `context-kit setup`
3. Fill the generated docs
4. Connect the Toolshed MCP server in Cursor, Claude, or another client

Result:

- the project gets a manifest,
- the docs are structured,
- agents can query the right context instead of guessing.

Use this when:

- you want better agent answers immediately,
- you want fewer repeated explanations in chat,
- you want one shared project context for the whole team.

---

### Scenario 2: Start from an issue and move into spec-driven delivery

Problem:

You have a GitHub issue, but you do not want the agent to jump directly into code without a clear intent path.

Flow:

1. Open the issue
2. Ask the agent to triage it
3. Update or create the feature/spec docs
4. Approve the spec
5. Ask the agent to implement against that spec
6. Run finish/review workflow

Concrete example:

```text
Issue: Add coupon support to checkout

Agent flow:
- triage issue
- identify affected feature: shopping-cart
- update spec for coupon handling
- wait for human approval
- implement feature
- run tests and review checks
```

Chat messages a user can send:

```text
Read docs/README.md. Triage issue #1234 and tell me which feature/spec it belongs to.

Read docs/README.md. Update the spec for issue #1234, then stop for approval.

Read docs/README.md. Implement the approved shopping-cart coupon spec.
```

Optional shortcut-style form:

```text
/triage-issue 1234
/update-docs 1234
/implement-feature shopping-cart-coupons
```

Result:

- the issue becomes explicit project intent,
- the agent codes against approved docs,
- the work is easier to review.

Use this when:

- you want the classic spec-first workflow,
- you want less ambiguity between issue and implementation.

---

### Scenario 3: Fix a bug without losing the original requirement

Problem:

Agents often patch symptoms instead of tracing the bug back to the right feature/spec.

Flow:

1. Start with the issue or bug report
2. Load the affected feature doc and spec
3. Load `key-learnings.md`
4. Fix the bug
5. Add a regression test
6. Record a learning if the failure mode was non-obvious

Concrete example:

```text
Bug: verify_action passes even when the JSON path is missing

Agent flow:
- read docs/README.md
- use the fix-bug prompt
- inspect key-learnings.md
- trace the intended behavior in the relevant spec
- add a regression test
- implement the root-cause fix
```

Chat messages a user can send:

```text
Read docs/README.md. Fix bug #1234 and trace it back to the correct spec before coding.

Read docs/README.md. Fix the regression where verify_action passes when the JSON path is missing.
```

Optional shortcut-style form:

```text
/fix-bug 1234
```

Result:

- the bug fix is tied back to the intended behavior,
- future agents can rediscover the lesson faster.

Use this when:

- the problem is a regression,
- the codebase already has specs or learnings you want to preserve.

---

### Scenario 4: Review a PR with better context and less bias

Problem:

PR review is weak if the agent only sees the diff but not the intent.

Flow:

1. Start a fresh session for review
2. Load values, rules, and the relevant spec
3. Review the PR against intent, not just syntax
4. Run a fix-PR loop if findings exist

Concrete example:

```text
PR review flow:
- read docs/README.md
- load review-pr prompt
- open feature spec
- inspect changed files
- report bugs, risks, regressions, and missing tests
```

Chat messages a user can send:

```text
Read docs/README.md. Review PR #5678 against the relevant spec.

Read docs/README.md. Do a full review of PR #5678 with bugs, regressions, and missing tests first.
```

Optional shortcut-style form:

```text
/review-pr 5678
```

Result:

- review is more consistent,
- the agent checks behavior against the spec,
- review comments are easier to trust.

Use this when:

- you want PR review to be more than style or lint feedback,
- you want a repeatable review workflow.

---

### Scenario 5: Use MCP Toolshed as a context API for agents

Problem:

You do not want the agent to preload the whole docs tree every time.

Flow:

1. Register the Toolshed MCP server
2. Let the agent call tools such as:
   - `get_project_identity`
   - `get_guardrails`
   - `get_session_bootstrap`
   - `get_rules`
   - `list_registry`
   - `get_spec`
   - `get_learnings`
   - `check_gate` / `advance_gate`
   - `review_spec` / `review_plan`
   - `finish_work`
   - `start_debugging`
3. Let the agent fetch context only when needed

Concrete example:

```text
Task: implement dark mode toggle

Agent tool flow:
- get_project_identity
- get_guardrails
- get_session_bootstrap
- get_rules
- list_registry
- get_spec(dark-mode)
- review_spec(specs/001-dark-mode.md)
- advance_gate("design_approved", "Spec OK'd in sync")
- finish_work("feat/dark-mode", "main", "npm test")
```

Chat message a user can send:

```text
Use the Toolshed MCP tools. Implement dark mode by loading only the relevant context.
```

Result:

- lower token usage,
- less noisy context,
- more predictable agent behavior.

Use this when:

- you are using Cursor, Claude Desktop, or any MCP-capable client,
- you want context retrieval to be query-driven.

---

### Scenario 6: Use it inside LangChain instead of only in an IDE

Problem:

You want the same project context model inside a custom Node-based agent.

Flow:

1. Install `@agent-context-kit/langchain`
2. Create tools from `manifest.yaml`
3. Bind them to your agent

Concrete example:

```ts
import { createContextKitTools } from "@agent-context-kit/langchain";

const tools = createContextKitTools("./manifest.yaml");
```

Result:

- the same registry, glossary, learnings, rules, and prompts become tool-accessible in code,
- the project context model is shared between IDE and application agent.

Use this when:

- you are building custom automation around LangChain,
- you want one source of truth for project context.

---

### Scenario 7: Run a multi-step task through the mission workflow

Problem:

A task is too large for a single linear chat, or may require validation failures and repairs.

Flow:

1. Enable mission workflow
2. Start a mission from a goal or issue
3. Run the mission loop
4. Check mission status
5. Re-run after findings if needed

Concrete example:

```bash
context-kit mission start "Ship mission runtime MVP"
context-kit mission run
context-kit mission status
```

Chat messages a user can send:

```text
Help me run this task as a mission instead of a normal implementation flow.

Explain whether this task should use classic workflow or mission workflow.
```

Result:

- the task is tracked in state,
- slices are persisted,
- findings become repair work,
- the mission can continue until it completes.

Use this when:

- the task is iterative,
- you want repair/revalidate loops,
- you want a mission timeline instead of only chat history.

---

### Scenario 8: Start from a GitHub issue and turn it into mission work

Problem:

You want to begin from an issue, but you also want structured execution instead of a one-shot implementation.

Flow:

1. Enable mission workflow
2. Start the mission from a GitHub issue
3. Let the runtime derive a first plan from the issue title/body
4. Run the mission loop

Concrete example:

```bash
context-kit mission start --issue 42 --repo owner/repo
context-kit mission run
```

Chat messages a user can send:

```text
Create a mission from issue #42 and show me the first execution plan.

Should issue #42 stay in classic workflow, or should I run it as a mission?
```

Result:

- the issue becomes mission input,
- the mission goal and slices are initialized from the issue,
- validation and repair work are tracked.

Important note:

Today the shipped runtime can create a mission from an issue, but it does **not** yet automatically create GitHub sub-issues for every slice. That is still a possible future extension, not a shipped feature.

Use this when:

- your backlog already lives in GitHub,
- you want issue-driven mission execution.

---

### Scenario 9: Create repair loops after validation failure

Problem:

In a normal chat workflow, a failed check often becomes a loose comment instead of a tracked work item.

Flow:

1. Run mission loop
2. Validator finds a failure
3. The runtime creates a repair slice
4. The runtime creates a revalidate slice
5. The mission continues until findings are resolved

Concrete example:

```bash
context-kit mission run --simulate-finding "Fix flaky validator"
```

Observed result:

- validate slice runs,
- repair slice is created,
- revalidate slice is created,
- final finding can become `resolved`,
- mission ends as `completed` when all slices are done.

Use this when:

- you want the system to model failure as work, not just as output.

---

### Scenario 10: Keep classic workflow and mission workflow separate

Problem:

Not every team wants persistent mission execution for every task.

Flow:

1. Run `context-kit init`
2. Keep the classic workflow if that is enough
3. Enable mission later only if needed

Concrete example:

```bash
context-kit init
context-kit enable-mission
```

Result:

- the user decides which methodology to use,
- mission runtime stays optional,
- the library still works as a classic context kit even without mission mode.

Use this when:

- you want gradual adoption,
- you do not want the mission runtime forced into every project.

---

### Scenario 11: Turn a weak request into the right prompt and workflow

Problem:

Users often know the goal, but not:

- which prompt should be used,
- which docs should be loaded,
- which tools should be called,
- or whether the task belongs in classic workflow or mission workflow.

This is where prompt generation and routing help.

There are two distinct needs:

1. **Prompt generation** — turn a vague request into a strong prompt.
2. **Task routing** — decide which workflow, docs, tools, and prompt template are appropriate.

Concrete chat examples:

```text
prompt: create a strong prompt to implement shopping-cart coupons

route: issue #1234 is about checkout coupons. Which workflow, docs, and tools should I use?
```

What happens conceptually:

- the prompt generator produces a structured prompt,
- the router selects the most relevant docs, tools, and workflow,
- the user can then run the task with much less ambiguity.

Example result for prompt generation:

```text
prompt: fix a regression in verify_action
```

Expected output:

- a stronger execution prompt,
- explicit constraints,
- recommended reading,
- recommended MCP tools,
- acceptance criteria.

Example result for task routing:

```text
route: review PR #5678 and tell me how to approach it
```

Expected output:

- recommended workflow: classic review flow,
- recommended prompt: `review-pr.md`,
- recommended docs: `docs/README.md`, values, relevant spec,
- recommended tools: `get_project_identity`, `get_rules`, `get_spec`.

Optional shortcut-style forms:

```text
prompt: implement feature X
@prompt fix bug in checkout totals

route: issue #1234
@route review PR #5678
```

Important note:

The exact shortcut syntax depends on the editor rules your team adopts.
The important concept is that this library supports:

- structured prompt generation,
- and structured task routing,

instead of relying on ad hoc chat wording every time.

Use this when:

- the request is vague,
- the user is not sure which workflow to use,
- you want repeatable prompt quality.

---

### Scenario 12: Generate the same PR description every time

Problem:

PR descriptions are often inconsistent.

Some are too short, some omit risk, some do not link the issue, and some do not explain intent or validation clearly.

`agent-context-kit` solves this by giving the project a canonical PR body template.

The source of truth is:

- `docs/agent/templates/pr-body.md`

That means the team can standardize on one PR structure across agent sessions.

Concrete chat examples:

```text
Read docs/agent/templates/pr-body.md and write the PR body for this branch.

Generate a PR description using the canonical PR body template.

Fill the PR body template for issue #1234 and this implementation.
```

Optional shortcut-style form:

```text
/body-pr
/body-pr 1234
```

Important note:

`/body-pr` is a useful workflow convention, but it is not a built-in CLI command from this library.
The real source of truth is still the template file under `docs/agent/templates/pr-body.md`.

What the user gets from this flow:

- the same PR structure every time,
- issue linkage,
- intent summary,
- spec traceability,
- risk section,
- assumptions section,
- test plan,
- agent report section.

This is especially useful when:

- multiple agents or contributors open PRs,
- the team wants a consistent review surface,
- you want reviewers to see intent and validation quickly.

Use this when:

- opening a PR after implementation,
- rewriting a weak PR body,
- standardizing team review quality.

---

## Example End-to-End Flows

## Flow A: Issue -> Spec -> Implement -> Review -> Merge

Best for:

- normal feature delivery
- teams that want strong specs but not mission state

Flow:

1. Start from a GitHub issue
2. Triage the issue
3. Update the feature doc/spec
4. Human approves the spec
5. Implement with the agent
6. Run finish checks
7. Review PR in a fresh session
8. Fix review comments
9. Merge

This is the best "default" flow for many teams.

Chat-ready version:

```text
1. /triage-issue 1234
2. /update-docs 1234
3. Human approves spec
4. /implement-feature shopping-cart-coupons
5. /finish
6. /review-pr 5678
7. /fix-pr 5678
```

Natural-language equivalent:

```text
Read docs/README.md. Triage issue #1234.
Read docs/README.md. Update docs/specs for issue #1234 and stop for approval.
Read docs/README.md. Implement the approved feature.
Read docs/README.md. Run the finish workflow.
Read docs/README.md. Review PR #5678.
Read docs/README.md. Fix all open findings on PR #5678.
```

---

## Flow B: Issue -> Mission -> Repair Loop -> Complete

Best for:

- medium or large tasks
- tasks that may fail validation once or more

Flow:

1. Start from a GitHub issue
2. Create a mission from that issue
3. Run mission loop
4. Validator creates findings
5. Repair slices are added
6. Revalidate
7. Complete mission

This is the best flow when you want a tracked execution loop.

Chat-ready version:

```text
Create a mission from issue #42.
Run the mission loop.
Show me mission status.
```

---

## Flow C: Existing Project -> Better Agent Sessions

Best for:

- teams that are not ready for mission runtime
- teams that just want much better context loading

Flow:

1. Run `init`
2. Run `setup`
3. Connect Toolshed MCP
4. Use the classic prompts and docs system

This is the smallest, lowest-risk adoption path.

Chat-ready version:

```text
Read docs/README.md. My task is: implement product catalog filters.
```

---

## Flow D: Weak Request -> Routed Task -> Canonical PR Body

Best for:

- teams that want a repeatable front door and back door for agent work
- users who want the agent to help both before coding and before opening the PR

Flow:

1. Start with a weak user request
2. Use prompt generation or routing to structure the task
3. Execute the correct workflow
4. Use the canonical PR body template when opening the PR

Chat-ready version:

```text
prompt: implement coupon support in checkout
route: issue #1234
Read docs/README.md. Implement the approved coupon spec.
Read docs/agent/templates/pr-body.md and generate the PR body.
```

This is the best flow when you want consistency both:

- at task start,
- and at PR handoff.

---

### Scenario 13: Run a structured gate-driven development workflow

Problem:

A development session drifts without clear stage gates, and the agent may skip testing or spec review.

The tools work together as a pipeline. Below is every tool with its input/output shape and the role it plays in the flow.

| Tool | Input | Output | Role |
|---|---|---|---|
| `get_session_bootstrap` | (none) | Markdown: identity + policy + gates | Session start |
| `check_gate` | `gate_name` | Pass/fail with evidence or "not configured" | Guard before each stage |
| `advance_gate` | `gate_name`, `evidence` | Confirmation | Mark stage complete |
| `review_spec` | `spec_path` | Approved (no issues) or BLOCKING/ADVISORY with checklist | Before implementation |
| `review_plan` | `plan_path`, `spec_path` | Approved or issues (placeholders, granularity, coverage) | Before coding |
| `dispatch_subagent` | `task_description`, `context_files`, `model` | Dispatch contract + suggested prompt for sub-agent | Handoff |
| `start_debugging` | `description` | 4-phase forensic guide | When tests fail |
| `finish_work` | `branch`, `base_branch`, `test_command` | Release options (merge/PR/keep/discard) | Pre-push gate |
| `verify_action` | `checks: [{type: "tdd_compliance"}]` | Pass/fail on test-first ordering | Quality check |
| `test_rule` | `rule_path`, `test_scenario` | RED/GREEN test protocol for rules | When authoring rules |

Concrete session — implementare coupon carrello:

```text
Utente: Implementa i coupon per il carrello. La spec è stata approvata in PR #42.

─── STEP 1: Avvio sessione ────────────────────────────────────

Agent chiama: get_session_bootstrap()
Risposta:
  ## Session Bootstrap — Start Here
  ## Values
  [valori del progetto...]
  ## Architecture primer
  [architettura...]
  ## Context policy
  [policy...]
  ## Active Gates
  - design_approved
  - tests_before_code
  Usa check_gate prima di procedere. Usa advance_gate con evidenza.

─── STEP 2: Verifica gate design ──────────────────────────────

Agent chiama: check_gate(gate_name="design_approved")
Risposta:
  Gate "design_approved": NOT PASSED. Evidence: none

Agent: "Il gate design_approved non è stato superato.
        Puoi fornire l'evidenza di approvazione della spec?
        (es. link alla PR di review, messaggio di approvazione)"

Utente: "Ecco la PR: https://github.com/mio/progetto/pull/42"

Agent chiama: advance_gate(
  gate_name="design_approved",
  evidence="PR #42 approvata da @mirko il 15/05/2026"
)
Risposta:
  Gate "design_approved" advanced. Evidence: PR #42 approvata da @mirko

─── STEP 3: Review specifica ──────────────────────────────────

Agent chiama: review_spec(
  spec_path="docs/features/shopping-cart/specs/001-coupons.md"
)
Risposta:
  ## Spec Review: ADVISORY
  Spec: docs/features/shopping-cart/specs/001-coupons.md
  - [completeness] Missing section: Security boundaries
  - [completeness] Missing section: Failure states

Agent: "La spec è completa all'80%. Manca la sezione 'Security boundaries'
        (es. coupling coupon a utente, rate limiting) e 'Failure states'
        (es. coupon scaduto mostra errore 400?).
        Procedo con le sezioni mancanti documentate come rischio? [s/N]"

Utente: "s"

─── STEP 4: Dispatch sub-agente ──────────────────────────────

Agent chiama: dispatch_subagent(
  task_description="Implementare logica coupon carrello:
                    1. Modello Coupon (codice, sconto, scadenza)
                    2. Validazione coupon in checkout
                    3. Test: coupon valido → sconto applicato
                    4. Test: coupon scaduto → errore gentile",
  context_files=[
    "docs/features/shopping-cart/specs/001-coupons.md",
    "docs/agent/standard-tdd.md"
  ],
  model="standard"
)
Risposta:
  ## Dispatch Sub-agent
  - Task: Implementare logica coupon carrello...
  - Model hint: standard
  - Context files: [spec, tdd doc]
  - Status: DONE

  Suggested dispatch prompt:
  ```
  You are a focused implementer.
  Complete the task precisely. No scope creep.
  Task: Implementare logica coupon carrello...
  Return structured results:
  - DONE: task completed
  - DONE_WITH_CONCERNS: completed but flag doubts
  - BLOCKED: cannot complete
  ```

(Agent usa Task tool per spawnare sub-agente con la dispatch prompt)

─── STEP 5: Finish work ─────────────────────────────────────

Sub-agente completato. Agent chiama:
finish_work(
  branch="feat/shopping-cart-coupons",
  base_branch="main",
  test_command="npm test"
)

Risposta (test passano):
  ## Release: Ready
  Branch: feat/shopping-cart-coupons → main
  Tests: Tests passed: `npm test`

  Options (choose one):
  1. Merge locally — Merge feat/... into main, verify tests post-merge, delete branch.
  2. Create PR — Push and create a pull request.
  3. Keep branch — Keep branch and worktree as-is.
  4. Discard — Permanently delete branch. Requires typed confirmation "discard".

─── STEP 6: Verifica TDD compliance ─────────────────────────

Agent chiama: check_gate(gate_name="tests_before_code")
Risposta:
  Gate "tests_before_code": NOT PASSED. Evidence: none

Agent chiama: verify_action(
  description="Verify TDD compliance for recent commits",
  checks=[{type: "tdd_compliance"}]
)
Risposta (esempio):
  ## Verify Action
  Check "tdd_compliance":
  - Git log: 5 commits analizzati
  - Commit 1: "test: add coupon validation" (test)
  - Commit 2: "feat: implement coupon validation" (code)
  - Commit 3: "test: add coupon model" (test)
  - Commit 4: "feat: add coupon model" (code)
  - Risultato: PASSED — test commits precedono code commits

Agent chiama: advance_gate(
  gate_name="tests_before_code",
  evidence="TDD compliance verificata via verify_action — test commits precedono code"
)
Risposta:
  Gate "tests_before_code" advanced. Evidence: TDD compliance verificata...

Agent: "Tutti i gate superati. Test passano. Cosa vuoi fare?
        1. Merge locale  2. Creare PR  3. Tenere branch  4. Scartare"
```

Risultato:

- ogni fase ha un pass/fail esplicito,
- l'agente non salta mai testing o review,
- l'umano interviene solo ai punti di decisione (approvazione, merge).

Usa quando:

- vuoi una pipeline di sviluppo ripetibile,
- il tuo team vuole stage gates espliciti,
- vuoi che gli agenti si fermino ai confini giusti e chiedano permesso.

---

## What Is Not Fully Shipped Yet

To avoid confusion, these are **not** fully shipped today:

- automatic creation of GitHub sub-issues from mission slices,
- a full multi-agent orchestrator service,
- a true behavioral validator runtime with browser evidence,
- fully isolated role execution by provider/model,
- milestone-level mission control with pause/resume and budgets.

Those are still part of the broader mission-runtime direction, not the current minimum shipped runtime.

---

## How To Decide Which Path To Use

Use the classic workflow if:

- you want a better context system,
- your tasks are relatively linear,
- you already work well with issue -> spec -> implement -> review.

Use mission workflow if:

- the task is multi-step,
- validation failures should become tracked repair work,
- you want persistent state instead of relying only on chat history.

If you are unsure, start with the classic workflow.

You can always enable mission mode later.