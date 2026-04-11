# Full System Review Prompt

Use this prompt for comprehensive reviews of features, modules, or the entire system.

## Required Reading (in order)

1. **[Intent Engineering Standard](../values.md)** — review principles & standards (MUST READ FIRST)
2. **Design docs** — all relevant feature designs (find via app's feature register)
3. **Specs** — all related implementation specs
4. **Domain knowledge** — business rules and constraints (path in app-config.md § Paths)
5. **Code standards** — project standards docs

> **MCP Toolshed**: If available (check app-config.md § MCP Toolshed), use `get_spec` / `get_feature_doc` / `lookup_glossary` instead of manually opening files.

## Pre-Review Checklist

Before starting review:

- [ ] I have read [values.md](../values.md) completely
- [ ] I understand the review dimensions and severity levels
- [ ] I know what constitutes a valid finding
- [ ] I understand the output format requirements
- [ ] I have access to all relevant design docs and specs

## Review Dimensions

Work through each dimension systematically. For each finding, output:

```text
[SEVERITY] DIMENSION > File/Module > Short title
Detail: What is wrong and why it matters to a real user
Fix: Concrete, actionable suggestion
Spec Impact: [Design doc/Spec that needs updating, if any]
```

### Severity Levels

- **[CRITICAL]** — Security vulnerability, data loss risk, system crash
- **[HIGH]** — Core functionality broken, major user impact
- **[MEDIUM]** — Feature degradation, UX issues, performance problems
- **[LOW]** — Code quality, maintainability, minor inconsistencies
- **[INFO]** — Suggestions, optimizations, nice-to-haves

### Shared dimensions (1-6)

Read and run all checklists in [\_review-dimensions.md](_review-dimensions.md):

1. **Intent Alignment** — spec → code mapping
2. **Security Boundaries** — no secrets, no unauthorized access
3. **Code Standards** — types, conventions, architecture patterns
4. **Tests** — coverage and quality
5. **Spec Freshness** — traceability comments, acceptance criteria match
6. **Layer Boundaries** — architecture boundaries respected

### Deep-review dimensions (7-12)

#### Data Integrity

**Focus**: Can data become corrupted or lost?

Check for:

- [ ] Proper error handling on mutations
- [ ] Optimistic updates with rollback
- [ ] Race condition protection
- [ ] Data validation before persistence
- [ ] Null/undefined handling
- [ ] Type safety (no type coercion)

**Common Issues:**

- No error boundaries
- Mutations without rollback
- Missing validation
- Type coercion

#### User Experience

**Focus**: Does it work as users expect?

From design docs — check:

- [ ] User flows match design
- [ ] Error messages are helpful
- [ ] Loading states present
- [ ] Empty states handled
- [ ] Success feedback provided
- [ ] Responsive behavior works

**Common Issues:**

- No loading indicators
- Generic error messages
- Poor empty states
- Missing feedback

#### Performance

**Focus**: Is it fast enough?

Check for:

- [ ] Unnecessary re-renders
- [ ] Missing memoization where appropriate
- [ ] Large bundle sizes
- [ ] Unoptimized queries
- [ ] Missing pagination for large datasets
- [ ] Memory leaks

**Common Issues:**

- Inline function definitions
- Fetching too much data
- No virtualization for large lists

#### Domain Correctness

**Focus**: Does code respect domain rules?

From app's domain docs:

Check for:

- [ ] Entity relationships correct
- [ ] Business constraints enforced
- [ ] Units handled properly
- [ ] Domain terminology consistent
- [ ] Cross-source data rules followed

#### Accessibility

**Focus**: Can all users access features?

Check for:

- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] ARIA attributes correct

#### Documentation

**Focus**: Are specs/designs up to date?

From [Design Docs Are the Source of Truth](../values.md#design-docs-are-the-source-of-truth):

Check for:

- [ ] Specs match implementation
- [ ] Design docs reflect current features
- [ ] Domain docs are accurate
- [ ] No undocumented features
- [ ] Acceptance criteria current

## Output Format

### For Each Finding

```markdown
[SEVERITY] DIMENSION > File/Location > Short Title
Detail: What is wrong and why it matters to real users
Fix: Concrete, actionable suggestion with code examples if helpful
Spec Impact: Which design doc or spec needs updating (if any)
```

### Grouping Findings

Group by dimension, then by severity:

```markdown
## Intent Alignment

### [CRITICAL]

(findings)

### [HIGH]

(findings)

## Security Boundaries

### [CRITICAL]

(findings)

...
```

## After Review: Updates Required

### 1. Design Doc Updates

For findings with design doc impact, follow [Spec Update Workflow](../values.md#spec-update-workflow):

1. Open PR for design doc updates
2. Include rationale and impact analysis
3. Link to review findings
4. Get approval before implementation changes

### 2. Spec Updates

For findings with spec impact, add as new tasks to relevant specs:

```markdown
## Additional Tasks (from review)

- [ ] Fix date range validation per security review
- [ ] Add error state handling per UX review
```

### 3. Code Fixes

Group fixes by priority:

**Phase 1 (CRITICAL/HIGH):**
- Security vulnerabilities
- Data integrity issues
- Core functionality bugs

**Phase 2 (MEDIUM):**
- UX improvements
- Performance optimizations
- Test coverage gaps

**Phase 3 (LOW):**
- Code standards violations
- Documentation updates
- Minor refactors

## Anti-Patterns to Avoid

From [Anti-Patterns](../values.md#anti-patterns):

- **False positives** — don't flag working code as broken without evidence
- **Nitpicking** — focus on user impact, not personal style preferences
- **Scope creep** — review what exists, don't redesign the system
- **Ignoring specs** — judge against spec, not your intuition
- **Vague feedback** — "Could be better" isn't actionable

## Review Checklist

Before considering review complete:

- [ ] All 12 dimensions covered (6 shared + 6 deep-review: Data Integrity, User Experience, Performance, Domain Correctness, Accessibility, Documentation)
- [ ] Findings have clear severity levels
- [ ] Each finding explains user impact
- [ ] Fixes are concrete and actionable
- [ ] Spec impacts identified
- [ ] Findings grouped by dimension and severity
- [ ] No false positives or nitpicks
- [ ] Critical issues flagged clearly

## Remember

> **Correctness > Completion** ([values.md](../values.md#correctness--completion))
>
> False negatives (missed issues) are preferable to false positives (wrong issues).

Take time to understand the system before flagging issues. A rushed review creates noise, not value.

---

## Quick Start Template

Copy this to start your review:

```markdown
# System Review: [Feature/Module Name]

**Scope**: [What are you reviewing?]
**Specs Reviewed**: [List relevant specs]
**Designs Reviewed**: [List relevant design docs]

## Review Summary

- Total findings: [X]
- Critical: [X]
- High: [X]
- Medium: [X]
- Low: [X]

## Findings by Dimension

[Use template above for each finding]

## Recommended Actions

### Phase 1 (Immediate)

[Critical/High priority fixes]

### Phase 2 (Next Sprint)

[Medium priority improvements]

### Phase 3 (Backlog)

[Low priority polish]

## Spec/Design Updates Needed

[List all docs that need updating with specific sections]
```
