# TDD — Iron Law

> **Adapt to your project**: Check `app-config.md` for the test framework and test command. Use the project's actual test runner (e.g. `vitest`, `moon`, `pytest`, `cargo test`), not a hardcoded one.

<HARD-GATE>
Write implementation code before test?
Delete it. Start over.

No exceptions:
- Don't keep as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
</HARD-GATE>

## Process

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green

## Rationalization Guard

| If you think... | Reality |
|---|---|
| "This is just a config change" | Config changes have side effects. Test them. |
| "This is too simple for TDD" | Simple things hide unexamined assumptions. Use TDD. |
| "I'll add tests after" | No you won't. Write the test first. |
| "The test would be trivial" | Trivial tests catch non-trivial regressions. |

## Enforcement

Use `verify_action` with `tdd_compliance` check type:
```
verify_action(
  description: "Verify TDD compliance for recent commits",
  checks: [{ type: "tdd_compliance" }]
)
```
