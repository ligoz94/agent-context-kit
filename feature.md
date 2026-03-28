<!-- Implementation status legend (inline, per item):
  ✅ implemented  🚧 partial/in-progress  📋 planned  ❌ dropped
  Link OpenSpec specs where relevant: **Flow Name** ([spec](../../../../../../openspec/specs/<name>/spec.md)): -->

# Feature: <Name>

**Status:** `planned` | `partial` | `implemented`
**Domain:** <domain>
**OpenSpec:** [`<spec-name>`](../../../../../../openspec/specs/<spec-name>/spec.md)
**Related:** (optional cross-feature links)

## 1. Objective

Clear business-level goal.

## 2. Product Intent

What user-visible behavior must exist?

### User Flows

**✅ Primary Flow** ([spec](../../../../../../openspec/specs/<spec-name>/spec.md)):

1. User action
2. System response
3. Result

**📋 Alternative Flows:**

- 📋 Edge case 1
- ✅ Edge case 2

### Visual Design Notes

- Key UI elements
- Interaction patterns

## 3. Technical Intent

### Key Hooks / Queries

- Data: `useQuery*` / `useMutation*` hooks used
- State: URL search params or other state management
- Services: key service functions or utilities

### Domain Rules

Inline domain constraints that affect this feature. Don't just reference domain docs — state the rules the agent needs when implementing:

- e.g., "All depths stored in meters (SI), converted on display"
- e.g., "Signal measurements are immutable — never update, only insert"

## 4. Constraints

- Performance:
- Backward compatibility:
- Dependencies:

## 5. Non-Goals

Explicit exclusions.

## 6. User-Facing Failure States

What does the user see when things go wrong?

## 7. Data Boundaries

**Inputs:** What data comes in (API endpoints, query params, user input)

**Outputs:** What data goes out (rendered UI, API responses)

**Storage:** Where state lives (database, localstorage, URL params)

**External calls:** API endpoints or services consumed

## 8. Security Assumptions

- **Auth model**: Who can access this feature?
- **Data sensitivity**: What data is confidential?
- **Logging**: What should/shouldn't be logged?

## 9. Key Files

Top entry points — agent reads these first:

- `src/pages/.../Connected*.tsx` — main connected component
- `src/queries/...` — data fetching
- `src/mutations/...` — data mutations
- `src/components/...` — key UI components

## 10. Verification

How an agent confirms this feature works:

- **Storybook**: `moon run frontend-fiber-optic-well-surveillance:storybook` → navigate to story
- **Dev server**: `moon run frontend-fiber-optic-well-surveillance:dev` → navigate to route
- **Tests**: `bun test <path>` or `moon run frontend-fiber-optic-well-surveillance:test`
- **Playwright**: `/ui-test` with specific acceptance criteria to check

## 11. Related Specifications

- [`<spec-name>`](../../../../../../openspec/specs/<spec-name>/spec.md) — OpenSpec master spec
- Use `openspec show <spec-name>` to view spec details
