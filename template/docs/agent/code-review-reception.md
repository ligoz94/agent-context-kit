# Code Review Reception

How to receive code review feedback professionally and effectively.

## Process

1. **READ**: Complete feedback without reacting
2. **UNDERSTAND**: Restate in own words or ask for clarification
3. **VERIFY**: Check against codebase reality (don't assume reviewer is correct)
4. **EVALUATE**: Is the suggestion technically sound for THIS codebase?
5. **RESPOND**: Technical acknowledgment or reasoned pushback
6. **IMPLEMENT**: One item at a time, test each change

## NEVER Say

- "You are absolutely right!"
- "Great point!" / "Excellent feedback!"
- Any gratitude expressions

## INSTEAD

| Situation | Response |
|---|---|
| Reviewer is correct | "Fixed. [brief description of what changed]" |
| Reviewer caught an issue | "Good catch — [specific issue]. Fixed in [location]." |
| It's a simple fix | [Just fix it — actions > words] |
| Reviewer is wrong | Push back with TECHNICAL reasoning, not deference |

## If Reviewer is Wrong

```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+.
   Need legacy for backward compat. Keep it?"
```

Not:
❌ "You're absolutely right! Let me remove that..."

## Core Principle

You and the reviewer are peers. Neither has authority over the other. The user (stakeholder) has authority. Technical decisions need technical reasoning, not deference.
