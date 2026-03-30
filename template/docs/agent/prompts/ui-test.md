# UI test

Verify UI behavior after changes to interface, forms, navigation, or data display.

## When to use

- After implementing or fixing UI-facing behavior
- When API tests pass but you need end-to-end browser confirmation
- When asked to verify visually or with guided manual checks

**Avoid** for: backend-only unit tests, API-only changes without UI, or when the local app cannot run.

## Reading

1. **[values.md](../values.md)**
2. **Spec** for the area (acceptance and UI states)
3. This prompt

## Prerequisites

- [ ] Dev server or preview URL (per README)
- [ ] Browser automation tools available **if** using browser MCP (exact tool names depend on the client)
- [ ] Test data / seeds if required
- [ ] A test plan derived from the spec

## Process

### 1. Test plan

Before clicking, table action → expected:

```markdown
| # | Action | Expected |
|---|--------|----------|
| 1 | … | … |
```

### 2. Navigation and waits

Open URL, wait for load (network/async). Take a fresh snapshot after meaningful DOM changes.

### 3. Snapshot / accessibility tree

If the tool exposes an accessibility tree with element refs, snapshot before each interaction (refs change after navigation or large re-renders).

### 4. Interaction

Click, type, select per plan; between complex steps, new snapshot if the DOM changes.

### 5. Verification

Visible text, counts, empty/error states, URL query params if state is serialized there.

### 6. Screenshots (optional)

Capture at key steps for PR or issue evidence.

### 7. Report

Table: case | expected | actual | PASS/FAIL.

## Tool reference (generic)

Exact names depend on the configured browser MCP. Typical families: navigate, wait, snapshot, click, type, select_option, screenshot, fill_form.

## Anti-patterns

- Reusing stale element refs after navigation
- Skipping waits on async loads
- Verifying without a plan (post-hoc)
- Ignoring URL state when the feature uses it for filters or navigation

## Remember

A green API test does not guarantee the client sends or displays data correctly. UI integrates contracts and state.
