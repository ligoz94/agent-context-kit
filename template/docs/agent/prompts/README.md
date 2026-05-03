# Agent prompts

Reusable workflow templates under `docs/agent/prompts/`. Load them with your IDE slash commands, or via Toolshed MCP: **`list_prompts`** and **`get_prompt`** (use the filename without `.md`, e.g. `get_prompt` with name `implement-feature`).

Files whose names start with **`_`** are **fragments** (included by other prompts). They do not appear in `list_prompts`; open them by path or call `get_prompt` with name `_review-dimensions`.

### Prompts vs “skills”

**Cursor skills** and **Claude Code skills** are often packaged as named workflows with metadata, sometimes loaded only when invoked.

**Repo prompts** here serve a similar role for **this project**: a named markdown workflow (steps, inputs, explicit “do not” lines) that agents load via `get_prompt` / your slash commands. Use **repo prompts** for behavior you want **versioned** with the codebase and listed in Toolshed. Use **global skills** for personal or cross-repo shortcuts. See `docs/human/agent-context-power-user-stack.md` for a fuller mapping.

---

## When to use which prompt

| Prompt | Use it when… |
|--------|----------------|
| **[development-workflow.md](development-workflow.md)** | You want the **end-to-end picture**: triage → doc → implement → verify → PR → review → merge, human gates, and failure handling. Good for onboarding or "what do I run next?". |
| **[triage-issue.md](triage-issue.md)** | A **new GitHub issue** arrived and you need to understand it, extract intent, and break it into `[DEV]`/`[SPEC]`/`[TEST]` sub-issues before any coding. |
| **[triage-all-issues.md](triage-all-issues.md)** | **Sprint planning / backlog grooming**: run triage-issue on all untriaged issues in one session. |
| **[update-docs.md](update-docs.md)** | An **issue, ticket, or verbal ask** must become **explicit docs + spec** before coding. Spec missing, vague, or out of date. **Always before** large `implement-feature` work. |
| **[implement-feature.md](implement-feature.md)** | A **spec (or equivalent) is clear and approved** per team rules; you are **writing code** to match it. If you discover spec gaps, stop and return to **update-docs**. |
| **[finish.md](finish.md)** | Implementation or **fix-bug** is done, **tests pass**, and you want a **pre-push gate**: self-review, local CI-style commands, doc touch-ups, optional learnings. **Skip** if you just finished **fix-pr** (that flow already drives CI/push). |
| **[fix-bug.md](fix-bug.md)** | Fixing **incorrect behavior** in existing functionality. Use to **classify** code vs spec vs product bug, add **regression tests**, then chain to **finish**. |
| **[fix-pr.md](fix-pr.md)** | A **PR is open** and you need to **triage review comments + failing checks**, fix, commit, push, and **wait for green CI**. |
| **[review-pr.md](review-pr.md)** | **Reviewing a pull request** (prefer a **fresh chat**). Full **100-point scoring rubric** (12 dimensions), AI review lock, label management, PR comment with score table. |
| **[full-review.md](full-review.md)** | **Deep / adversarial review** of a feature or module (non-trivial or high-risk). Walks **12 dimensions**; use after big changes or before sensitive release. |
| **[review-spec.md](review-spec.md)** | A PR **adds or heavily changes a spec**. Validates template, intent completeness, security, implementability, and tests **before** implementation proceeds. |
| **[ui-test.md](ui-test.md)** | You changed **UI** and need **browser-level verification** via Playwright MCP or structured manual steps. Not for API-only changes. |
| **[checkout-pr.md](checkout-pr.md)** | Check out a PR into an **isolated git worktree** for safe review without disturbing the main worktree. |
| **[_review-dimensions.md](_review-dimensions.md)** | **Do not run standalone.** Shared checklist used by **review-pr** and **full-review**; edit here to avoid duplicating review criteria. |

---

## Typical sequences

1. **New feature**
   `triage-issue` → `update-docs` → (human approves spec) → `implement-feature` → `finish` → open PR → new thread: `review-pr` (or `full-review` if heavy) → `fix-pr` until green.

2. **Bugfix**
   `fix-bug` → `finish` → PR → `review-pr` / `fix-pr` as needed.

3. **Spec-only PR**
   `review-spec` before merge; then `implement-feature` in a follow-up.

4. **Sprint planning**
   `triage-all-issues` → per-issue: `update-docs` or `fix-bug` based on triage outcome.

5. **PR review in isolation**
   `checkout-pr` → `review-pr` in the worktree session.

---

## Customization

Replace placeholder commands (e.g. `<lint-command>`) with your repo's real commands. Point "registry" and templates at your real paths in `manifest.yaml` and `docs/features/`.
