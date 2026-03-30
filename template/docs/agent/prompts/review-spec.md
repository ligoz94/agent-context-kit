# Review spec

Review a spec (or decision spec) for completeness, clarity, and implementability. Use when a PR adds or materially changes a specification document.

## Reading

1. **[values.md](../values.md)** — intent and spec quality
2. **Repo spec template** — e.g. [docs/features/specs/_template.md](../../features/specs/_template.md) (adjust path if your project differs)
3. **Parent feature doc** (e.g. `docs/features/<area>/feature.md`)
4. **Dependent specs** cited in the document

> **Toolshed MCP**: `get_spec`, `list_registry`, `lookup_glossary`.

## Process

1. Read the spec under review
2. Read parent feature doc and dependencies
3. Evaluate dimensions below
4. Verdict with actionable findings

## Dimensions

### 1. Template compliance

- [ ] Expected metadata (status, owner, feature link, dependencies)
- [ ] Required sections from the team template present and filled

### 2. Intent completeness

The spec should make derivable (explicitly or via sections):

| Area | Check |
|------|--------|
| Objective | Clear and bounded |
| Constraints | Technical and product |
| Non-goals | Explicit out-of-scope |
| Input/output | Understandable data contracts |
| Failure states | Errors, edges, degradation |
| Security | Auth, secrets, trust boundaries |
| Acceptance | Verifiable, measurable |

### 3. Implementability

Could an implementer (or agent) proceed without blocking questions?

- [ ] Tasks or equivalent tied to concrete files/modules or plausible new paths
- [ ] Contracts not vague (“handle properly” without criteria)
- [ ] Unknowns honest; they do not hide total blockers

### 4. Security and data

- [ ] Auth/authorization where needed
- [ ] No unjustified client-side secrets
- [ ] Data flows and trust boundaries for exposed surfaces

### 5. Scope and non-goals

- [ ] Bounded scope; breaking changes called out if any
- [ ] Rollout / feature flags if the team uses incremental release

### 6. Failure and edge cases

- [ ] Realistic errors (network, auth, bad input, dependency down)
- [ ] UX in error states not left undefined

### 7. Dependencies

- [ ] Dependencies on other specs or modules clear and achievable in current state

### 8. Testability

- [ ] Validation plan tied to acceptance criteria
- [ ] Prefer automation where it fits the change type

## Verdict

Table `dimension | pass/fail/partial | notes`, then a list of findings.

## Next step (agent instruction)

- Findings → “Address before implementation.”
- Approved → “Ready for **implement-feature** when the team signals OK (merge, label, etc.).”
