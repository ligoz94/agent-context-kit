# Forensic Debugging

Use when investigating a bug. Follow the 4-phase process.

## Phase 1: Observe

Get FRESH reproduction. Terminal output, not memory.

- What exactly happens?
- Where (component, module, file)?
- Under what conditions (OS, browser, data, time of day)?
- What changed recently? (`git log --oneline -10`, environment, dependencies)
- Is it reproducible? How consistently?

## Phase 2: Hypothesize

Generate 3 hypotheses ranked by probability.

For each hypothesis:
- What would PROVE it?
- What would DISPROVE it?
- What's the simplest experiment to test it?

## Phase 3: Isolate

One variable at a time. Document results.

- Change ONE thing
- Run
- Record outcome

## Phase 4: Fix & Fortify

Fix the ROOT CAUSE, not the symptom.

Then ask:
- What other system could fail the same way?
- Add a defense for each identified risk
- Write a regression test that would catch this

## Usage

```
start_debugging("User cannot log in after password reset")
```

## Anti-patterns

- **Skipping Phase 1**: "I know what the bug is" without fresh reproduction
- **Changing multiple variables**: "I fixed it!" but don't know which change helped
- **Fixing symptoms**: Patching the error message instead of the root cause
- **No regression test**: "It's just a one-off bug" — until it happens again
