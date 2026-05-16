# Rationalization Guard Tables

AI agents (like humans) rationalize to skip processes they don't want to follow.
When you catch yourself thinking any of these, STOP and follow the process anyway.

## Universal Red Flags

| If you think... | Reality |
|---|---|
| "This is just a simple *" | Simple things hide unexamined assumptions. Use the process. |
| "Let me explore the codebase first" | Tools tell you HOW to explore. Check tools first. |
| "This doesn't need a formal process" | If a tool/process exists, use it. |
| "I know what the project does" | Context evolves. Load current version. |
| "This feels productive" | Undisciplined action wastes time. Follow the process. |
| "I'll add tests/docs later" | No you won't. Do it now. |
| "The skill/process is overkill here" | Simple things become complex. Use it. |
| "I remember what this says" | You don't. Read the current version. |

## Phase-Specific Red Flags

### Design / Brainstorming
| Rationalization | Reality |
|---|---|
| "I already understand the problem" | You understand YOUR version. Ask the user. |
| "This is too simple for a design doc" | Simple projects hide the most assumptions. |
| "Let me just write a quick prototype" | Prototypes become production. Design first. |
| "I can ask questions while I code" | Questions inform direction. Ask BEFORE coding. |

### Planning
| Rationalization | Reality |
|---|---|
| "I know what needs to be done" | Write it down. The act of writing reveals gaps. |
| "The spec covers everything" | Plan against spec. Verify each requirement has a task. |
| "I don't need to estimate" | 2-5 minutes per task. If tasks are larger, split them. |

### Implementation
| Rationalization | Reality |
|---|---|
| "This is just a config change" | Config changes have side effects. Test them. |
| "I'll refactor later" | No you won't. Do it now. |
| "It compiles, so it's correct" | Compilation ≠ correctness. Test your change. |
| "The tests are overkill here" | Tests are never overkill. Write them. |

### Debugging
| Rationalization | Reality |
|---|---|
| "I know what the bug is" | Get fresh reproduction. Trust data, not memory. |
| "Let me change multiple things" | One variable at a time. Or you learn nothing. |
| "This is probably a one-off" | Unless you find the root cause, it will happen again. |

### Before Merge
| Rationalization | Reality |
|---|---|
| "Tests pass on my branch" | Test AFTER merge too. Integration issues are real. |
| "I don't need a PR review" | Yes you do. Everyone misses things. |
| "The changes are too small for a test plan" | Small changes have big impacts. Document verification steps. |

## Using This

When you recognize a rationalization, explicitly counter it:

```
I'm thinking "this is just a simple change" — 
but that's a red flag. Let me use the full process anyway.
```
