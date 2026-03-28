<!-- Implementation status legend (inline, per item):
  ✅ implemented  🚧 partial/in-progress  📋 planned  ❌ dropped
  Link related OpenSpec specs where relevant: **Flow Name** ([spec](../../../../../../openspec/specs/<name>/spec.md)): -->

# Decision Spec: <feature-area> — <decision-title>

**Status:** `needs-discovery` | `planned` | `partial` | `implemented`
**Domain:** <domain-name>
**Owner:** <team or role>
**Related feature:** [../feature.md](../feature.md)
**OpenSpec:** (optional) [`<spec-name>`](../../../../../../openspec/specs/<spec-name>/spec.md)
**Change request:** <PR/Issue URL or internal ticket, optional>

## 1. Objective

What this decision must achieve at business/product level.

## 2. Product Intent

What user-visible behavior this decision enables or modifies.

### User Flows Impacted

**✅ Primary flow** (optional spec link):

1. User action
2. System response
3. Resulting behavior

**📋 Alternative/edge flows:**

- 📋 Edge case 1
- ✅ Edge case 2

### Visual/UI Notes (if relevant)

- Surfaces/components touched
- Interaction pattern changes
- Loading/empty/error state expectations

## 3. Technical Intent

### Decision Summary

The chosen approach and why it is preferred over alternatives.

### Alternatives Considered

- **Option A:** <short rationale and trade-off>
- **Option B:** <short rationale and trade-off>
- **Chosen:** <why this option wins for current constraints>

### Key Hooks / Services / APIs

- Data: `useQuery*` / `useMutation*` hooks or equivalent fetch/mutation layer
- State: URL/search params, local state, cache keys, or store contracts
- Services: key service functions/utilities touched

### Domain Rules

Inline constraints that are critical for implementation:

- e.g., "Measurements stored in SI units; convert only for display"
- e.g., "Historical records are append-only; no in-place updates"

## 4. Unknowns

- <Unknown #1, or write "No unknowns">
- <Unknown #2>

## 5. Implementation Tasks

**`path/to/file.ts`:**

- [ ] `<symbol or change>` — <what to implement>
- [ ] `<symbol or change>` — <what to implement>

**`path/to/another-file.tsx`:**

- [ ] `<UI/state/update>` — <what to implement>

## 6. Constraints

- Performance:
- Backward compatibility:
- Dependencies:

## 7. Non-Goals

Explicit exclusions for this decision.

## 8. User-Facing Failure States

What the user sees when this decision path fails:

- Error state:
- Empty state:
- Partial-data/degraded mode:

## 9. Data Boundaries

**Inputs:** API contracts, query params, user input, feature flags

**Outputs:** rendered UI, emitted events, mutation side-effects

**Storage:** DB/cache/localstorage/URL state touched

**External calls:** services, APIs, third-party integrations

## 10. Security Assumptions

- **Auth model:** Who can access this path?
- **Data sensitivity:** Any confidential/regulated data?
- **Logging:** What should/should not be logged?

## 11. Validation Plan

- [ ] Unit tests for `<module/function>`:
  - `<input condition>` -> `<expected output>`
  - `<edge case>` -> `<expected output>`
- [ ] Integration/API checks:
  - `<endpoint or flow>` -> `<expected behavior>`
- [ ] UI verification:
  - `<screen/path>` -> `<expected behavior>`
- [ ] Edge cases explicitly validated:
  - `<edge case scenario>` -> `<expected behavior>`

## 12. Risks

- Primary risk and fallback behavior
- Regression risk to monitor

## 13. Acceptance Criteria

- [ ] User-visible condition 1
- [ ] User-visible condition 2
- [ ] Behavioral/system condition 3
- [ ] Edge behavior condition 4

## 14. Related Specifications

- [../feature.md](../feature.md) — feature-level intent and scope
- [`<spec-name>`](../../../../../../openspec/specs/<spec-name>/spec.md) — OpenSpec source of truth (if used)
