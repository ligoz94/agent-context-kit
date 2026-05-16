# Review agent-context-kit sync

Use when the agent-context-kit packages have been updated and you want to check what changed and whether the project should adopt new features.

## Flow

### 1. Run sync

```bash
npx @agent-context-kit/cli sync
```

Check the output:
- "X file(s) created" → new template docs are available
- "X file(s) updated" → engine regions changed in existing docs
- "manifest.yaml updated" → new sections were added (gates, session, orchestration, profiles)

### 2. Check manifest.yaml for new features

Read `manifest.yaml` and look for commented-out sections that were added by sync:

| Section | What it does | Ask |
|---|---|---|
| `gates:` | Hard process gates that block agent progress until evidence is provided | "Should we enable gates? Which ones?" |
| `session.bootstrap:` | Auto-load context at session start | "Should we enable session bootstrap?" |
| `orchestration:` | Configure sub-agent dispatch (model, task splitting) | "Should we configure orchestration?" |
| `profiles:` | Partial manifest overrides for specific agent roles | "Should we define profiles?" |

For each section, report:
- What it enables
- Whether it's commented out or active
- Recommendation based on project practices

### 3. Review new doc files

Files created by sync:

| File | Type | Needs customization? |
|---|---|---|
| `docs/agent/standard-tdd.md` | Hard rule (TDD iron law) | Enable in manifest: add to `rules.standards` |
| `docs/agent/forensic-debugging.md` | Workflow reference | No; generic process doc |
| `docs/agent/code-review-reception.md` | Soft skill guide | No; generic behavioral guide |
| `docs/agent/release-workflow.md` | Workflow reference | Check: does the example command match the project's actual test command? If not, the doc says to check `app-config.md`. |
| `docs/agent/rationalization-tables.md` | Meta-cognition reference | No; generic red flag tables |

### 4. Check `standard-tdd.md` activation

If the project wants TDD enforcement:
1. Uncomment `profiles.tdd:` in `manifest.yaml`
2. Or add `standard-tdd.md` to `rules.standards`
3. Run `verify_action({ checks: [{type: "tdd_compliance"}] })` to check test-first ordering in recent commits

### 5. Report

Present a structured decision report:

```markdown
## Sync Review

### New files created
- standard-tdd.md → [recommend activation? y/n]
- forensic-debugging.md → reference only
- code-review-reception.md → reference only
- release-workflow.md → reference only
- rationalization-tables.md → reference only

### Manifest sections added (commented out)
- gates: [recommend enabling? which ones?]
- session.bootstrap: [recommend enabling?]
- orchestration: [recommend configuring?]
- profiles: [recommend defining?]

### Engine updates
- context-policy.md: added 1% Rule + Red Flags table

### Context-policy engine updates
The sync updated `context-policy.md` with:
- 1% Rule: spend ~1% tokens on meta-cognition
- Red Flags table: 8 common failure modes with actions

### Actions needed
1. [ ] Review new sections in manifest.yaml
2. [ ] Decide which gates to enable
3. [ ] Configure session bootstrap if desired
4. [ ] Update app-config.md with project-specific commands
```

### 6. If gates are enabled

Update `get_guardrails` usage in `CLAUDE.md` to mention active gates.

For each enabled gate, the agent must:
- `check_gate("gate_name")` before proceeding past that stage
- `advance_gate("gate_name", "evidence")` when evidence is available
- Halt if gate check fails and ask the user for evidence
