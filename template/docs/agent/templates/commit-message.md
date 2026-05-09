# Commit Message Template

**PR descriptions** (full layout): copy from **[pr-body.md](pr-body.md)** — that file is Markdown, GitHub-ready.

**Git commits** are **plain text** (no `#` headings): use the **§ A** block below. The ` ```text ` fence is only so this doc renders in Markdown; when you paste into `git commit`, copy **inside** the fence, not the backticks.

---

## Copy / paste

### A. Git commit message (plain text) — **copy this structure**

Only the **first line (subject)** is required. If you include a body, keep **exactly one blank line** between subject and body.

```text
<type>(<scope>): <imperative summary ≤72 chars, prefer ≤50>

<Optional body line 1 — why / constraint / spec path, wrap ~72, no markdown headings>
<Optional body line 2>

<Optional footer — e.g. Closes #123 or BREAKING CHANGE: …>
```

**Structure checklist:**

| Part    | Rule                                                                     |
|---------|--------------------------------------------------------------------------|
| Line 1  | `type(optional-scope):` + imperative summary; no `#` headings            |
| Line 2  | **Blank** when a body follows                                            |
| Body    | Optional; ~72 char wraps; no Markdown headings                           |
| Footer  | Optional; `Closes #…` and/or `BREAKING CHANGE:`                         |

---

### A′. Examples (reference only)

**Non-breaking:**

```text
fix(auth): redirect to login when session expires

Token validation now happens before route resolution so unauthenticated
requests never reach protected handlers.

Closes #42
```

**Breaking change:**

```text
feat(api)!: require explicit pagination on list endpoints

Clients must pass page= and pageSize=; open-ended defaults removed.

BREAKING CHANGE: GET /items returns 400 when pageSize is omitted.
```

---

### B. GitHub / chat — short Markdown summary (optional)

Use when you need a compact snippet. For the full PR body use **[pr-body.md](pr-body.md)**.

```markdown
## Summary

- **What:**
- **Where:** (packages / routes / key files)
- **How it behaves now:**

## Spec traceability

- `<spec-path> §Section` → `path/to/file.ts:line-line`

## Risk

- **Breaking changes:** none | describe
```

---

## Rules (reference)

### Subject line (required)

| Rule         | Detail                                                                                              |
|--------------|-----------------------------------------------------------------------------------------------------|
| **Mood**     | Imperative, present tense: `fix login redirect`, not `fixed` / `fixes`                             |
| **Content**  | Name _what_ changed and _where_ (module, route, component)                                         |
| **Type**     | Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`        |
| **Scope**    | Optional, in parentheses: `fix(api): return 404 for missing resource`                              |
| **Breaking** | Append `!` after type/scope: `feat(api)!: rename filter query param`                               |
| **Length**   | Prefer **≤50 chars**; hard cap **~72** so `git log` doesn't wrap                                   |

**Avoid:** `update`, `fix bug`, `changes`, `wip`, trailing period, past tense.

### Body (optional)

- 2–6 short lines, wrap ~72: _why_ / constraints / spec path
- No `##` headings in git log text

### Footer (optional)

- `Closes #123` (one issue per line) — do not invent numbers
- `BREAKING CHANGE:` when needed and not fully covered by `!` in the subject
- Align **Risk** and **Agent Report** with what actually changed — do not copy a previous PR verbatim
