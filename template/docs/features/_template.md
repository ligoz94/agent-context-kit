# Feature: <feature-name>

**Status:** `needs-discovery` | `planned` | `partial` | `implemented`
**Domain:** <domain-name>
**Specs:** [001-<decision>.md](specs/001-<decision>.md), [002-<decision>.md](specs/002-<decision>.md)

## 1. Objective

<What user/business outcome this feature enables.>

## 2. Product Intent

<Why this feature exists and what user problem it solves.>

### User Flows

**Primary Flow:**

1. <Step-by-step primary flow>
2. <Step>
3. <Step>

**Secondary Flow (optional):**

1. <Step>
2. <Step>
3. <Step>

**Filter/Search Flow (optional):**

- <Applied filters and expected table/list updates>
- <Sort/pagination/search behavior>

### Visual Design Notes

- <Layout notes>
- <Interaction notes>
- <Feedback states>

## 3. Technical Intent

- <Main architecture choices>
- <Data flow and key dependencies>
- <State management / API strategy>
- <Default sort / grouping / mismatch rules if relevant>
- <URL state persistence / routing behaviors if relevant>

### <Optional Deep-Dive Strategy>

<Use this subsection for critical resolution logic or domain rules that need explicit rationale.>

## 4. Constraints

- <Business or technical constraints>

## 5. Non-Goals

- <Explicitly out of scope>

## 6. User-Facing Failure States

- <Error state>
- <Empty state>

## 7. Key Files

- `<path/to/main/file>` — <role>
- `<path/to/secondary/file>` — <role>

## 8. Verification

- <Manual verification path>
- <Automated tests to run>
- <API/Integration checks if applicable>
- <Storybook/UI checks if applicable>

## 9. Data Boundaries

- **Inputs:** <input contract>
- **Outputs:** <output contract>
- **Storage:** <local/db/cache boundaries>
- **External calls:** <apis/services>

## 10. Security Assumptions

- **Auth model:** <assumption>
- **Data sensitivity:** <classification>
- **Logging:** <auditing expectations>

## 11. Related Specs

- [specs/001-<decision>.md](specs/001-<decision>.md) — <what decision this captures>
- [specs/002-<decision>.md](specs/002-<decision>.md) — <what decision this captures>
- [../<related-feature>/specs/<related-spec>.md](../<related-feature>/specs/<related-spec>.md) — <cross-feature dependency, if any>
