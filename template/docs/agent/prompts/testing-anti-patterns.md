# Testing Anti-Patterns (Lazy QA Training)

Use BEFORE writing tests or reviewing test coverage. Helps catch shallow testing that gives false confidence.

## The Golden Rule

> **If you didn't watch the test fail, you don't know if it tests the right thing.**

A test that passes immediately after writing the code proves nothing. It might test the wrong behavior entirely. Always watch RED before GREEN.

## Anti-Pattern 1: Happy-Path-Only Testing

Writing tests for the success case but none for failure modes.

**Warning signs:**
- Tests only cover "valid input → expected output"
- No test for: null, empty, expired, malformed, unauthorized, rate-limited, service-down
- Error handlers have no test coverage

**Fix:** For every function, write tests for:
- Success path
- Each error/failure mode
- Edge cases (boundaries, empty states, duplicates)

## Anti-Pattern 2: Implementation-Coupled Tests

Tests that break when the internals change but the behavior stays the same.

**Warning signs:**
- Tests mock internal methods instead of external boundaries
- Tests assert on private function calls or internal state
- Refactoring breaks tests even though the output is correct

**Fix:** Test behavior, not implementation. Assert on return values and side effects, not internal calls.

## Anti-Pattern 3: The Green-Faith Test

A test that "passes" but never actually ran against real production-like conditions.

**Warning signs:**
- Mocked database that doesn't reflect real query behavior
- Mocked HTTP client that never tests connection errors or timeouts
- In-memory implementations that differ from real storage behavior

**Fix:** Use real or containerized dependencies for integration tests. Mocks should only be used for external services you don't control.

## Anti-Pattern 4: Assertion-Free Test

A test that runs but doesn't actually verify anything meaningful.

**Warning signs:**
- No assert/expect calls
- Assertions that always pass (e.g., `expect(true).toBe(true)`)
- Console-log-based "verification" instead of programmatic assertions
- Tests that catch exceptions and pass silently

**Fix:** Every test must have at least one meaningful assertion. Use `.toHaveLength(3)` not `.toBeDefined()`.

## Anti-Pattern 5: Flaky Test Tolerance

Tests that sometimes fail and are accepted as "just flaky."

**Warning signs:**
- Known flaky tests that are re-run instead of debugged
- Time-based tests that depend on real-time timing
- Tests that depend on test execution order
- Race conditions in async tests

**Fix:** A flaky test is a bug. Debug it or delete it. Flaky tests destroy trust in the entire suite.

## Anti-Pattern 6: Coverage Theater

Celebrating high coverage percentages while critical paths remain untested.

**Warning signs:**
- Coverage > 80% but core business logic has no meaningful tests
- Generated code or boilerplate inflates coverage numbers
- Error paths, edge cases, and boundary conditions are the untested 20%

**Fix:** Coverage is a floor, not a ceiling. Review what's NOT covered, not just the percentage.

## Anti-Pattern 7: The Retroactive Test

Writing tests after the code is already working, without ever seeing the test fail.

**Warning signs:**
- All tests in a suite were written in the same commit as the implementation
- Developer says "all tests pass" on first run
- No evidence of RED phase in git history

**Fix:** TDD requires RED → GREEN → REFACTOR. If there's no RED commit, the process was skipped.
