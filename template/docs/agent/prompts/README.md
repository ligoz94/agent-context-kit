# Agent prompts

Reusable workflow templates under `docs/agent/prompts/`. Load them with your IDE slash commands, or via Toolshed MCP: **`list_prompts`** and **`get_prompt`** (use the filename without `.md`, e.g. `get_prompt` with name `implement-feature`).

Files whose names start with **`_`** are **fragments** (included by other prompts). They do not appear in `list_prompts`; open them by path or call `get_prompt` with name `_review-dimensions`.

---

## When to use which prompt

| Prompt | Use it when… |
|--------|----------------|
| **[development-workflow.md](development-workflow.md)** | You want the **end-to-end picture**: doc → implement → verify → PR → review → merge, human gates, and failure handling. Good for onboarding or “what do I run next?”. |
| **[update-docs.md](update-docs.md)** | An **issue, ticket, or verbal ask** must become **explicit docs + spec** before coding. Spec missing, vague, or out of date. **Always before** large `implement-feature` work. |
| **[implement-feature.md](implement-feature.md)** | A **spec (or equivalent) is clear and approved** per team rules; you are **writing code** to match it. If you discover spec gaps, stop and return to **update-docs**. |
| **[finish.md](finish.md)** | Implementation or **fix-bug** is done, **tests pass**, and you want a **pre-push gate**: self-review, local CI-style commands, doc touch-ups, optional learnings. **Skip** if you just finished **fix-pr** (that flow already drives CI/push). |
| **[fix-bug.md](fix-bug.md)** | Fixing **incorrect behavior** in existing functionality. Use to **classify** code vs spec vs product bug, add **regression tests**, then chain to **finish**. |
| **[fix-pr.md](fix-pr.md)** | A **PR is open** and you need to **triage review comments + failing checks**, fix, commit, push, and **wait for green CI**. |
| **[review-pr.md](review-pr.md)** | **Reviewing a pull request** (prefer a **fresh chat**). Checks shared dimensions + PR completeness, risk, assumptions. |
| **[full-review.md](full-review.md)** | **Deep / adversarial review** of a feature or module (non-trivial or high-risk). Walks **12 dimensions**; use after big changes or before sensitive release. |
| **[review-spec.md](review-spec.md)** | A PR **adds or heavily changes a spec**. Validates template, intent completeness, security, implementability, and tests **before** implementation proceeds. |
| **[ui-test.md](ui-test.md)** | You changed **UI** and need **browser-level verification** (automation or structured manual steps). Not for API-only changes. |
| **[_review-dimensions.md](_review-dimensions.md)** | **Do not run standalone.** Shared checklist used by **review-pr** and **full-review**; edit here to avoid duplicating review criteria. |

---

## Typical sequences

1. **New feature**  
   `update-docs` → (human approves spec) → `implement-feature` → `finish` → open PR → new thread: `review-pr` (or `full-review` if heavy) → `fix-pr` until green.

2. **Bugfix**  
   `fix-bug` → `finish` → PR → `review-pr` / `fix-pr` as needed.

3. **Spec-only PR**  
   `review-spec` before merge; then `implement-feature` in a follow-up.

---

## Customization

Replace placeholder commands (e.g. `npm run …`) with your repo’s README/CI commands. Point “registry” and templates at your real paths in `manifest.yaml` and `docs/features/`.
