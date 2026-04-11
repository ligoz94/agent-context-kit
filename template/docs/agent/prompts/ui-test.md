# UI Test Prompt

Use this prompt to verify UI behavior via browser automation after implementing or fixing UI-facing features.

## When to Use

- After implementing filters, forms, navigation, or data display changes
- After fixing UI bugs — verify the fix visually
- When API integration tests pass but you want end-to-end UI confirmation
- When the user asks to "verify in the browser" or "test the UI"

**Don't use for**: unit tests, API-only changes, or when dev server isn't running.

## Required Reading (in order)

1. **[Intent Engineering Standard](../values.md)** — agent principles (MUST READ FIRST)
2. **Related feature spec** for the area being tested (find via app's feature register)
3. **This prompt** — workflow and tool reference

## Prerequisites Checklist

Before starting, verify:

- [ ] Dev server is running (start per app-config.md)
- [ ] Browser automation MCP is available (e.g. Playwright MCP tools are loaded)
- [ ] Test data is seeded (local dev environment has expected data)
- [ ] I know what behavior to verify (from spec or implementation)

## Process

### Step 1: Define Test Plan

Create a table before testing:

```markdown
| Test     | Action                                    | Expected            |
| -------- | ----------------------------------------- | ------------------- |
| Baseline | Navigate to page, no filters              | Shows all N results |
| Filter A | Apply filter X with value Y               | Shows M results     |
| Filter B | Apply same filter with out-of-range value | Shows 0 results     |
```

### Step 2: Navigate and Wait

```
browser_navigate → target URL
browser_wait_for → time: 3 (let page render)
```

Pages need time to load data. Always wait after navigation.

### Step 3: Take Snapshot

```
browser_snapshot
```

This returns the page's accessibility tree with `ref` attributes for every interactive element. You need these refs to interact with elements.

**Key**: Element refs change after every navigation or major page update. Always re-snapshot before interacting.

### Step 4: Interact

Use refs from the snapshot to interact:

```
browser_click → ref from snapshot (buttons, tabs, rows)
browser_type → ref + text (fill input fields)
browser_select_option → ref + value (dropdowns)
```

For multi-step interactions, snapshot between steps if the DOM changes.

### Step 5: Verify

After interaction, check the snapshot or page content for:

- Row counts ("Showing X of Y")
- "No data" messages
- Specific cell values in data grids
- Active filter badges with counts
- URL query parameters (filter state is serialized in URL)

### Step 6: Screenshot

```
browser_take_screenshot → filename: descriptive-name.png
```

Take screenshots at key verification points for evidence.

### Step 7: Report Results

```markdown
| Test              | Expected  | Actual  | Result |
| ----------------- | --------- | ------- | ------ |
| Baseline          | 3 results | 3 of 3  | PASS   |
| Filter applied    | 2 results | 2 of 2  | PASS   |
| Out of range      | 0 results | No data | PASS   |
```

## MCP Tools Reference

| Tool                      | Purpose                    | When                                     |
| ------------------------- | -------------------------- | ---------------------------------------- |
| `browser_navigate`        | Go to URL                  | Start of test, page changes              |
| `browser_wait_for`        | Wait for text or time      | After navigation, before interaction     |
| `browser_snapshot`        | Get element tree with refs | Before any click/type, after DOM changes |
| `browser_click`           | Click element by ref       | Buttons, tabs, rows, filter chips        |
| `browser_type`            | Fill text input by ref     | Search boxes, filter value inputs        |
| `browser_select_option`   | Select dropdown option     | Operator dropdowns, comboboxes           |
| `browser_take_screenshot` | Capture viewport           | Evidence at verification points          |
| `browser_fill_form`       | Fill multiple fields       | Complex forms with several inputs        |

## Anti-Patterns

- **Don't reuse stale refs** — element refs change after navigation or DOM updates; always re-snapshot
- **Don't skip waiting** — pages load data asynchronously; wait after navigation
- **Don't test without a plan** — define expected results before interacting, not after
- **Don't ignore URL state** — filter/form state is often serialized in query params; check the URL to understand what the frontend sends

## Remember

> **Correctness > Completion** ([values.md](../values.md#correctness--completion))
>
> UI verification catches integration issues that unit tests miss. A passing API test doesn't guarantee the frontend sends the right format.
